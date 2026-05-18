import { NextRequest, NextResponse } from 'next/server';
import { pool, queryMany } from '@/lib/db';
import {
  BookingInput,
  cleanupStaleBookings,
  computeCodeExpiry,
  findSuite,
  nightsBetween,
  validateBooking,
} from '@/lib/bookings';
import { isRazorpayConfigured, rzp, RZP_KEY_ID } from '@/lib/razorpay';
import { guardDbConfigured, jsonError } from '@/lib/apiError';
import { generateBookingCode } from '@/lib/bookingCode';
import { sendBookingConfirmationSmsOnce } from '@/lib/twilio';
import { BOOKING_FEE_INR } from '@/lib/venueConfig';
import { getBookingConfig } from '@/lib/bookingConfigDb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/bookings?limit=100&status=pending
export async function GET(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  // Sweep abandoned/cancelled rows older than 5 min before listing — keeps
  // the slot-unique index from holding tables hostage indefinitely.
  await cleanupStaleBookings(5);

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 200), 500);
    const status = searchParams.get('status');

    const where: string[] = [];
    const params: any[] = [];
    if (status) { params.push(status); where.push(`status = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit);

    const rows = await queryMany(
      `SELECT * FROM bookings ${whereSql} ORDER BY created_at DESC LIMIT $${params.length}`,
      params,
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    return jsonError(e);
  }
}

// POST /api/bookings
// - bar/restaurant/rooftop: insert with payment_status='not_required', status='pending'
// - suite: create Razorpay order + insert with payment_status='pending'; frontend opens checkout.
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const mark = (label: string) => console.log(`[bookings POST] +${Date.now() - t0}ms ${label}`);

  mark('start');
  const dbGuard = guardDbConfigured();
  if (dbGuard) { mark('blocked: DATABASE_URL not set'); return dbGuard; }

  let body: BookingInput;
  try {
    body = await req.json();
  } catch {
    mark('bad json');
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
  mark(`body parsed venue=${body?.venue} name=${body?.customer_name}`);
  console.log('[bookings POST] body:', JSON.stringify(body));

  // Per-venue config from booking_config — drives fee, time validation,
  // grace, and the enabled gate. Fall back to static defaults if the row is
  // missing so a fresh DB without the migration still functions.
  const cfg = await getBookingConfig(body.venue).catch(() => null);
  mark(`cfg loaded enabled=${cfg?.enabled ?? 'fallback'}`);

  if (cfg && !cfg.enabled) {
    mark('venue disabled by booking_config');
    return NextResponse.json(
      { success: false, error: cfg.disabled_reason || 'Bookings are not open for this venue.' },
      { status: 403 },
    );
  }

  const err = validateBooking(body, cfg);
  if (err) { mark(`validation failed: ${err}`); return NextResponse.json({ success: false, error: err }, { status: 400 }); }
  mark('validated');

  // Sweep abandoned holds before checking the unique-slot index — otherwise a
  // 5-min-old "pending unpaid" row would falsely block this booking.
  const swept = await cleanupStaleBookings(5);
  if (swept > 0) mark(`cleaned up ${swept} stale bookings`);

  try {
    const isSuite = body.venue === 'suite';
    let amount = 0;
    let nights = 0;
    let rzpOrderId: string | null = null;
    let resolvedSuiteName: string | null = null;

    if (isSuite) {
      nights = nightsBetween(body.check_in!, body.check_out!);
      mark(`suite path nights=${nights}`);

      const suite = await findSuite({ suite_id: body.suite_id, suite_name: body.suite_name });
      mark(`findSuite -> ${suite ? `${suite.name} (₹${suite.price_per_night}/night)` : 'NOT FOUND'}`);
      if (!suite) {
        return NextResponse.json(
          { success: false, error: 'Suite not found or unavailable' },
          { status: 400 },
        );
      }
      const perNight = Number(suite.price_per_night) || 0;
      amount = perNight * nights;
      resolvedSuiteName = suite.name;

      if (amount <= 0) {
        mark(`amount<=0 perNight=${perNight} nights=${nights}`);
        return NextResponse.json(
          { success: false, error: 'Could not determine suite price' },
          { status: 400 },
        );
      }
    } else {
      // Flat reservation fee, redeemable against the venue bill at billing —
      // no table selection, no per-head math. The discount benefit stacks on
      // top when the slot is Exclusive. Fee is per-venue (booking_config).
      amount = cfg?.booking_fee_inr ?? BOOKING_FEE_INR;
      mark(`table path flat fee=${amount}`);
    }

    // Special-booking flag is no longer driven by table seat counts — leave
    // it false and let the admin desk mark large parties manually.
    const isSpecial = false;

    // 15-min interval bookings — `reservation_time` is canonical (HH:MM).
    // slot_id is no longer persisted; the priority-window check happens at
    // SMS / scan time from reservation_time directly.
    const hhmm = !isSuite && body.reservation_time ? body.reservation_time.slice(0, 5) : null;
    const codeExpiresAt = !isSuite && body.reservation_date && hhmm
      ? computeCodeExpiry(body.reservation_date, hhmm, cfg?.code_grace_min)
      : null;

    // Razorpay must be configured up-front if the booking will require payment,
    // so we fail before reserving a DB slot for a booking we can't complete.
    if (amount > 0 && !isRazorpayConfigured()) {
      mark('razorpay not configured');
      return NextResponse.json(
        { success: false, error: 'Payment gateway not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.' },
        { status: 500 },
      );
    }

    const paymentStatus = amount > 0 ? 'pending' : 'not_required';

    // ---- STEP 1: reserve the slot in the DB BEFORE calling Razorpay. ----
    // Partial unique index (sql/005) makes concurrent double-bookings impossible:
    // whichever transaction commits first wins; others fail with 23505 / 23P01
    // and get a 409, never reaching Razorpay.
    // Unique booking code generated up-front. Retry loop handles the vanishingly
    // rare generator collision against the partial unique index.
    const insertSql = `
      INSERT INTO bookings (
        customer_name, customer_phone, customer_email,
        venue,
        reservation_date, reservation_time, guests,
        table_ref, slot_id,
        suite_name, check_in, check_out, nights,
        notes,
        amount, payment_status, razorpay_order_id,
        is_special,
        booking_code, code_expires_at,
        status
      ) VALUES (
        $1, $2, $3,
        $4,
        $5, $6, $7,
        $8, $9,
        $10, $11, $12, $13,
        $14,
        $15, $16, NULL,
        $17,
        $18, $19,
        'pending'
      ) RETURNING *`;

    const bookingCode = generateBookingCode();
    const params = [
      body.customer_name.trim(),
      body.customer_phone.trim(),
      (body.customer_email ?? '').trim(),
      body.venue,
      isSuite ? null : body.reservation_date,
      isSuite ? null : hhmm,
      isSuite ? null : body.guests ?? null,
      null, // table_ref — no table selection in the simplified flow
      null, // slot_id — replaced by free-form 15-min reservation_time
      isSuite ? resolvedSuiteName : null,
      isSuite ? body.check_in : null,
      isSuite ? body.check_out : null,
      isSuite ? nights : null,
      body.notes?.trim() || null,
      amount,
      paymentStatus,
      isSpecial,
      bookingCode,
      codeExpiresAt,
    ];

    mark('db insert (reserve slot) starting');
    let booking: any;
    try {
      const { rows } = await pool.query(insertSql, params);
      booking = rows[0];
      mark(`db insert ok id=${booking?.id}`);
    } catch (e: any) {
      // 23505 = unique_violation (table partial index)
      // 23P01 = exclusion_violation (suite daterange overlap)
      if (e?.code === '23505' || e?.code === '23P01') {
        mark(`conflict ${e.code}: already booked`);
        const msg = isSuite
          ? 'This suite is already booked for the selected dates. Please pick different dates or another suite.'
          : 'This table is already booked for the selected slot. Please pick another table.';
        return NextResponse.json(
          { success: false, error: msg, code: 'ALREADY_BOOKED' },
          { status: 409 },
        );
      }
      throw e; // unknown DB error — let outer catch handle it
    }

    // ---- STEP 2: create Razorpay order (only after slot is reserved). ----
    if (amount > 0) {
      mark(`razorpay.orders.create starting amount=${amount} paise=${Math.round(amount * 100)}`);
      try {
        const order = await rzp().orders.create({
          amount: Math.round(amount * 100),
          currency: 'INR',
          receipt: `booking_${booking.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
          notes: {
            booking_id: booking.id,
            venue: body.venue,
            suite_name: resolvedSuiteName || '',
            table_ref: isSuite ? '' : body.table_ref || '',
            slot_id: isSuite ? '' : body.slot_id || '',
            customer_name: body.customer_name,
            customer_email: body.customer_email,
            customer_phone: body.customer_phone,
            reservation_date: isSuite ? '' : body.reservation_date || '',
            check_in: body.check_in || '',
            check_out: body.check_out || '',
          },
        });
        rzpOrderId = order.id;
        mark(`razorpay order created id=${rzpOrderId}`);
      } catch (rzpErr: any) {
        // Razorpay failed AFTER we reserved the slot. Free it back up so the
        // customer can retry and others can book the same table.
        mark(`razorpay failed statusCode=${rzpErr?.statusCode}; cancelling reservation id=${booking.id}`);
        console.error('[bookings POST] razorpay error:', rzpErr?.error || rzpErr);
        await pool.query(
          `UPDATE bookings
              SET status = 'cancelled', payment_status = 'failed'
            WHERE id = $1`,
          [booking.id],
        ).catch((cleanupErr) => {
          console.error('[bookings POST] failed to cancel reservation after razorpay error:', cleanupErr);
        });
        throw rzpErr;
      }

      // Attach the order id to the reserved row.
      const { rows } = await pool.query(
        `UPDATE bookings SET razorpay_order_id = $1 WHERE id = $2 RETURNING *`,
        [rzpOrderId, booking.id],
      );
      booking = rows[0] || booking;
      mark(`booking updated with razorpay_order_id`);
    } else {
      mark('free booking, skipping razorpay');
      // Free bookings never hit razorpay/verify, so confirmation-SMS fires now.
      // Awaited: on Vercel/serverless, fire-and-forget Twilio calls are killed
      // when the response is sent, and the SMS never goes out.
      try {
        const r = await sendBookingConfirmationSmsOnce(booking.id, pool);
        mark(`sms free-booking claimed=${r.claimed} sent=${r.sent ?? false}${r.error ? ` error=${r.error}` : ''}`);
      } catch (e) {
        console.error('[bookings POST] sms error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: booking,
      razorpay: rzpOrderId
        ? {
            order_id: rzpOrderId,
            amount: Math.round(amount * 100),
            currency: 'INR',
            key_id: RZP_KEY_ID,
          }
        : null,
    });
  } catch (e: any) {
    mark(`CAUGHT error: name=${e?.name} code=${e?.code} statusCode=${e?.statusCode} message=${e?.message}`);
    console.error('[bookings POST] full error object:', e);
    if (e?.error) console.error('[bookings POST] error.error:', e.error);
    if (e?.response?.data) console.error('[bookings POST] response.data:', e.response.data);
    if (e?.stack) console.error('[bookings POST] stack:', e.stack);
    return jsonError(e);
  }
}

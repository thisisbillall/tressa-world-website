import { NextRequest, NextResponse } from 'next/server';
import { pool, queryMany } from '@/lib/db';
import {
  BookingInput,
  findSuite,
  findVenueCharge,
  nightsBetween,
  validateBooking,
} from '@/lib/bookings';
import { isRazorpayConfigured, rzp, RZP_KEY_ID } from '@/lib/razorpay';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/bookings?limit=100&status=pending
export async function GET(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

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

  const err = validateBooking(body);
  if (err) { mark(`validation failed: ${err}`); return NextResponse.json({ success: false, error: err }, { status: 400 }); }
  mark('validated');

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
      // Table booking — compute cover charge from venue_charges.
      const perPerson = await findVenueCharge(body.venue);
      const guests = Number(body.guests || 0);
      amount = perPerson * guests;
      mark(`table path perPerson=${perPerson} guests=${guests} amount=${amount}`);
    }

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
    const insertSql = `
      INSERT INTO bookings (
        customer_name, customer_phone, customer_email,
        venue,
        reservation_date, reservation_time, guests,
        table_ref, slot_id,
        suite_name, check_in, check_out, nights,
        notes,
        amount, payment_status, razorpay_order_id,
        status
      ) VALUES (
        $1, $2, $3,
        $4,
        $5, $6, $7,
        $8, $9,
        $10, $11, $12, $13,
        $14,
        $15, $16, NULL,
        'pending'
      ) RETURNING *`;

    const params = [
      body.customer_name.trim(),
      body.customer_phone.trim(),
      body.customer_email.trim(),
      body.venue,
      isSuite ? null : body.reservation_date,
      isSuite ? null : body.reservation_time,
      isSuite ? null : body.guests ?? null,
      isSuite ? null : body.table_ref ?? null,
      isSuite ? null : body.slot_id ?? null,
      isSuite ? resolvedSuiteName : null,
      isSuite ? body.check_in : null,
      isSuite ? body.check_out : null,
      isSuite ? nights : null,
      body.notes?.trim() || null,
      amount,
      paymentStatus,
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

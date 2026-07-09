import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  cleanupStaleSuiteBookings,
  computeSuitePricing,
  getSuiteRoomById,
  nightsBetween,
  validateSuiteBooking,
  type SuiteBookingInput,
} from '@/lib/suiteRooms';
import { isRazorpayConfigured, rzp, RZP_KEY_ID } from '@/lib/razorpay';
import { guardDbConfigured, jsonError } from '@/lib/apiError';
import { generateBookingCode } from '@/lib/bookingCode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/suite-bookings
// Reserves the room row FIRST (the GIST overlap constraint blocks concurrent
// double-bookings), then creates the Razorpay order for the full stay. The
// browser opens checkout and calls /api/suite-bookings/verify on success.
export async function POST(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  let body: SuiteBookingInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const err = validateSuiteBooking(body);
  if (err) return NextResponse.json({ success: false, error: err }, { status: 400 });

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Payment gateway not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.' },
      { status: 500 },
    );
  }

  // Free abandoned holds before we test availability.
  await cleanupStaleSuiteBookings(15);

  try {
    const room = await getSuiteRoomById(body.room_id);
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found or unavailable' }, { status: 400 });
    }

    const guests = Math.max(1, Math.min(Number(body.guests) || 1, room.max_guests));
    const nights = nightsBetween(body.check_in, body.check_out);
    const p = computeSuitePricing(room, nights);
    if (p.total <= 0) {
      return NextResponse.json({ success: false, error: 'Could not determine room price' }, { status: 400 });
    }

    // ---- Reserve the room (DB is the authority on double-booking). ----
    const insertSql = `
      INSERT INTO suite_bookings (
        booking_code, room_id, room_number, room_name,
        customer_name, customer_phone, customer_email,
        check_in, check_out, nights, guests,
        base_amount, discount_amount, gst_rate, gst_amount, total_amount,
        payment_status, status, notes
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        'pending', 'pending', $17
      ) RETURNING *`;

    let booking: any = null;
    // Retry only guards the vanishingly rare booking-code collision; a date
    // overlap (23P01) is a real "room taken" and returns 409.
    for (let attempt = 0; attempt < 4 && !booking; attempt++) {
      const params = [
        generateBookingCode(),
        room.id, room.room_number, room.name,
        body.customer_name.trim(), body.customer_phone.trim(), (body.customer_email ?? '').trim() || null,
        body.check_in, body.check_out, nights, guests,
        p.base, p.discount, p.gstRate, p.gst, p.total,
        body.notes?.trim() || null,
      ];
      try {
        const { rows } = await pool.query(insertSql, params);
        booking = rows[0];
      } catch (e: any) {
        if (e?.code === '23P01') {
          return NextResponse.json(
            {
              success: false,
              code: 'ALREADY_BOOKED',
              error: 'This room is already booked for the selected dates. Please pick different dates or another room.',
            },
            { status: 409 },
          );
        }
        if (e?.code === '23505' && attempt < 3) continue; // booking_code clash — retry
        throw e;
      }
    }
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Could not create booking, please retry.' }, { status: 500 });
    }

    // ---- Create the Razorpay order for the full stay. ----
    let order;
    try {
      order = await rzp().orders.create({
        amount: Math.round(p.total * 100),
        currency: 'INR',
        receipt: `suite_${booking.id.slice(0, 8)}`,
        notes: {
          suite_booking_id: booking.id,
          booking_code: booking.booking_code,
          room_number: room.room_number,
          room_name: room.name,
          check_in: body.check_in,
          check_out: body.check_out,
          nights: String(nights),
          customer_name: body.customer_name,
          customer_phone: body.customer_phone,
          customer_email: body.customer_email || '',
        },
      });
    } catch (rzpErr: any) {
      // Free the room back up — the order we needed couldn't be created.
      await pool.query(
        `UPDATE suite_bookings SET status = 'cancelled', payment_status = 'failed' WHERE id = $1`,
        [booking.id],
      ).catch(() => {});
      console.error('[suite-bookings] razorpay error:', rzpErr?.error || rzpErr);
      throw rzpErr;
    }

    const { rows } = await pool.query(
      `UPDATE suite_bookings SET razorpay_order_id = $1 WHERE id = $2 RETURNING *`,
      [order.id, booking.id],
    );
    booking = rows[0] || booking;

    return NextResponse.json({
      success: true,
      data: booking,
      pricing: p,
      razorpay: {
        order_id: order.id,
        amount: Math.round(p.total * 100),
        currency: 'INR',
        key_id: RZP_KEY_ID,
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}

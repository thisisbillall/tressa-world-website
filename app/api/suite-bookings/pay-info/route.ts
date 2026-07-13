import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { RZP_KEY_ID } from '@/lib/razorpay';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/suite-bookings/pay-info?ref=TW-XXXXXX
// Public: the pay page uses this to render the amount and re-open checkout for
// an existing (staff-created) order. Returns the group's payment status.
export async function GET(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  const ref = (new URL(req.url).searchParams.get('ref') || '').trim().toUpperCase();
  if (!ref) return NextResponse.json({ success: false, error: 'ref required' }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `SELECT group_ref, group_id, room_name, room_number, customer_name,
              customer_phone, check_in, check_out, nights, guests,
              total_amount, payment_status, status, razorpay_order_id
         FROM suite_bookings
        WHERE group_ref = $1
        ORDER BY room_number ASC`,
      [ref],
    );
    if (!rows.length) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });

    const first = rows[0];
    const total = rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
    const paid = rows.every((r) => r.payment_status === 'paid');

    return NextResponse.json({
      success: true,
      data: {
        group_ref: first.group_ref,
        customer_name: first.customer_name,
        room_name: first.room_name,
        room_numbers: rows.map((r) => r.room_number),
        check_in: first.check_in,
        check_out: first.check_out,
        nights: first.nights,
        quantity: rows.length,
        total_amount: total,
        payment_status: paid ? 'paid' : first.payment_status,
        status: first.status,
        razorpay: paid
          ? null
          : {
              order_id: first.razorpay_order_id,
              amount: Math.round(total * 100),
              currency: 'INR',
              key_id: RZP_KEY_ID,
            },
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}

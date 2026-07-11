import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { guardDbConfigured, jsonError } from '@/lib/apiError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/suite-bookings/release  { order_id }
// Frees an unpaid hold when the guest dismisses Razorpay. Never touches a paid
// booking.
export async function POST(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const orderId = body?.order_id;
  if (!orderId) return NextResponse.json({ success: false, error: 'order_id required' }, { status: 400 });

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM suite_bookings
        WHERE razorpay_order_id = $1 AND payment_status = 'pending' AND status = 'pending'`,
      [orderId],
    );
    return NextResponse.json({ success: true, released: rowCount ?? 0 });
  } catch (e) {
    return jsonError(e);
  }
}

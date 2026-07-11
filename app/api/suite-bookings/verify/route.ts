import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyCheckoutSignature } from '@/lib/razorpay';
import { guardDbConfigured, jsonError } from '@/lib/apiError';
import { sendSuiteGroupSmsOnce } from '@/lib/suiteGroup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Confirms a whole suite booking (one or many rooms) after Razorpay checkout.
export async function POST(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
  }

  const ok = verifyCheckoutSignature({ order_id: razorpay_order_id, payment_id: razorpay_payment_id, signature: razorpay_signature });

  try {
    if (!ok) {
      await pool.query(`UPDATE suite_bookings SET payment_status='failed' WHERE razorpay_order_id=$1`, [razorpay_order_id]);
      return NextResponse.json({ success: false, error: 'Signature mismatch' }, { status: 400 });
    }
    const { rows } = await pool.query(
      `UPDATE suite_bookings
          SET payment_status='paid', razorpay_payment_id=$1, razorpay_signature=$2, status='confirmed'
        WHERE razorpay_order_id=$3
        RETURNING *`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id],
    );
    if (!rows.length) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });

    try { await sendSuiteGroupSmsOnce(pool, rows[0].group_id); }
    catch (e) { console.error('[suite verify] sms error:', e); }

    return NextResponse.json({ success: true, group_ref: rows[0].group_ref, bookings: rows });
  } catch (e) {
    return jsonError(e);
  }
}

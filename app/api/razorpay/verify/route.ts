import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyCheckoutSignature } from '@/lib/razorpay';
import { guardDbConfigured, jsonError } from '@/lib/apiError';
import { sendBookingConfirmationSmsOnce } from '@/lib/twilio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const dbGuard = guardDbConfigured();
  if (dbGuard) return dbGuard;

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    booking_id,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = body || {};

  if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
  }

  const ok = verifyCheckoutSignature({
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    signature: razorpay_signature,
  });

  try {
    if (!ok) {
      await pool.query(
        `UPDATE bookings SET payment_status = 'failed' WHERE id = $1 AND razorpay_order_id = $2`,
        [booking_id, razorpay_order_id],
      );
      return NextResponse.json({ success: false, error: 'Signature mismatch' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `UPDATE bookings
          SET payment_status     = 'paid',
              razorpay_payment_id = $1,
              razorpay_signature  = $2,
              status              = 'confirmed'
        WHERE id = $3 AND razorpay_order_id = $4
        RETURNING *`,
      [razorpay_payment_id, razorpay_signature, booking_id, razorpay_order_id],
    );

    if (!rows[0]) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }
    // Await before responding: on Vercel/serverless, fire-and-forget promises
    // are killed when the function returns, so the Twilio HTTPS call never
    // completes. Webhook is still the backstop if this throws.
    try {
      const smsRes = await sendBookingConfirmationSmsOnce(rows[0].id, pool);
      if (!smsRes.sent) {
        console.warn('[rzp verify] sms not sent:', smsRes);
      }
    } catch (e) {
      console.error('[rzp verify] sms error:', e);
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (e) {
    return jsonError(e);
  }
}

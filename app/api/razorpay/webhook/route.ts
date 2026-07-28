import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { isOurDiningOrder } from '@/lib/refundGuard';
import { sendBookingConfirmationSmsOnce } from '@/lib/twilio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Webhook endpoint. Configure in Razorpay Dashboard:
//   URL:    https://your-domain.com/api/razorpay/webhook
//   Events: payment.captured, payment.failed, refund.processed
//   Secret: RAZORPAY_WEBHOOK_SECRET
//
// Webhooks are the source of truth: the client /verify path can be bypassed,
// the webhook cannot (Razorpay retries for 24h).
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }

  const type: string = event?.event || '';
  const payment = event?.payload?.payment?.entity;
  const orderId: string | undefined = payment?.order_id;
  const paymentId: string | undefined = payment?.id;

  if (!orderId) return NextResponse.json({ success: true, ignored: true });

  // Shared account + two of our own webhooks: this endpoint acts ONLY on our
  // DINING orders. Suite payments and the café's are acknowledged and skipped —
  // never refunded, never mutated. Ack 200 so Razorpay stops retrying.
  if (!(await isOurDiningOrder(orderId))) {
    console.warn('[rzp webhook] ignored: not a dining payment', { orderId, paymentId, type });
    return NextResponse.json({ success: true, ignored: 'not our dining payment' });
  }

  if (type === 'payment.captured') {
    // Idempotent confirm: mark paid + confirmed if the row is still pending.
    // If the row was cancelled/deleted before capture arrived, we have a paid
    // charge with no booking — auto-refund so we never keep customer money for
    // a slot we can't honour.
    const { rows } = await pool.query(
      `UPDATE bookings
          SET payment_status = 'paid',
              razorpay_payment_id = COALESCE(razorpay_payment_id, $1),
              status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
        WHERE razorpay_order_id = $2
          AND status IN ('pending','confirmed')
        RETURNING id`,
      [paymentId || null, orderId],
    );
    // Backstop confirmation SMS: /verify usually sends, but the webhook may
    // arrive first (browser closed, verify failed, etc.). Idempotent.
    // Awaited so the serverless function doesn't terminate the Twilio call.
    if (rows[0]?.id) {
      try {
        const smsRes = await sendBookingConfirmationSmsOnce(rows[0].id, pool);
        if (!smsRes.claimed) {
          // Already sent by /verify — expected, not an error.
        } else if (!smsRes.sent) {
          console.warn('[rzp webhook] sms not sent:', smsRes);
        }
      } catch (e) {
        console.error('[rzp webhook] sms error:', e);
      }
    }
    if (rows.length === 0 && paymentId) {
      // LOG-ONLY: we no longer auto-refund. A captured dining payment with no
      // matching booking row is flagged for manual review instead of being
      // refunded automatically (auto-refund previously misfired on a shared
      // account). Handle any real orphan manually from the Razorpay dashboard.
      console.warn('[rzp webhook] ORPHAN dining capture — NOT auto-refunding (log-only). Review manually:', { orderId, paymentId });
    }
  } else if (type === 'payment.failed') {
    // Also flip status to 'cancelled' so the partial unique index releases the
    // slot for other customers. Without this the row would keep the table
    // reserved forever.
    await pool.query(
      `UPDATE bookings
          SET payment_status = 'failed',
              status = CASE WHEN status = 'pending' THEN 'cancelled' ELSE status END
        WHERE razorpay_order_id = $1`,
      [orderId],
    );
  } else if (type === 'refund.processed') {
    await pool.query(
      `UPDATE bookings SET payment_status = 'refunded' WHERE razorpay_order_id = $1`,
      [orderId],
    );
  }

  return NextResponse.json({ success: true });
}

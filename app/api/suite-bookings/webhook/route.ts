import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { isOurSuiteOrder } from '@/lib/refundGuard';
import { sendSuiteGroupSmsOnce } from '@/lib/suiteGroup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Razorpay webhook for suite payments. Configure in the dashboard:
//   URL:    https://your-domain.com/api/suite-bookings/webhook
//   Events: payment.captured, payment.failed, refund.processed
//   Secret: RAZORPAY_WEBHOOK_SECRET  (same secret as the dining webhook)
//
// Source of truth: the browser /verify call can be missed (tab closed), the
// webhook cannot — Razorpay retries for 24h.
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
  // SUITE orders. Dining payments and the café's are acknowledged and skipped —
  // never refunded, never mutated. Ack 200 so Razorpay stops retrying.
  if (!(await isOurSuiteOrder(orderId))) {
    console.warn('[suite webhook] ignored: not a suite payment', { orderId, paymentId, type });
    return NextResponse.json({ success: true, ignored: 'not our suite payment' });
  }

  try {
    if (type === 'payment.captured') {
      const { rows } = await pool.query(
        `UPDATE suite_bookings
            SET payment_status = 'paid',
                razorpay_payment_id = COALESCE(razorpay_payment_id, $1),
                status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
          WHERE razorpay_order_id = $2
            AND status IN ('pending','confirmed')
          RETURNING id, group_id`,
        [paymentId || null, orderId],
      );
      // Backstop confirmation SMS for the whole group (idempotent) — fires if
      // the browser /verify call was missed (tab closed, verify failed, etc.).
      if (rows[0]?.group_id) {
        try { await sendSuiteGroupSmsOnce(pool, rows[0].group_id); }
        catch (e) { console.error('[suite webhook] sms error:', e); }
      }
      // LOG-ONLY: we no longer auto-refund. A captured suite payment with no
      // matching booking row is flagged for manual review instead of being
      // refunded automatically. Handle any real orphan from the dashboard.
      if (rows.length === 0 && paymentId) {
        console.warn('[suite webhook] ORPHAN suite capture — NOT auto-refunding (log-only). Review manually:', { orderId, paymentId });
      }
    } else if (type === 'payment.failed') {
      await pool.query(
        `UPDATE suite_bookings
            SET payment_status = 'failed',
                status = CASE WHEN status = 'pending' THEN 'cancelled' ELSE status END
          WHERE razorpay_order_id = $1`,
        [orderId],
      );
    } else if (type === 'refund.processed') {
      await pool.query(
        `UPDATE suite_bookings SET payment_status = 'refunded' WHERE razorpay_order_id = $1`,
        [orderId],
      );
    }
  } catch (e) {
    console.error('[suite webhook] handler error:', e);
    // Still 200 so Razorpay doesn't hammer retries on a transient DB blip;
    // the next retry / reconciliation will catch it.
  }

  return NextResponse.json({ success: true });
}

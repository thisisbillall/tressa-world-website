// Ownership guard for a SHARED Razorpay account.
//
// This account is used by more than one app (e.g. the "Café Tria" QR-ordering
// app). Razorpay fires webhooks for ALL of them against our single endpoint(s).
// We must NEVER act on — least of all REFUND — a payment that isn't tied to one
// of OUR OWN orders. Historically an orphan payment (no matching row in our DB)
// was auto-refunded; on a shared account that refunded the café's payments.
//
// `isOurRazorpayOrder` is the single gate every webhook/refund path must pass.

import { pool } from './db';
import { rzp, RZP_APP_TAG } from './razorpay';

// Positive identification that a Razorpay order was created by THIS app.
// Ours iff: notes.app === our tag  (primary, set on every order we create),
//   OR the receipt uses one of our prefixes (legacy orders without the tag),
//   OR notes carry one of our own id keys.
// Another app's order (café etc.) matches NONE of these.
export function orderLooksOurs(order: any): boolean {
  if (!order) return false;
  const notes = order.notes || {};
  if (String(notes.app || '') === RZP_APP_TAG) return true;
  const receipt = String(order.receipt || '');
  if (/^(booking_|suite_|suitegrp_)/i.test(receipt)) return true;
  return ['booking_id', 'group_id', 'group_ref', 'suite_booking_id', 'venue'].some(
    (k) => notes[k] != null && String(notes[k]).length > 0,
  );
}

// True ONLY if `orderId` belongs to one of OUR orders.
//   1. DB check — covers every live order (dining `bookings` + `suite_bookings`).
//   2. Fallback — fetch the Razorpay order and inspect receipt/notes. This
//      covers OUR orders whose DB row was already cleaned up (a genuine orphan
//      we may legitimately refund).
// Anything else — the shared café app's payments included — returns false, so
// NO refund and NO state change is ever applied to it. On any doubt (fetch
// error, etc.) it also returns false: we never refund unless we're sure it's ours.
export async function isOurRazorpayOrder(orderId: string | undefined | null): Promise<boolean> {
  if (!orderId) return false;

  try {
    const r = await pool.query(
      `SELECT 1 FROM bookings       WHERE razorpay_order_id = $1
        UNION ALL
       SELECT 1 FROM suite_bookings WHERE razorpay_order_id = $1
        LIMIT 1`,
      [orderId],
    );
    if ((r.rowCount ?? 0) > 0) return true;
  } catch (e) {
    // Fall through to the Razorpay check rather than assuming ownership.
    console.error('[refundGuard] DB ownership check failed:', e);
  }

  try {
    const order: any = await rzp().orders.fetch(orderId);
    return orderLooksOurs(order);
  } catch {
    console.warn('[refundGuard] could not fetch order; treating as NOT ours:', orderId);
    return false;
  }
}

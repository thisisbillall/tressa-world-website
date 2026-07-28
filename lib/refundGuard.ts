// Ownership guards for a SHARED Razorpay account.
//
// This account is used by more than one app (e.g. "Café Tria"), AND we run two
// separate webhook endpoints of our own (dining + suite). Razorpay delivers
// every payment event to BOTH of our endpoints, so each endpoint must act ONLY
// on payments that belong to ITS OWN flow — otherwise the suite webhook would
// "orphan" a dining payment (not in suite_bookings) and vice-versa.
//
// Therefore the checks are scoped per flow/table. A payment is dining-ours only
// if it maps to a `bookings` row (or its Razorpay order carries a dining
// signature); suite-ours only if it maps to a `suite_bookings` row (or a suite
// signature). Everything else — the other flow's payments and the café's — is
// treated as NOT ours.
//
// Note: notes.app='tressa-website' is stamped on BOTH our flows, so it can't
// distinguish dining vs suite; we use the receipt prefix / id notes instead.

import { pool } from './db';
import { rzp } from './razorpay';

function looksDining(order: any): boolean {
  if (!order) return false;
  const notes = order.notes || {};
  if (/^booking_/i.test(String(order.receipt || ''))) return true;
  return notes.booking_id != null && String(notes.booking_id).length > 0;
}

function looksSuite(order: any): boolean {
  if (!order) return false;
  const notes = order.notes || {};
  if (/^suite(grp)?_/i.test(String(order.receipt || ''))) return true;
  return (notes.group_id != null && String(notes.group_id).length > 0)
      || (notes.group_ref != null && String(notes.group_ref).length > 0);
}

async function fetchOrder(orderId: string): Promise<any | null> {
  try { return await rzp().orders.fetch(orderId); } catch { return null; }
}

// True only if the order belongs to OUR DINING flow (`bookings` table). Suite
// and café orders return false, so the dining webhook never touches them.
export async function isOurDiningOrder(orderId?: string | null): Promise<boolean> {
  if (!orderId) return false;
  try {
    const r = await pool.query(`SELECT 1 FROM bookings WHERE razorpay_order_id = $1 LIMIT 1`, [orderId]);
    if ((r.rowCount ?? 0) > 0) return true;
  } catch (e) {
    console.error('[refundGuard] dining DB check failed:', e);
  }
  return looksDining(await fetchOrder(orderId));
}

// True only if the order belongs to OUR SUITE flow (`suite_bookings` table).
// Dining and café orders return false, so the suite webhook never touches them.
export async function isOurSuiteOrder(orderId?: string | null): Promise<boolean> {
  if (!orderId) return false;
  try {
    const r = await pool.query(`SELECT 1 FROM suite_bookings WHERE razorpay_order_id = $1 LIMIT 1`, [orderId]);
    if ((r.rowCount ?? 0) > 0) return true;
  } catch (e) {
    console.error('[refundGuard] suite DB check failed:', e);
  }
  return looksSuite(await fetchOrder(orderId));
}

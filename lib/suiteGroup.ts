// Group helpers shared by the invoice route, SMS, verify and webhook. Every
// suite booking belongs to a group (a group of one for a single room), keyed
// by group_ref (guest-facing) / group_id (internal).

import { sendSms } from './twilio';
import { uploadSuiteInvoicePdf, type SuiteInvoiceInput, type SuiteInvoiceLine } from './suiteInvoicePdf';

const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tressaworld.com').replace(/\/$/, '');

type PoolLike = { query: (sql: string, params: any[]) => Promise<{ rows: any[]; rowCount?: number | null }> };

const inr = (v: string | number) => `Rs.${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;
const fmtDate = (d: string | Date) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return String(d); }
};

const GROUP_COLUMNS = `
  id, group_id, group_ref, booking_code, room_number, room_name,
  customer_name, customer_phone, customer_email,
  check_in, check_out, nights, guests,
  base_amount, discount_amount, gst_rate, gst_amount, total_amount,
  payment_status, razorpay_order_id, razorpay_payment_id, created_at, invoice_url`;

// Resolve every row of the group that a ref OR a single room code belongs to.
export async function loadGroupRows(pool: PoolLike, refOrCode: string): Promise<any[]> {
  const seed = await pool.query(
    `SELECT group_id FROM suite_bookings WHERE group_ref = $1 OR booking_code = $1 LIMIT 1`,
    [refOrCode],
  );
  const groupId = seed.rows[0]?.group_id;
  if (!groupId) return [];
  const { rows } = await pool.query(
    `SELECT ${GROUP_COLUMNS} FROM suite_bookings WHERE group_id = $1 ORDER BY room_number ASC`,
    [groupId],
  );
  return rows;
}

// Build the invoice input (multi-room) from a group's rows.
export function buildInvoiceInputFromRows(rows: any[]): SuiteInvoiceInput {
  const head = rows[0];
  const items: SuiteInvoiceLine[] = rows.map((r) => ({
    room_number: r.room_number,
    room_name: r.room_name,
    guests: r.guests,
    base_amount: r.base_amount,
    discount_amount: r.discount_amount,
    gst_rate: r.gst_rate,
    gst_amount: r.gst_amount,
    total_amount: r.total_amount,
  }));
  return {
    group_ref: head.group_ref || head.booking_code,
    customer_name: head.customer_name,
    customer_phone: head.customer_phone,
    customer_email: head.customer_email,
    check_in: new Date(head.check_in).toISOString().slice(0, 10),
    check_out: new Date(head.check_out).toISOString().slice(0, 10),
    nights: head.nights,
    payment_status: head.payment_status,
    razorpay_order_id: head.razorpay_order_id,
    razorpay_payment_id: head.razorpay_payment_id,
    created_at: head.created_at,
    items,
  };
}

function buildGroupSmsBody(rows: any[], invoiceUrl: string): string {
  const head = rows[0];
  const name = (head.customer_name || '').split(' ')[0] || 'there';
  const total = rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
  const lines: string[] = [];
  lines.push(`TRESSA — Hi ${name}, your booking is confirmed.`);
  lines.push('');
  lines.push(`Ref: ${head.group_ref}`);
  lines.push(`${fmtDate(head.check_in)} -> ${fmtDate(head.check_out)} (${head.nights} night${head.nights > 1 ? 's' : ''})`);
  lines.push('');
  lines.push(`Room${rows.length > 1 ? `s (${rows.length})` : ''}:`);
  for (const r of rows) lines.push(`- ${r.room_name} #${r.room_number}`);
  lines.push('');
  lines.push(`Total paid: ${inr(total)} (incl. GST)`);
  lines.push(`Invoice: ${invoiceUrl}`);
  lines.push('');
  lines.push('Show your ref at reception on arrival. Thank you for choosing TRESSA.');
  return lines.join('\n');
}

// Claim-and-send one confirmation SMS for the whole group. Idempotent: the
// atomic sms_sent_at claim means /verify and the webhook never double-send.
export async function sendSuiteGroupSmsOnce(
  pool: PoolLike,
  groupId: string,
): Promise<{ claimed: boolean; sent?: boolean; error?: string }> {
  // Claim the whole group in one shot.
  const claim = await pool.query(
    `UPDATE suite_bookings SET sms_sent_at = NOW()
      WHERE group_id = $1 AND sms_sent_at IS NULL
      RETURNING id`,
    [groupId],
  );
  if ((claim.rowCount ?? 0) === 0) return { claimed: false };

  const { rows } = await pool.query(
    `SELECT ${GROUP_COLUMNS} FROM suite_bookings WHERE group_id = $1 ORDER BY room_number ASC`,
    [groupId],
  );
  if (!rows.length) return { claimed: false };
  const head = rows[0];

  // Persist an invoice PDF to Blob (best effort) → fall back to the live route.
  let invoiceUrl: string | null = head.invoice_url || null;
  if (!invoiceUrl) {
    try {
      invoiceUrl = await uploadSuiteInvoicePdf(buildInvoiceInputFromRows(rows));
      await pool.query(`UPDATE suite_bookings SET invoice_url = $1 WHERE group_id = $2`, [invoiceUrl, groupId]).catch(() => {});
    } catch (e: any) {
      console.warn('[suiteGroup] invoice upload skipped:', e?.message || e);
      invoiceUrl = null;
    }
  }
  const link = invoiceUrl || `${SITE_ORIGIN}/api/suite-bookings/invoice/${encodeURIComponent(head.group_ref)}`;

  const res = await sendSms(head.customer_phone, buildGroupSmsBody(rows, link));
  if (!res.success) {
    await pool.query(`UPDATE suite_bookings SET sms_sent_at = NULL WHERE group_id = $1`, [groupId]).catch(() => {});
    return { claimed: true, sent: false, error: res.error };
  }
  return { claimed: true, sent: true };
}

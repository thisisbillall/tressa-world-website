// Twilio SMS helper — used to send booking confirmations with the 15%-off
// code. Failure never blocks the booking flow: callers log + move on.
//
// Env:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_PHONE_NUMBER  (e.g. "+15551234567")
//
// Indian numbers come in as "9876543210" or "+91 98765-43210" — we strip to
// the last 10 digits and re-prefix "+91" to match how the production POS app
// formats its Twilio calls.

import twilio from 'twilio';
import {
  BOOKING_CODE_GRACE_MIN,
  BOOKING_DISCOUNT_PERCENT,
  computeCodeWindow,
  formatBookingTime,
  isPriorityTime,
} from './venueConfig';
import { uploadBookingPdf, BookingPdfInput } from './bookingPdf';

// Public origin used to build customer-facing links inside the SMS body.
// Set NEXT_PUBLIC_SITE_URL in production (e.g. "https://tressaworld.com").
const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tressaworld.com').replace(/\/$/, '');

const SID = process.env.TWILIO_ACCOUNT_SID || '';
const TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const FROM = process.env.TWILIO_PHONE_NUMBER || '';

export const isTwilioConfigured = () => !!SID && !!TOKEN && !!FROM;

let _client: ReturnType<typeof twilio> | null = null;
function client() {
  if (!_client) _client = twilio(SID, TOKEN);
  return _client;
}

export async function sendSms(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  if (!isTwilioConfigured()) {
    console.warn('[twilio] not configured, skipping SMS');
    return { success: false, error: 'Twilio not configured' };
  }
  try {
    const digits = to.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      return { success: false, error: `Invalid phone: ${to}` };
    }
    await client().messages.create({
      from: FROM,
      to: `+91${digits}`,
      body,
    });
    return { success: true };
  } catch (err: any) {
    console.error('[twilio] send failed:', err?.message || err);
    return { success: false, error: err?.message || 'Twilio error' };
  }
}

type BookingSmsInput = {
  customer_name: string;
  booking_code: string;
  venue: 'bar' | 'restaurant' | 'rooftop' | 'suite';
  // Table fields
  table_ref?: string | null;
  reservation_date?: string | null;
  reservation_time?: string | null;
  // Suite fields
  suite_name?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  // Payment — flat ₹200 reservation for tables, per-night total for suites
  amount?: number | string | null;
  // When the QR / discount code stops being honored at the venue
  code_expires_at?: string | Date | null;
  // Vercel Blob URL for the booking-slip PDF (preferred over the on-the-fly
  // /api/booking-pdf route — falls back if missing).
  pdf_url?: string | null;
};

// Claim-and-send: atomically marks sms_sent_at so two concurrent confirmation
// paths (verify + webhook) don't send two SMS for the same booking. Callers
// MUST await this on serverless (Vercel) — returning the HTTP response without
// awaiting kills the in-flight Twilio HTTPS call and the SMS never sends.
export async function sendBookingConfirmationSmsOnce(bookingId: string, pool: {
  query: (sql: string, params: any[]) => Promise<{ rows: any[] }>;
}): Promise<{ claimed: boolean; sent?: boolean; error?: string }> {
  const { rows } = await pool.query(
    `UPDATE bookings
        SET sms_sent_at = NOW()
      WHERE id = $1 AND sms_sent_at IS NULL AND booking_code IS NOT NULL
      RETURNING id, customer_name, customer_phone, customer_email,
                booking_code, venue,
                table_ref, reservation_date, reservation_time, guests,
                suite_name, check_in, check_out,
                amount, code_expires_at, payment_status,
                razorpay_order_id, razorpay_payment_id,
                pdf_url, created_at`,
    [bookingId],
  );
  const b = rows[0];
  if (!b) return { claimed: false };

  // Upload the booking-slip PDF to Vercel Blob if we haven't already. Best
  // effort — if upload fails (token missing, network glitch) we still send
  // SMS pointing at the on-the-fly /api/booking-pdf fallback.
  let pdfUrl: string | null = b.pdf_url || null;
  if (!pdfUrl) {
    try {
      const input: BookingPdfInput = {
        id: b.id,
        customer_name: b.customer_name,
        customer_phone: b.customer_phone,
        customer_email: b.customer_email,
        venue: b.venue,
        reservation_date: b.reservation_date
          ? new Date(b.reservation_date).toISOString().slice(0, 10)
          : null,
        reservation_time: b.reservation_time,
        guests: b.guests,
        suite_name: b.suite_name,
        check_in: b.check_in ? new Date(b.check_in).toISOString().slice(0, 10) : null,
        check_out: b.check_out ? new Date(b.check_out).toISOString().slice(0, 10) : null,
        booking_code: b.booking_code,
        code_expires_at: b.code_expires_at,
        amount: b.amount,
        payment_status: b.payment_status,
        razorpay_order_id: b.razorpay_order_id,
        razorpay_payment_id: b.razorpay_payment_id,
        created_at: b.created_at,
      };
      pdfUrl = await uploadBookingPdf(input);
      await pool
        .query(`UPDATE bookings SET pdf_url = $1 WHERE id = $2`, [pdfUrl, bookingId])
        .catch(() => {});
    } catch (e: any) {
      console.warn('[twilio] pdf upload skipped:', e?.message || e);
      pdfUrl = null;
    }
  }

  const body = buildBookingSmsBody({
    customer_name: b.customer_name,
    booking_code: b.booking_code,
    venue: b.venue,
    table_ref: b.table_ref,
    reservation_date: b.reservation_date
      ? new Date(b.reservation_date).toISOString().slice(0, 10)
      : null,
    reservation_time: b.reservation_time,
    suite_name: b.suite_name,
    check_in: b.check_in ? new Date(b.check_in).toISOString().slice(0, 10) : null,
    check_out: b.check_out ? new Date(b.check_out).toISOString().slice(0, 10) : null,
    amount: b.amount,
    code_expires_at: b.code_expires_at,
    pdf_url: pdfUrl,
  });

  const res = await sendSms(b.customer_phone, body);
  if (!res.success) {
    // Roll back the claim so a retry path (webhook) can try again.
    await pool
      .query(`UPDATE bookings SET sms_sent_at = NULL WHERE id = $1`, [bookingId])
      .catch(() => {});
    return { claimed: true, sent: false, error: res.error };
  }
  return { claimed: true, sent: true };
}

// reservation_time arrives as "HH:MM" or "HH:MM:SS" — render it as "3:15 PM".
function formatHHMM(time?: string | null): string {
  if (!time) return '';
  const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
  return formatBookingTime(hhmm);
}

// Render a YYYY-MM-DD as "14 May 2026" — readable on a phone.
function formatDatePretty(d?: string | null): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return d; }
}

// Render INR with grouping. Accepts numeric or numeric-string. Returns "" if
// the input is falsy/unparseable so the SMS just omits the amount line.
function formatINR(amount?: number | string | null): string {
  if (amount == null) return '';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n) || n <= 0) return '';
  return `Rs.${Math.round(n).toLocaleString('en-IN')}`;
}

// Format an expiry Date in IST as "h:mm AM/PM".
function formatExpiryIST(value?: string | Date | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

const VENUE_SMS_LABEL: Record<BookingSmsInput['venue'], string> = {
  bar: 'Unwind (Bar)',
  restaurant: 'Soul (Restaurant)',
  rooftop: 'Sky (Rooftop)',
  suite: 'Aura (Suite)',
};

export function buildBookingSmsBody(b: BookingSmsInput): string {
  const name = (b.customer_name || '').split(' ')[0] || 'there';
  const isSuite = b.venue === 'suite';
  const venueLabel = VENUE_SMS_LABEL[b.venue];

  const lines: string[] = [];
  lines.push(`TRESSA — Hi ${name}, your booking is confirmed.`);
  lines.push('');

  let priority = false;
  if (isSuite) {
    lines.push(`${b.suite_name ?? venueLabel}`);
    if (b.check_in && b.check_out) lines.push(`${b.check_in} → ${b.check_out}`);
  } else {
    const datePretty = formatDatePretty(b.reservation_date);
    const timing = formatHHMM(b.reservation_time);
    const parts = [venueLabel, datePretty, timing].filter(Boolean);
    lines.push(parts.join(' · '));
    priority = isPriorityTime(b.reservation_time ? b.reservation_time.slice(0, 5) : null);
  }

  const amt = formatINR(b.amount);
  if (amt) {
    lines.push(isSuite ? `Prepaid: ${amt}` : `Reservation: ${amt} (redeemed on total booking)`);
  }

  lines.push('');
  lines.push(`Code: ${b.booking_code}`);
  if (!isSuite) {
    const { validFrom, validUntil } = computeCodeWindow(
      b.reservation_date ?? null,
      b.reservation_time ? b.reservation_time.slice(0, 5) : null,
      BOOKING_CODE_GRACE_MIN,
    );
    if (validFrom && validUntil) {
      lines.push(
        `Valid: ${formatExpiryIST(validFrom)} – ${formatExpiryIST(validUntil)} IST (${BOOKING_CODE_GRACE_MIN} min)`,
      );
    } else {
      const expiryStr = formatExpiryIST(b.code_expires_at);
      if (expiryStr) lines.push(`Valid till: ${expiryStr} IST`);
    }
  }

  // Prefer the persisted Blob URL; otherwise the on-the-fly route still works.
  const pdfUrl = b.pdf_url || `${SITE_ORIGIN}/api/booking-pdf/${encodeURIComponent(b.booking_code)}`;
  lines.push(`Slip: ${pdfUrl}`);

  if (!isSuite) {
    lines.push('');
    lines.push(
      priority
        ? `Exclusive slot — show QR at billing for ${BOOKING_DISCOUNT_PERCENT}% OFF via Tressa Pay.`
        : `Premium slot — ${BOOKING_DISCOUNT_PERCENT}% discount applies only in Exclusive windows (3-7 PM, 10-11 PM).`,
    );
  }

  lines.push('');
  lines.push('Thanks for choosing TRESSA.');

  return lines.join('\n');
}

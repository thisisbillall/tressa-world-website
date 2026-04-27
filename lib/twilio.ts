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
import { TIME_SLOTS } from './venueConfig';

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
  // Payment (only meaningful for suites — table reservations are free)
  amount?: number | string | null;
};

// Claim-and-send: atomically marks sms_sent_at so two concurrent confirmation
// paths (verify + webhook) don't send two SMS for the same booking. Fire-and-
// forget — callers should not await when they want to return to the user fast.
export async function sendBookingConfirmationSmsOnce(bookingId: string, pool: {
  query: (sql: string, params: any[]) => Promise<{ rows: any[] }>;
}): Promise<{ claimed: boolean; sent?: boolean; error?: string }> {
  const { rows } = await pool.query(
    `UPDATE bookings
        SET sms_sent_at = NOW()
      WHERE id = $1 AND sms_sent_at IS NULL AND booking_code IS NOT NULL
      RETURNING customer_name, customer_phone, booking_code, venue,
                table_ref, reservation_date, reservation_time,
                suite_name, check_in, check_out, amount`,
    [bookingId],
  );
  const b = rows[0];
  if (!b) return { claimed: false };

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

// reservation_time may arrive as "17:00", "17:00:00", or a Date.toISOString.
// Match it to a known slot's start and return the human label like
// "5:00 PM – 8:00 PM". Falls back to the raw time when no slot matches.
function formatSlotRange(time?: string | null): string {
  if (!time) return '';
  const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
  const slot = TIME_SLOTS.find((s) => s.start === hhmm);
  return slot?.label ?? hhmm;
}

// Render INR with grouping. Accepts numeric or numeric-string. Returns "" if
// the input is falsy/unparseable so the SMS just omits the amount line.
function formatINR(amount?: number | string | null): string {
  if (amount == null) return '';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n) || n <= 0) return '';
  return `Rs.${Math.round(n).toLocaleString('en-IN')}`;
}

export function buildBookingSmsBody(b: BookingSmsInput): string {
  const name = (b.customer_name || '').split(' ')[0] || 'there';

  let detail: string;
  if (b.venue === 'suite') {
    detail = `${b.suite_name ?? 'Suite'} · ${b.check_in} to ${b.check_out}`;
  } else {
    const timing = formatSlotRange(b.reservation_time) || b.reservation_time || '';
    const t = timing ? ` at ${timing}` : '';
    const label = b.table_ref ? ` (table ${b.table_ref})` : '';
    detail = `${b.venue}${label} on ${b.reservation_date}${t}`;
  }

  const amt = formatINR(b.amount);
  const amountLine = amt ? ` Prepaid: ${amt}.` : '';

  return (
    `Hi ${name}, your TRESSA booking is confirmed. ${detail}.${amountLine} ` +
    `Show code ${b.booking_code} at your visit for up to 15% OFF on the total bill ` +
    `(applicable on F&B via Tressa Pay; see tressaworld.com/terms). ` +
    `Thanks for choosing TRESSA.`
  );
}

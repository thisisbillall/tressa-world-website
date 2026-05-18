// Static booking configuration. Not mock data — these are product constants
// (hours, windows, fees) that don't belong in the database.

import type { Slot, SlotId } from './venueTypes';

// Bookable window: every 15 minutes from 3:00 PM through 11:00 PM.
// The customer picks any HH:MM here; ₹99 reservation is charged regardless.
export const BOOKING_START_HHMM = '15:00';
export const BOOKING_END_HHMM = '23:00';
export const BOOKING_STEP_MIN = 15;

// Exclusive (priority) windows — ONLY when reservation_time falls inside one
// of these is the 15% Tressa Pay discount honored at the venue POS. Endpoints
// are inclusive: 19:00 qualifies, 19:15 does not. 22:00 qualifies, 23:00 qualifies.
export const PRIORITY_WINDOWS: { label: string; start: string; end: string }[] = [
  { label: '3:00 PM – 7:00 PM',    start: '15:00', end: '19:00' },
  { label: '10:00 PM – 11:00 PM',  start: '22:00', end: '23:00' },
];

// Convert HH:MM into total minutes since midnight (used for window math).
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

// True iff hhmm sits inside any priority window, inclusive.
export function isPriorityTime(hhmm: string | null | undefined): boolean {
  if (!hhmm) return false;
  const m = toMinutes(hhmm.slice(0, 5));
  return PRIORITY_WINDOWS.some(
    (w) => m >= toMinutes(w.start) && m <= toMinutes(w.end),
  );
}

// Validate the raw HH:MM string from the form / API payload. The 24:00
// end-of-day value is accepted explicitly (used for the midnight slot).
const HHMM_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;
export function isValidBookingTime(hhmm: string | null | undefined): boolean {
  if (!hhmm || !HHMM_RE.test(hhmm)) return false;
  const m = toMinutes(hhmm);
  if (m < toMinutes(BOOKING_START_HHMM) || m > toMinutes(BOOKING_END_HHMM)) return false;
  return m % BOOKING_STEP_MIN === 0;
}

// Pretty-print HH:MM as "3:00 PM". 24:00 renders as "12:00 AM".
export function formatBookingTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (h === 24) return `12:${String(m).padStart(2, '0')} AM`;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Enumerate every selectable time in the form.
export function listBookingTimes(): { value: string; label: string; priority: boolean }[] {
  const out: { value: string; label: string; priority: boolean }[] = [];
  const start = toMinutes(BOOKING_START_HHMM);
  const end = toMinutes(BOOKING_END_HHMM);
  for (let m = start; m <= end; m += BOOKING_STEP_MIN) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const value = `${hh}:${mm}`;
    out.push({ value, label: formatBookingTime(value), priority: isPriorityTime(value) });
  }
  return out;
}

// Legacy: layout files reference Slot/SlotId via venueTypes. The booking
// page no longer uses fixed slots — these are kept so the 3D layouts (still
// in lib/layouts/) typecheck without changes.
export const TIME_SLOTS: Slot[] = [
  { id: 'evening', label: '3:00 PM – 7:00 PM',   start: '15:00', end: '19:00' },
  { id: 'late',    label: '10:00 PM – 12:00 AM', start: '22:00', end: '23:45' },
];

export const DEFAULT_AVAILABILITY: Record<SlotId, boolean> = {
  evening: true,
  late: true,
};

// Flat reservation fee for tables — non-refundable, used on every venue
// (Soul / Sky / Unwind). Suites keep their per-night pricing.
export const BOOKING_FEE_INR = 99;

// Discount applied at the POS when the booking code / QR is presented
// AND the reservation_time falls inside a priority window.
export const BOOKING_DISCOUNT_PERCENT = 15;

// QR / booking code expires this many minutes after the reservation time.
export const BOOKING_CODE_GRACE_MIN = 15;

// ── QR validity window helpers (pure, client-safe) ─────────────────────────
// Reservation start as a UTC-anchored Date built from IST (UTC+5:30). '24:00'
// folds to 00:00 of the next calendar day. Returns null on invalid inputs.
export function computeReservationStart(
  reservationDate: string | null | undefined,
  hhmm: string | null | undefined,
): Date | null {
  if (!reservationDate || !hhmm || hhmm.length < 5) return null;
  let dateStr = reservationDate;
  let timeStr = hhmm.slice(0, 5);
  if (timeStr === '24:00') {
    const [y, mo, d] = reservationDate.split('-').map(Number);
    if (!y || !mo || !d) return null;
    const next = new Date(Date.UTC(y, mo - 1, d + 1));
    dateStr = next.toISOString().slice(0, 10);
    timeStr = '00:00';
  }
  const ist = new Date(`${dateStr}T${timeStr}:00+05:30`);
  return Number.isNaN(ist.getTime()) ? null : ist;
}

// Active window: QR is honored only from reservation_time (validFrom) until
// reservation_time + graceMin (validUntil). Both null when inputs are
// incomplete (suite bookings, missing time).
export function computeCodeWindow(
  reservationDate: string | null | undefined,
  hhmm: string | null | undefined,
  graceMin: number = BOOKING_CODE_GRACE_MIN,
): { validFrom: Date | null; validUntil: Date | null } {
  const validFrom = computeReservationStart(reservationDate, hhmm);
  if (!validFrom) return { validFrom: null, validUntil: null };
  const validUntil = new Date(validFrom.getTime() + graceMin * 60_000);
  return { validFrom, validUntil };
}

// Same window but derived from the canonical code_expires_at timestamp the
// API already returns. Avoids re-parsing reservation_date, which pg can
// shift by a calendar day depending on the server timezone.
export function codeWindowFromExpiry(
  codeExpiresAt: string | Date | null | undefined,
  graceMin: number = BOOKING_CODE_GRACE_MIN,
): { validFrom: Date | null; validUntil: Date | null } {
  if (!codeExpiresAt) return { validFrom: null, validUntil: null };
  const validUntil = codeExpiresAt instanceof Date ? codeExpiresAt : new Date(codeExpiresAt);
  if (Number.isNaN(validUntil.getTime())) return { validFrom: null, validUntil: null };
  const validFrom = new Date(validUntil.getTime() - graceMin * 60_000);
  return { validFrom, validUntil };
}

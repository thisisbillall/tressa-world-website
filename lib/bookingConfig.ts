// Client-safe surface for per-venue booking configuration.
//
// Types, fallback values, and pure helpers live here so client components
// (notably app/booking/BookingClient.tsx) can import them without dragging
// `pg` into the browser bundle. DB fetchers live in lib/bookingConfigDb.ts —
// import that ONLY from server routes / server libs.

import {
  BOOKING_CODE_GRACE_MIN,
  BOOKING_DISCOUNT_PERCENT,
  BOOKING_END_HHMM,
  BOOKING_FEE_INR,
  BOOKING_START_HHMM,
  BOOKING_STEP_MIN,
  formatBookingTime,
  PRIORITY_WINDOWS,
} from './venueConfig';

export type BookingVenue = 'bar' | 'restaurant' | 'rooftop' | 'suite';

export type PriorityWindow = { label: string; start: string; end: string };

export type BookingConfig = {
  venue: BookingVenue;
  booking_fee_inr: number;
  discount_percent: number;
  start_hhmm: string;
  end_hhmm: string;
  step_min: number;
  code_grace_min: number;
  enabled: boolean;
  disabled_reason: string | null;
  priority_windows: PriorityWindow[];
};

export const FALLBACK_CONFIG: BookingConfig = {
  venue: 'restaurant',
  booking_fee_inr: BOOKING_FEE_INR,
  discount_percent: BOOKING_DISCOUNT_PERCENT,
  start_hhmm: BOOKING_START_HHMM,
  end_hhmm: BOOKING_END_HHMM,
  step_min: BOOKING_STEP_MIN,
  code_grace_min: BOOKING_CODE_GRACE_MIN,
  enabled: true,
  disabled_reason: null,
  priority_windows: PRIORITY_WINDOWS,
};

export function normaliseWindows(raw: unknown): PriorityWindow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((w) => w && typeof w === 'object')
    .map((w: any) => ({
      label: String(w.label ?? `${w.start ?? ''}–${w.end ?? ''}`),
      start: String(w.start ?? ''),
      end: String(w.end ?? ''),
    }))
    .filter((w) => w.start && w.end);
}

export function normaliseConfigRow(row: any): BookingConfig {
  return {
    venue: row.venue,
    booking_fee_inr: Number(row.booking_fee_inr) || 0,
    discount_percent: Number(row.discount_percent) || 0,
    start_hhmm: String(row.start_hhmm),
    end_hhmm: String(row.end_hhmm),
    step_min: Number(row.step_min) || BOOKING_STEP_MIN,
    code_grace_min: Number(row.code_grace_min) || 0,
    enabled: !!row.enabled,
    disabled_reason: row.disabled_reason ?? null,
    priority_windows: normaliseWindows(row.priority_windows),
  };
}

// Pure config-driven helpers. Mirror the static helpers in venueConfig.ts
// but parameterised on a config object.

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

const HHMM_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;

export function isPriorityTimeFor(
  cfg: Pick<BookingConfig, 'priority_windows'>,
  hhmm: string | null | undefined,
): boolean {
  if (!hhmm) return false;
  const m = toMinutes(hhmm.slice(0, 5));
  return cfg.priority_windows.some(
    (w) => m >= toMinutes(w.start) && m <= toMinutes(w.end),
  );
}

export function isValidBookingTimeFor(
  cfg: Pick<BookingConfig, 'start_hhmm' | 'end_hhmm' | 'step_min'>,
  hhmm: string | null | undefined,
): boolean {
  if (!hhmm || !HHMM_RE.test(hhmm)) return false;
  const m = toMinutes(hhmm);
  if (m < toMinutes(cfg.start_hhmm) || m > toMinutes(cfg.end_hhmm)) return false;
  const step = Math.max(1, cfg.step_min);
  return m % step === 0;
}

export function listBookingTimesFor(
  cfg: Pick<BookingConfig, 'start_hhmm' | 'end_hhmm' | 'step_min' | 'priority_windows'>,
): { value: string; label: string; priority: boolean }[] {
  const out: { value: string; label: string; priority: boolean }[] = [];
  const start = toMinutes(cfg.start_hhmm);
  const end = toMinutes(cfg.end_hhmm);
  const step = Math.max(1, cfg.step_min);
  for (let m = start; m <= end; m += step) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const value = `${hh}:${mm}`;
    out.push({ value, label: formatBookingTime(value), priority: isPriorityTimeFor(cfg, value) });
  }
  return out;
}

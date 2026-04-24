// Shared booking helpers: validation, nights math, suite lookup.

import { queryOne } from './db';

export type VenueChargeRow = {
  venue: string;
  price_per_person: string | number;
  description: string | null;
};

export async function findVenueCharge(venue: string): Promise<number> {
  const row = await queryOne<VenueChargeRow>(
    `SELECT venue, price_per_person
       FROM venue_charges
      WHERE venue = $1 AND is_active = TRUE`,
    [venue],
  );
  return row ? Number(row.price_per_person) || 0 : 0;
}

export type VenueKey = 'bar' | 'restaurant' | 'rooftop' | 'suite';

export type BookingInput = {
  venue: VenueKey;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  notes?: string;
  // non-suite
  reservation_date?: string;
  reservation_time?: string;
  guests?: number;
  table_ref?: string; // T-code clicked in 3D scene
  slot_id?: string;   // lunch|tea|dinner|night
  // suite
  suite_id?: string;
  suite_name?: string;
  check_in?: string;
  check_out?: string;
};

export type SuiteRow = {
  id: string;
  slug: string;
  name: string;
  price_per_night: string | number;
  max_guests: number;
  is_active: boolean;
};

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Look up a suite by id first (preferred) or by name.
export async function findSuite(input: {
  suite_id?: string;
  suite_name?: string;
}): Promise<SuiteRow | null> {
  if (input.suite_id) {
    return queryOne<SuiteRow>(
      `SELECT id, slug, name, price_per_night, max_guests, is_active
         FROM suites WHERE id = $1 AND is_active = TRUE`,
      [input.suite_id],
    );
  }
  if (input.suite_name) {
    return queryOne<SuiteRow>(
      `SELECT id, slug, name, price_per_night, max_guests, is_active
         FROM suites
        WHERE is_active = TRUE
          AND (LOWER(name) = LOWER($1) OR LOWER(slug) = LOWER($1))
        LIMIT 1`,
      [input.suite_name],
    );
  }
  return null;
}

export function validateBooking(input: BookingInput): string | null {
  if (!input.customer_name?.trim()) return 'Name is required';
  if (!input.customer_phone?.trim()) return 'Phone is required';
  if (!input.customer_email?.trim()) return 'Email is required';
  if (!['bar', 'restaurant', 'rooftop', 'suite'].includes(input.venue)) return 'Invalid venue';

  if (input.venue === 'suite') {
    if (!input.suite_id && !input.suite_name) return 'Suite is required';
    if (!input.check_in || !input.check_out) return 'Check-in and check-out are required';
    if (nightsBetween(input.check_in, input.check_out) < 1) return 'Check-out must be after check-in';
  } else {
    if (!input.reservation_date) return 'Date is required';
    if (!input.reservation_time) return 'Time is required';
    if (!input.guests || input.guests < 1) return 'Guests is required';
  }
  return null;
}

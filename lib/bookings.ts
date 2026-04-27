// Shared booking helpers: validation, nights math, suite lookup, cleanup.

import { pool, queryOne } from './db';
import { SKY_TABLES } from './layouts/sky';
import { UNWIND_TABLES } from './layouts/unwind';
import { SOUL_TABLES } from './layouts/soul';
import type { Table } from './venueTypes';

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

// Look up a table's seat count from the static layout files by its display label
// ("F-1", "R-4", "L-6", …). Used server-side to compute is_special from guests.
// Prefixes match the POS's restaurant_tables.table_name convention:
//   F-* = Soul (family restaurant) · L-* = Unwind (lounge/bar) · R-* = Sky (rooftop)
const TABLES_BY_VENUE: Record<'bar' | 'restaurant' | 'rooftop', Table[]> = {
  bar: UNWIND_TABLES,
  restaurant: SOUL_TABLES,
  rooftop: SKY_TABLES,
};

export function findTableSeats(venue: VenueKey, tableRef?: string | null): number | null {
  if (venue === 'suite' || !tableRef) return null;
  const tables = TABLES_BY_VENUE[venue];
  const match = tables?.find((t) => t.label === tableRef);
  return match ? match.seats : null;
}

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

// Sweep abandoned bookings: when a guest opens checkout, an INSERT lands
// with status='pending' + payment_status='pending' before they pay. If they
// close the tab and never finish, that row sits forever and (for tables)
// holds the unique-slot lock so no one else can rebook.
//
// This sweep deletes any pending or cancelled booking older than the cutoff
// — but ONLY when nothing was actually paid for it. Paid-then-cancelled
// rows are kept because they may still owe a refund.
//
// Returns the count deleted; never throws (caller doesn't care).
export async function cleanupStaleBookings(maxAgeMinutes = 5): Promise<number> {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM bookings
        WHERE status IN ('pending', 'cancelled')
          AND payment_status NOT IN ('paid', 'refunded')
          AND created_at < NOW() - ($1 || ' minutes')::interval`,
      [String(maxAgeMinutes)],
    );
    return rowCount ?? 0;
  } catch (e) {
    console.error('[cleanupStaleBookings]', e);
    return 0;
  }
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

    // Seat-aware minimum: a 6-seat table needs at least 5 guests.
    // (No hard upper cap — oversized parties are accepted and flagged as
    //  is_special by the POST route.)
    const seats = findTableSeats(input.venue, input.table_ref);
    if (seats != null) {
      const minGuests = Math.max(1, seats - 1);
      if (input.guests < minGuests) {
        return `This table seats ${seats}. Minimum ${minGuests} guest${minGuests > 1 ? 's' : ''} required.`;
      }
    }
  }
  return null;
}

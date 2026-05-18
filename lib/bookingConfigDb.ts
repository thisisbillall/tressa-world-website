// Server-only DB fetchers for booking_config.
//
// Anything that imports this file pulls in `pg` via ./db, so it must NEVER be
// imported from a client component. Use lib/bookingConfig.ts (types + pure
// helpers) on the client side instead.

import { queryMany, queryOne } from './db';
import {
  normaliseConfigRow,
  type BookingConfig,
  type BookingVenue,
} from './bookingConfig';

const SELECT_COLS = `
  venue, booking_fee_inr, discount_percent, start_hhmm, end_hhmm,
  step_min, code_grace_min, enabled, disabled_reason, priority_windows
`;

export async function getBookingConfig(venue: BookingVenue): Promise<BookingConfig | null> {
  const row = await queryOne<any>(
    `SELECT ${SELECT_COLS} FROM booking_config WHERE venue = $1`,
    [venue],
  );
  return row ? normaliseConfigRow(row) : null;
}

export async function listBookingConfigs(): Promise<BookingConfig[]> {
  const rows = await queryMany<any>(
    `SELECT ${SELECT_COLS} FROM booking_config ORDER BY venue ASC`,
  );
  return rows.map(normaliseConfigRow);
}

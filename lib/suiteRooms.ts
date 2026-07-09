// Suite-rooms domain helpers. Kept entirely separate from the dining booking
// code so the two flows never entangle. Pricing is always recomputed here from
// the DB row — the client's numbers are display-only and never trusted.

import { pool, queryOne } from './db';

export type SuiteRoom = {
  id: string;
  room_number: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  floor: string | null;
  bed_type: string | null;
  size_sqft: number | null;
  max_guests: number;
  base_price: string | number;
  gst_rate: string | number;
  offer_active: boolean;
  offer_percent: string | number;
  offer_label: string | null;
  amenities: string[];
  images: string[];
  is_active: boolean;
  sort_order: number;
};

export type SuitePricing = {
  perNight: number;      // base per-night (pre-GST, pre-offer)
  nights: number;
  base: number;          // perNight * nights
  offerActive: boolean;
  offerPercent: number;
  discount: number;      // amount knocked off base
  taxable: number;       // base - discount
  gstRate: number;
  gst: number;
  total: number;         // taxable + gst  (what we charge)
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const ms = b.getTime() - a.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Single source of truth for suite money math. Offer (if active) comes off the
// pre-tax subtotal; GST applies to the discounted amount.
export function computeSuitePricing(room: SuiteRoom, nights: number): SuitePricing {
  const perNight = Number(room.base_price) || 0;
  const gstRate = Number(room.gst_rate) || 0;
  const offerActive = !!room.offer_active;
  const offerPercent = offerActive ? Number(room.offer_percent) || 0 : 0;

  const base = round2(perNight * nights);
  const discount = round2(base * (offerPercent / 100));
  const taxable = round2(base - discount);
  const gst = round2(taxable * (gstRate / 100));
  const total = round2(taxable + gst);

  return { perNight, nights, base, offerActive, offerPercent, discount, taxable, gstRate, gst, total };
}

const ROOM_COLUMNS = `
  id, room_number, name, subtitle, description, floor, bed_type, size_sqft,
  max_guests, base_price, gst_rate, offer_active, offer_percent, offer_label,
  amenities, images, is_active, sort_order`;

export async function listActiveSuiteRooms(): Promise<SuiteRoom[]> {
  const { rows } = await pool.query<SuiteRoom>(
    `SELECT ${ROOM_COLUMNS}
       FROM suite_rooms
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, room_number ASC`,
  );
  return rows;
}

export async function getSuiteRoomById(id: string): Promise<SuiteRoom | null> {
  return queryOne<SuiteRoom>(
    `SELECT ${ROOM_COLUMNS} FROM suite_rooms WHERE id = $1 AND is_active = TRUE`,
    [id],
  );
}

export type SuiteBookingInput = {
  room_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  check_in: string;
  check_out: string;
  guests?: number;
  notes?: string;
};

export function validateSuiteBooking(input: SuiteBookingInput): string | null {
  if (!input.room_id) return 'Please select a room';
  if (!input.customer_name?.trim()) return 'Name is required';
  if (!input.customer_phone?.trim()) return 'Phone is required';
  if (!/^\+?[0-9\s-]{7,15}$/.test(input.customer_phone.trim())) return 'Enter a valid phone number';
  if (!input.check_in || !input.check_out) return 'Check-in and check-out dates are required';
  if (nightsBetween(input.check_in, input.check_out) < 1) return 'Check-out must be after check-in';
  return null;
}

// Sweep abandoned suite holds: a pending, unpaid row left behind when a guest
// closes the Razorpay popup would otherwise keep the room's dates locked.
export async function cleanupStaleSuiteBookings(maxAgeMinutes = 15): Promise<number> {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM suite_bookings
        WHERE status IN ('pending','cancelled')
          AND payment_status NOT IN ('paid','refunded')
          AND created_at < NOW() - ($1 || ' minutes')::interval`,
      [String(maxAgeMinutes)],
    );
    return rowCount ?? 0;
  } catch (e) {
    console.error('[cleanupStaleSuiteBookings]', e);
    return 0;
  }
}

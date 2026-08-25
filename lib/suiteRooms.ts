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
  // Set from the management app. A room can be listed here but not sellable:
  // the card still shows, without a price or a Book Now button.
  booking_enabled: boolean;
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
  amenities, images, is_active, booking_enabled, sort_order`;

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
    `SELECT ${ROOM_COLUMNS} FROM suite_rooms
      WHERE id = $1 AND is_active = TRUE AND booking_enabled = TRUE`,
    [id],
  );
}

export type RoomWithFree = SuiteRoom & { is_free: boolean };

// Every active room, each flagged free/taken for the given date range. When no
// dates are passed, all rooms count as free (used for the plain listing).
export async function getRoomsWithAvailability(checkIn?: string, checkOut?: string): Promise<RoomWithFree[]> {
  if (checkIn && checkOut && nightsBetween(checkIn, checkOut) >= 1) {
    const { rows } = await pool.query<RoomWithFree>(
      `SELECT r.id, r.room_number, r.name, r.subtitle, r.description, r.floor, r.bed_type,
              r.size_sqft, r.max_guests, r.base_price, r.gst_rate, r.offer_active,
              r.offer_percent, r.offer_label, r.amenities, r.images, r.is_active,
              r.booking_enabled, r.sort_order,
              NOT EXISTS (
                SELECT 1 FROM suite_bookings b
                 WHERE b.room_id = r.id
                   AND b.status IN ('pending','confirmed')
                   AND daterange(b.check_in, b.check_out, '[)') && daterange($1, $2, '[)')
              ) AS is_free
         FROM suite_rooms r
        WHERE r.is_active = TRUE
        ORDER BY r.sort_order ASC, r.room_number ASC`,
      [checkIn, checkOut],
    );
    return rows;
  }
  const rooms = await listActiveSuiteRooms();
  return rooms.map((r) => ({ ...r, is_free: true }));
}

// A booking "type" (Grand / Celebration / Delight) aggregated from its rooms.
export type SuiteType = {
  name: string;
  subtitle: string | null;
  description: string | null;
  images: string[];
  amenities: string[];
  base_price: number;
  gst_rate: number;
  max_guests: number;
  offer_active: boolean;
  offer_percent: number;
  offer_label: string | null;
  total_rooms: number;
  available_rooms: number;
  // False when the management app has paused sales for this type.
  booking_enabled: boolean;
};

// Group rooms by name into the customer-facing types, preserving the order in
// which the first room of each type appears (already sorted by sort_order).
export function aggregateSuiteTypes(rooms: RoomWithFree[]): SuiteType[] {
  const order: string[] = [];
  const byName = new Map<string, RoomWithFree[]>();
  for (const r of rooms) {
    if (!byName.has(r.name)) { byName.set(r.name, []); order.push(r.name); }
    byName.get(r.name)!.push(r);
  }
  return order.map((name) => {
    const group = byName.get(name)!;
    const rep = group[0];
    // Type offer = the best (highest) offer configured on any room of the type.
    let offerPercent = 0, offerLabel: string | null = null;
    for (const r of group) {
      const pct = r.offer_active ? Number(r.offer_percent) || 0 : 0;
      if (pct > offerPercent) { offerPercent = pct; offerLabel = r.offer_label; }
    }
    return {
      name,
      subtitle: rep.subtitle,
      description: rep.description,
      images: rep.images?.length ? rep.images : [],
      amenities: rep.amenities || [],
      base_price: Number(rep.base_price) || 0,
      gst_rate: Number(rep.gst_rate) || 0,
      max_guests: Math.max(...group.map((r) => r.max_guests)),
      offer_active: offerPercent > 0,
      offer_percent: offerPercent,
      offer_label: offerLabel,
      total_rooms: group.length,
      // A paused room is never offered, however free its dates are.
      available_rooms: group.filter((r) => r.is_free && r.booking_enabled).length,
      booking_enabled: group.some((r) => r.booking_enabled),
    };
  });
}

// Per-room charge for a type booking (base + type offer + GST), for `nights`.
export function computeTypeCharge(base: number, gstRate: number, offerPercent: number, nights: number) {
  const baseAmt = round2(base * nights);
  const discount = round2(baseAmt * (offerPercent / 100));
  const taxable = round2(baseAmt - discount);
  const gst = round2(taxable * (gstRate / 100));
  const total = round2(taxable + gst);
  return { base: baseAmt, discount, gstRate, gst, total };
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
  if (input.customer_phone.replace(/\D/g, '').length !== 10) return 'Enter a valid 10-digit phone number';
  if (!input.check_in || !input.check_out) return 'Check-in and check-out dates are required';
  if (nightsBetween(input.check_in, input.check_out) < 1) return 'Check-out must be after check-in';
  return null;
}

// Sweep abandoned suite holds: a pending, unpaid row left behind when a guest
// closes the Razorpay popup would otherwise keep the room's dates locked.
export async function cleanupStaleSuiteBookings(maxAgeMinutes = 15): Promise<number> {
  try {
    // Reception "pay by SMS link" holds (booking_source='reception-link') get a
    // longer grace so a guest paying from the SMS link is never swept
    // mid-payment (which would orphan a captured payment). Public web holds keep
    // the normal short window.
    const { rowCount } = await pool.query(
      `DELETE FROM suite_bookings
        WHERE status IN ('pending','cancelled')
          AND payment_status NOT IN ('paid','refunded')
          AND created_at < NOW() - (
            (CASE WHEN booking_source = 'reception-link' THEN '20' ELSE $1 END) || ' minutes'
          )::interval`,
      [String(maxAgeMinutes)],
    );
    return rowCount ?? 0;
  } catch (e) {
    console.error('[cleanupStaleSuiteBookings]', e);
    return 0;
  }
}

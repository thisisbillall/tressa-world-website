-- Adds the explicit expiry timestamp for the booking QR / discount code.
-- Set by the API on insert to: (reservation_date + slot_start) + 15 minutes.
-- The POS reads this column at scan time to decide whether the discount applies.
--
--   psql "$DATABASE_URL" -f sql/009_booking_code_expiry.sql

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_code_expires_at
  ON bookings (code_expires_at)
  WHERE code_expires_at IS NOT NULL;

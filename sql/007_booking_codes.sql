-- Booking codes: a short TW-XXXXXX string SMS'd to the customer after a
-- successful booking. Presented at the venue for an instant 15% off the
-- dine-in bill (redemption happens in the production POS app, which reads
-- this same table via its DATABASE_URL).
--
--   psql "$DATABASE_URL" -f sql/007_booking_codes.sql

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_code     TEXT,
  ADD COLUMN IF NOT EXISTS sms_sent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS code_redeemed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS code_redeemed_by TEXT;

-- Partial unique so NULLs don't collide (constraint only applies to real codes).
CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_code_unique
  ON bookings (booking_code)
  WHERE booking_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_code_redeemed
  ON bookings (code_redeemed_at)
  WHERE code_redeemed_at IS NOT NULL;

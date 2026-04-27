-- Flag bookings where guests exceed the table's seat count.
-- Manager workflow uses this to prep extra chairs / merge tables.
-- Pricing is unchanged: amount still = price_per_person × guests.
--
--   psql "$DATABASE_URL" -f sql/006_special_bookings.sql

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_special BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_is_special
  ON bookings (is_special)
  WHERE is_special = TRUE;

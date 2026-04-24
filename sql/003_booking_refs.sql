-- Adds 3D-scene refs to bookings:
--   table_ref   — the T-code user clicked (e.g. "T12b")
--   slot_id     — which 3-hour window (lunch|tea|dinner|night)
--
--   psql "$DATABASE_URL" -f sql/003_booking_refs.sql

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS table_ref TEXT,
  ADD COLUMN IF NOT EXISTS slot_id   TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings (venue, reservation_date, slot_id);

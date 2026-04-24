-- Prevent concurrent double-bookings at the database layer.
-- Run once:  psql "$DATABASE_URL" -f sql/005_booking_uniqueness.sql

-- Needed for the GIST exclusion constraint on suite overlaps.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------------
-- Tables (bar / restaurant / rooftop): one active booking per
-- (venue, date, slot, table_ref). Active = pending or confirmed.
-- Cancelled / completed rows don't hold the slot.
-- ------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS bookings_table_slot_unique
  ON bookings (venue, reservation_date, slot_id, table_ref)
  WHERE status IN ('pending','confirmed')
    AND table_ref IS NOT NULL;

-- ------------------------------------------------------------------
-- Suites: no overlapping active stays for the same suite.
-- `daterange(..., '[)')` is half-open, so 01->02 and 02->03 don't collide.
-- ------------------------------------------------------------------
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_suite_nooverlap;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_suite_nooverlap
  EXCLUDE USING gist (
    suite_name WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  )
  WHERE (venue = 'suite'
         AND status IN ('pending','confirmed')
         AND suite_name IS NOT NULL
         AND check_in IS NOT NULL
         AND check_out IS NOT NULL);

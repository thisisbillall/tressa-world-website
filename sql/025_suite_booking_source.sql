-- Records how a suite booking was created. NULL / 'web' = public site,
-- 'reception-link' = staff-created "pay by SMS link" (gets a longer hold in
-- cleanupStaleSuiteBookings). Nullable so the public flow, which doesn't set it,
-- is unaffected.
--   node scripts/run-migration.mjs sql/025_suite_booking_source.sql

ALTER TABLE suite_bookings ADD COLUMN IF NOT EXISTS booking_source TEXT;
CREATE INDEX IF NOT EXISTS idx_suite_bookings_source ON suite_bookings (booking_source);

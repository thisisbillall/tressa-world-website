-- Actual arrival/departure timestamps, set by your webapp when staff check a
-- guest in/out (e.g. after scanning the invoice QR at reception).
--   node scripts/run-migration.mjs sql/024_suite_checkin.sql

ALTER TABLE suite_bookings ADD COLUMN IF NOT EXISTS checked_in_at  TIMESTAMPTZ;
ALTER TABLE suite_bookings ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ;

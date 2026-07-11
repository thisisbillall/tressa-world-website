-- Track confirmation-SMS delivery for suite bookings so the two confirm paths
-- (/verify and the webhook) never send two texts for the same booking.
--   node scripts/run-migration.mjs sql/014_suite_sms.sql

ALTER TABLE suite_bookings ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ;
ALTER TABLE suite_bookings ADD COLUMN IF NOT EXISTS invoice_url TEXT;

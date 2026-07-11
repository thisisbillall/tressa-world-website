-- Multi-room bookings: several rooms reserved together share one Razorpay
-- payment, one invoice and one SMS. Each room is still its own row (so the
-- no-overlap constraint keeps working); they're tied together by group_id.
--   node scripts/run-migration.mjs sql/021_suite_booking_groups.sql

ALTER TABLE suite_bookings ADD COLUMN IF NOT EXISTS group_id  UUID;
ALTER TABLE suite_bookings ADD COLUMN IF NOT EXISTS group_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_suite_bookings_group     ON suite_bookings (group_id);
CREATE INDEX IF NOT EXISTS idx_suite_bookings_group_ref ON suite_bookings (group_ref);

-- Backfill existing single-room rows so every booking belongs to a group
-- (a group of one). Keeps the invoice/SMS code path uniform.
UPDATE suite_bookings
   SET group_id  = COALESCE(group_id, id),
       group_ref = COALESCE(group_ref, booking_code)
 WHERE group_id IS NULL OR group_ref IS NULL;

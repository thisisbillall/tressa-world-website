-- Booking refunds: when a guest prepays at booking time (bookings.amount)
-- and their actual dine-in bill comes in below that amount, the difference
-- is owed back to them. The POS (tressa-production-webapp) writes the
-- refund_amount here when the bill is submitted; a manager then processes
-- the Razorpay refund and flips refund_status → 'processed'.
--
--   psql "$DATABASE_URL" -f sql/008_booking_refunds.sql

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refund_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status       TEXT          NOT NULL DEFAULT 'none'
                             CHECK (refund_status IN ('none','pending','processing','processed','failed')),
  ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_processed_by TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_refund_id  TEXT,
  ADD COLUMN IF NOT EXISTS refund_error        TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_refund_pending
  ON bookings (refund_status)
  WHERE refund_status IN ('pending','processing','failed');

-- Per-venue cover charge. ONLY Sky (rooftop) has a cover charge — it is
-- collected at the venue and added to the guest's menu bill, NOT collected
-- at booking time. The ₹99 booking-charge (BOOKING_FEE_INR) is separate
-- and is the only thing charged via Razorpay during reservation.
--
-- Soul (restaurant) and Unwind (bar) do not have a cover charge.
--
--   psql "$DATABASE_URL" -f sql/004_venue_charges.sql

CREATE TABLE IF NOT EXISTS venue_charges (
  venue            TEXT PRIMARY KEY CHECK (venue IN ('bar','restaurant','rooftop','suite')),
  price_per_person NUMERIC(12,2) NOT NULL DEFAULT 0,
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_venue_charges_updated_at ON venue_charges;
CREATE TRIGGER trg_venue_charges_updated_at
  BEFORE UPDATE ON venue_charges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_notify_venue_charges ON venue_charges;
CREATE TRIGGER trg_notify_venue_charges
  AFTER INSERT OR UPDATE OR DELETE ON venue_charges
  FOR EACH ROW EXECUTE FUNCTION notify_db_changes();

-- Cleanup of any prior seeds where Soul / Unwind also carried a cover charge.
DELETE FROM venue_charges WHERE venue IN ('bar', 'restaurant');

-- Seed Sky only. Tune the amount as needed; this is the per-guest cover
-- charge added to the menu bill at the venue, not collected at booking.
INSERT INTO venue_charges (venue, price_per_person, description) VALUES
  ('rooftop', 1000, 'Sky cover charge per guest — added to your menu bill at the venue')
ON CONFLICT (venue) DO UPDATE
  SET price_per_person = EXCLUDED.price_per_person,
      description      = EXCLUDED.description,
      is_active        = TRUE;

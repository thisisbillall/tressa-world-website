-- Per-venue cover charge. Booking total = price_per_person × guests.
-- Edit rows directly in the DB to change pricing — the booking form
-- auto-refreshes via SSE (NOTIFY trigger fires on any change).
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

-- Seed. Tune these numbers to taste.
INSERT INTO venue_charges (venue, price_per_person, description) VALUES
  ('rooftop',    1000, 'Sky terrace cover charge per guest'),
  ('bar',        750, 'Bar seating cover charge per guest'),
  ('restaurant', 750, 'Restaurant seating reservation fee per guest')
ON CONFLICT (venue) DO NOTHING;

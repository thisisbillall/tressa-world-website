-- Run after 001_bookings.sql:
--   psql "$DATABASE_URL" -f sql/002_suites.sql

CREATE TABLE IF NOT EXISTS suites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  tag              TEXT,
  floor            TEXT,
  description      TEXT,
  price_per_night  NUMERIC(12,2) NOT NULL,
  max_guests       INT NOT NULL DEFAULT 2,
  features         TEXT[] NOT NULL DEFAULT '{}',
  image            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suites_active_sort ON suites (is_active, sort_order);

DROP TRIGGER IF EXISTS trg_suites_updated_at ON suites;
CREATE TRIGGER trg_suites_updated_at
  BEFORE UPDATE ON suites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_notify_suites ON suites;
CREATE TRIGGER trg_notify_suites
  AFTER INSERT OR UPDATE OR DELETE ON suites
  FOR EACH ROW EXECUTE FUNCTION notify_db_changes();

-- Seed with the current suite lineup. Prices may be edited directly in DB
-- and the booking form auto-updates via SSE.
INSERT INTO suites (slug, name, tag, floor, description, price_per_night, max_guests, features, image, sort_order)
VALUES
  ('royal',    'The Royal Suite', 'Signature', 'Floor 2', 'A 1,200 sq.ft haven with private terrace and sunken tub.', 28000, 4, ARRAY['King Bed','Terrace','Butler'], '/images/cave-dining.jpg',      1),
  ('garden',   'Garden Suite',    'Premium',   'Floor 1', 'Verdant private garden with indoor-outdoor living.',       18500, 3, ARRAY['Garden','Spa Tub'],           '/images/rooftop-terrace.jpg',  2),
  ('heritage', 'Heritage Suite',  'Classic',   'Floor 2', 'Old-world charm meets modern comfort.',                    14200, 2, ARRAY['Courtyard','Library'],        '/images/private-dining.jpg',   3)
ON CONFLICT (slug) DO NOTHING;

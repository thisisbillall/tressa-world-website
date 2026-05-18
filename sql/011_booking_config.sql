-- Per-venue booking configuration. Owns everything the booking page used to
-- read from static venueConfig.ts constants: reservation fee, discount %,
-- bookable window + step, code grace, enabled flag (master switch per venue),
-- and the priority windows that unlock the discount.
--
--   psql "$DATABASE_URL" -f sql/011_booking_config.sql

CREATE TABLE IF NOT EXISTS booking_config (
  venue              TEXT PRIMARY KEY CHECK (venue IN ('bar','restaurant','rooftop','suite')),

  booking_fee_inr    INTEGER NOT NULL DEFAULT 99
                       CHECK (booking_fee_inr >= 0 AND booking_fee_inr <= 1000000),

  discount_percent   INTEGER NOT NULL DEFAULT 15
                       CHECK (discount_percent >= 0 AND discount_percent <= 100),

  -- HH:MM (24h). end_hhmm may be '24:00' to represent end-of-day.
  start_hhmm         TEXT NOT NULL DEFAULT '15:00'
                       CHECK (start_hhmm ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_hhmm           TEXT NOT NULL DEFAULT '23:00'
                       CHECK (end_hhmm ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR end_hhmm = '24:00'),

  step_min           INTEGER NOT NULL DEFAULT 15
                       CHECK (step_min IN (5,10,15,20,30,60)),

  code_grace_min     INTEGER NOT NULL DEFAULT 15
                       CHECK (code_grace_min >= 0 AND code_grace_min <= 360),

  enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  disabled_reason    TEXT,

  -- JSON array of { label, start, end } objects. Times in HH:MM. Endpoints
  -- inclusive: a booking_time exactly equal to start or end qualifies.
  priority_windows   JSONB NOT NULL DEFAULT '[]'::jsonb,

  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_booking_config_updated_at ON booking_config;
CREATE TRIGGER trg_booking_config_updated_at
  BEFORE UPDATE ON booking_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_notify_booking_config ON booking_config;
CREATE TRIGGER trg_notify_booking_config
  AFTER INSERT OR UPDATE OR DELETE ON booking_config
  FOR EACH ROW EXECUTE FUNCTION notify_db_changes();

-- Seed all four venues with the values that used to live in lib/venueConfig.ts.
-- Sky (rooftop) and Aura (suite) start disabled to match the current UI.
INSERT INTO booking_config (
  venue, booking_fee_inr, discount_percent,
  start_hhmm, end_hhmm, step_min, code_grace_min,
  enabled, disabled_reason, priority_windows
) VALUES
  ('restaurant', 99, 15, '15:00', '23:00', 15, 15, TRUE,  NULL,
    '[
      {"label":"3:00 PM – 7:00 PM",   "start":"15:00","end":"19:00"},
      {"label":"10:00 PM – 11:00 PM", "start":"22:00","end":"23:00"}
    ]'::jsonb),
  ('bar',        99, 15, '15:00', '23:00', 15, 15, TRUE,  NULL,
    '[
      {"label":"3:00 PM – 7:00 PM",   "start":"15:00","end":"19:00"},
      {"label":"10:00 PM – 11:00 PM", "start":"22:00","end":"23:00"}
    ]'::jsonb),
  ('rooftop',    99, 15, '15:00', '23:00', 15, 15, FALSE,
    'Sky is temporarily closed. Please check back soon.',
    '[
      {"label":"3:00 PM – 7:00 PM",   "start":"15:00","end":"19:00"},
      {"label":"10:00 PM – 11:00 PM", "start":"22:00","end":"23:00"}
    ]'::jsonb),
  ('suite',      0,  0,  '15:00', '23:00', 15, 15, FALSE,
    'Aura suite booking opens soon. Stay tuned.',
    '[]'::jsonb)
ON CONFLICT (venue) DO NOTHING;

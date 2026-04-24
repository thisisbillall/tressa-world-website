-- Run this once against your Postgres database.
--   psql "$DATABASE_URL" -f sql/001_bookings.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------
-- bookings
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- who
  customer_name        TEXT NOT NULL,
  customer_phone       TEXT NOT NULL,
  customer_email       TEXT NOT NULL,

  -- what
  venue                TEXT NOT NULL CHECK (venue IN ('bar','restaurant','rooftop','suite')),

  -- reservation fields (bar / restaurant / rooftop)
  reservation_date     DATE,
  reservation_time     TIME,
  guests               INT,

  -- suite fields
  suite_name           TEXT,
  check_in             DATE,
  check_out            DATE,
  nights               INT,

  -- common
  notes                TEXT,

  -- payment (suite only; free venues = 'not_required')
  amount               NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status       TEXT NOT NULL DEFAULT 'not_required'
                         CHECK (payment_status IN ('not_required','pending','paid','failed','refunded')),
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  razorpay_signature   TEXT,

  -- manager workflow
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','confirmed','cancelled','completed')),

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_venue      ON bookings (venue);
CREATE INDEX IF NOT EXISTS idx_bookings_rzp_order  ON bookings (razorpay_order_id);

-- updated_at bump
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------
-- LISTEN/NOTIFY broadcast (mirrors tressa-production-webapp)
-- SSE route listens on channel 'db_changes' and forwards to browsers.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_db_changes() RETURNS TRIGGER AS $$
DECLARE
  rec_new JSONB := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  rec_old JSONB := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
BEGIN
  PERFORM pg_notify(
    'db_changes',
    json_build_object(
      'table',  TG_TABLE_NAME,
      'action', TG_OP,
      'id',     COALESCE(
                  rec_new->>'id',    rec_old->>'id',
                  rec_new->>'venue', rec_old->>'venue'
                )
    )::text
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_bookings ON bookings;
CREATE TRIGGER trg_notify_bookings
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION notify_db_changes();

-- Dedicated, self-contained schema for the Suites product.
-- Completely separate from the dining `bookings` / `suites` tables.
--   psql "$DATABASE_URL" -f sql/013_suite_rooms.sql
--
-- Two tables:
--   suite_rooms     — the room master. YOUR WEBAPP owns this: it sets base
--                     price, GST rate, which rooms carry an offer and by how
--                     much, images, amenities, and can take a room offline.
--   suite_bookings  — one row per reservation. The website writes these; your
--                     webapp reads them to manage stays, payments and refunds.
--
-- Pricing is always computed server-side from suite_rooms at booking time, so
-- whatever your webapp sets is the source of truth — the browser can't tamper.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------------
-- suite_rooms (master — managed from your webapp)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suite_rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number    TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  subtitle       TEXT,
  description    TEXT,
  floor          TEXT,
  bed_type       TEXT,
  size_sqft      INT,
  max_guests     INT NOT NULL DEFAULT 2,

  -- Pricing (webapp-managed). base_price is per-night, PRE-GST.
  base_price     NUMERIC(12,2) NOT NULL DEFAULT 4000,
  gst_rate       NUMERIC(5,2)  NOT NULL DEFAULT 12,

  -- Offer (webapp-managed). When offer_active, offer_percent is knocked off the
  -- room subtotal before GST. Only a few rooms carry offers at a time.
  offer_active   BOOLEAN NOT NULL DEFAULT FALSE,
  offer_percent  NUMERIC(5,2) NOT NULL DEFAULT 0
                   CHECK (offer_percent >= 0 AND offer_percent <= 100),
  offer_label    TEXT,

  amenities      TEXT[] NOT NULL DEFAULT '{}',
  images         TEXT[] NOT NULL DEFAULT '{}',

  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suite_rooms_active_sort ON suite_rooms (is_active, sort_order);

-- ------------------------------------------------------------------
-- suite_bookings (reservations — written by the website)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suite_bookings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code         TEXT UNIQUE NOT NULL,

  room_id              UUID NOT NULL REFERENCES suite_rooms(id),
  room_number          TEXT NOT NULL,   -- snapshot at booking time
  room_name            TEXT NOT NULL,   -- snapshot at booking time

  customer_name        TEXT NOT NULL,
  customer_phone       TEXT NOT NULL,
  customer_email       TEXT,

  check_in             DATE NOT NULL,
  check_out            DATE NOT NULL,
  nights               INT  NOT NULL,
  guests               INT  NOT NULL DEFAULT 1,

  -- Money snapshot (all pre-computed server-side, in INR).
  base_amount          NUMERIC(12,2) NOT NULL,   -- base_price * nights (pre-discount, pre-GST)
  discount_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_rate             NUMERIC(5,2)  NOT NULL DEFAULT 12,
  gst_amount           NUMERIC(12,2) NOT NULL,
  total_amount         NUMERIC(12,2) NOT NULL,   -- what Razorpay actually charges

  payment_status       TEXT NOT NULL DEFAULT 'pending'
                         CHECK (payment_status IN ('pending','paid','failed','refunded')),
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  razorpay_signature   TEXT,

  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','confirmed','cancelled','completed')),

  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suite_bookings_created  ON suite_bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suite_bookings_room     ON suite_bookings (room_id);
CREATE INDEX IF NOT EXISTS idx_suite_bookings_status   ON suite_bookings (status);
CREATE INDEX IF NOT EXISTS idx_suite_bookings_rzporder ON suite_bookings (razorpay_order_id);

-- No two active stays may overlap for the same room. Half-open range so a
-- checkout day and the next guest's check-in day don't collide.
ALTER TABLE suite_bookings DROP CONSTRAINT IF EXISTS suite_bookings_nooverlap;
ALTER TABLE suite_bookings
  ADD CONSTRAINT suite_bookings_nooverlap
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  )
  WHERE (status IN ('pending','confirmed'));

-- ------------------------------------------------------------------
-- updated_at bump + live-change notify (reuse the shared functions created
-- by sql/001 and sql/002 so both tables stream to the webapp via SSE).
-- ------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_suite_rooms_updated_at ON suite_rooms;
CREATE TRIGGER trg_suite_rooms_updated_at
  BEFORE UPDATE ON suite_rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_suite_bookings_updated_at ON suite_bookings;
CREATE TRIGGER trg_suite_bookings_updated_at
  BEFORE UPDATE ON suite_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_notify_suite_rooms ON suite_rooms;
CREATE TRIGGER trg_notify_suite_rooms
  AFTER INSERT OR UPDATE OR DELETE ON suite_rooms
  FOR EACH ROW EXECUTE FUNCTION notify_db_changes();

DROP TRIGGER IF EXISTS trg_notify_suite_bookings ON suite_bookings;
CREATE TRIGGER trg_notify_suite_bookings
  AFTER INSERT OR UPDATE OR DELETE ON suite_bookings
  FOR EACH ROW EXECUTE FUNCTION notify_db_changes();

-- ------------------------------------------------------------------
-- Seed: 10 Premium Rooms. base_price ₹4000 + 12% GST. Rooms 103, 107 and 110
-- ship with an example offer so you can see the badges — flip these from your
-- webapp any time. Images are royalty-free Unsplash placeholders; swap freely.
-- ------------------------------------------------------------------
INSERT INTO suite_rooms
  (room_number, name, subtitle, description, floor, bed_type, size_sqft, max_guests,
   base_price, gst_rate, offer_active, offer_percent, offer_label, amenities, images, sort_order)
VALUES
  ('101','Premium Room 101','City-view King','A calm, contemporary retreat with plush king bedding and a rain shower.','Floor 1','King',320,2,
     4000,12,FALSE,0,NULL,
     ARRAY['King Bed','Smart TV','Free Wi-Fi','AC','Rain Shower','Room Service'],
     ARRAY['https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80'],1),
  ('102','Premium Room 102','Garden-view Twin','Twin premium comfort with a serene garden outlook and workspace.','Floor 1','Twin',320,2,
     4000,12,FALSE,0,NULL,
     ARRAY['Twin Beds','Smart TV','Free Wi-Fi','AC','Work Desk','Room Service'],
     ARRAY['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80'],2),
  ('103','Premium Room 103','King Deluxe','An elevated king room with a lounge nook — currently on a limited offer.','Floor 1','King',360,2,
     4000,12,TRUE,15,'Monsoon Special · 15% Off',
     ARRAY['King Bed','Lounge Nook','Smart TV','Free Wi-Fi','AC','Mini Bar'],
     ARRAY['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80'],3),
  ('104','Premium Room 104','City-view King','Warm interiors, blackout drapes and a spa-style bath for deep rest.','Floor 1','King',320,2,
     4000,12,FALSE,0,NULL,
     ARRAY['King Bed','Smart TV','Free Wi-Fi','AC','Bathtub','Room Service'],
     ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1400&q=80'],4),
  ('105','Premium Room 105','Garden-view King','A bright king room opening to greenery, ideal for a slow morning.','Floor 1','King',340,2,
     4000,12,FALSE,0,NULL,
     ARRAY['King Bed','Balcony','Smart TV','Free Wi-Fi','AC','Room Service'],
     ARRAY['https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80'],5),
  ('106','Premium Room 106','City-view Twin','Family-friendly twin layout with generous storage and a reading light.','Floor 2','Twin',320,3,
     4000,12,FALSE,0,NULL,
     ARRAY['Twin Beds','Smart TV','Free Wi-Fi','AC','Work Desk','Room Service'],
     ARRAY['https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80'],6),
  ('107','Premium Room 107','King Deluxe','Our top-floor king deluxe with skyline views — on a seasonal offer.','Floor 2','King',360,2,
     4000,12,TRUE,20,'Weekday Escape · 20% Off',
     ARRAY['King Bed','Skyline View','Smart TV','Free Wi-Fi','AC','Mini Bar'],
     ARRAY['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=80'],7),
  ('108','Premium Room 108','City-view King','Understated luxury with a walk-in shower and premium linen.','Floor 2','King',320,2,
     4000,12,FALSE,0,NULL,
     ARRAY['King Bed','Smart TV','Free Wi-Fi','AC','Walk-in Shower','Room Service'],
     ARRAY['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80'],8),
  ('109','Premium Room 109','Garden-view King','A quiet corner king with a private balcony over the courtyard.','Floor 2','King',340,2,
     4000,12,FALSE,0,NULL,
     ARRAY['King Bed','Private Balcony','Smart TV','Free Wi-Fi','AC','Room Service'],
     ARRAY['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80'],9),
  ('110','Premium Room 110','Signature King','Our signature premium room — the most spacious, on a launch offer.','Floor 2','King',400,3,
     4000,12,TRUE,10,'Launch Offer · 10% Off',
     ARRAY['King Bed','Sofa','Skyline View','Smart TV','Free Wi-Fi','AC','Mini Bar'],
     ARRAY['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80','https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80'],10)
ON CONFLICT (room_number) DO NOTHING;

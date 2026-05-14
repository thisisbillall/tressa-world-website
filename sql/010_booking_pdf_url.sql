-- Stores the Vercel Blob URL for the booking-slip PDF. The PDF is
-- generated + uploaded once during payment verification (or for the free
-- booking path) and the URL is stamped here so SMS / UI can link to it
-- directly via CDN instead of re-rendering on every download.
--
--   psql "$DATABASE_URL" -f sql/010_booking_pdf_url.sql

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

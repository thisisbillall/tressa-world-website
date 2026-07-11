-- Standardise the amenity list across every premium room.
--   node scripts/run-migration.mjs sql/015_suite_amenities.sql
-- (Your webapp can still customise any individual room afterwards.)

UPDATE suite_rooms
   SET amenities = ARRAY['King Bed','TV','Music System','Fast Wi-Fi','AC'];

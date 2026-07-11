-- Add a "City View" feature to Grand and Celebration suites (idempotent).
--   node scripts/run-migration.mjs sql/020_grand_celebration_cityview.sql

UPDATE suite_rooms
   SET amenities = array_append(amenities, 'City View')
 WHERE name IN ('Aura - Grand Suite', 'Aura - Celebration Suite')
   AND NOT ('City View' = ANY(amenities));

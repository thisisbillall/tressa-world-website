-- Uniform subtitle for all Delight suites.
--   node scripts/run-migration.mjs sql/019_delight_subtitle.sql

UPDATE suite_rooms
   SET subtitle = 'Deluxe King'
 WHERE name = 'Aura - Delight Suite';

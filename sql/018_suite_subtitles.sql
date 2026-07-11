-- Themed subtitle for the Celebration suites (replaces "City-view King").
--   node scripts/run-migration.mjs sql/018_suite_subtitles.sql

UPDATE suite_rooms
   SET subtitle = 'Celebrate your special moments'
 WHERE name = 'Aura - Celebration Suite';

-- Show the higher tiers first: Grand, then Celebration, then Delight.
--   node scripts/run-migration.mjs sql/017_suite_order.sql

UPDATE suite_rooms SET sort_order = 1  WHERE room_number = '201';  -- Grand
UPDATE suite_rooms SET sort_order = 2  WHERE room_number = '101';  -- Celebration
UPDATE suite_rooms SET sort_order = 3  WHERE room_number = '205';  -- Celebration
UPDATE suite_rooms SET sort_order = 4  WHERE room_number = '102';  -- Delight
UPDATE suite_rooms SET sort_order = 5  WHERE room_number = '103';
UPDATE suite_rooms SET sort_order = 6  WHERE room_number = '104';
UPDATE suite_rooms SET sort_order = 7  WHERE room_number = '105';
UPDATE suite_rooms SET sort_order = 8  WHERE room_number = '202';
UPDATE suite_rooms SET sort_order = 9  WHERE room_number = '203';
UPDATE suite_rooms SET sort_order = 10 WHERE room_number = '204';

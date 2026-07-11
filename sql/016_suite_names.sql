-- Rename premium rooms to Aura suite tiers and renumber to floor-based numbers.
--   node scripts/run-migration.mjs sql/016_suite_names.sql
--
-- Final layout (10 rooms):
--   Aura - Delight Suite     : 102,103,104,105, 202,203,204   (7)
--   Aura - Celebration Suite : 101, 205                        (2)
--   Aura - Grand Suite       : 201                             (1)
--
-- Safe to re-run: rows already renumbered (2xx) simply won't match the old
-- 1xx WHERE clauses on a second pass.

UPDATE suite_rooms SET name = 'Aura - Celebration Suite', sort_order = 1  WHERE room_number = '101';
UPDATE suite_rooms SET name = 'Aura - Delight Suite',     sort_order = 2  WHERE room_number = '102';
UPDATE suite_rooms SET name = 'Aura - Delight Suite',     sort_order = 3  WHERE room_number = '103';
UPDATE suite_rooms SET name = 'Aura - Delight Suite',     sort_order = 4  WHERE room_number = '104';
UPDATE suite_rooms SET name = 'Aura - Delight Suite',     sort_order = 5  WHERE room_number = '105';
UPDATE suite_rooms SET name = 'Aura - Grand Suite',       sort_order = 6,  room_number = '201' WHERE room_number = '106';
UPDATE suite_rooms SET name = 'Aura - Delight Suite',     sort_order = 7,  room_number = '202' WHERE room_number = '107';
UPDATE suite_rooms SET name = 'Aura - Delight Suite',     sort_order = 8,  room_number = '203' WHERE room_number = '108';
UPDATE suite_rooms SET name = 'Aura - Delight Suite',     sort_order = 9,  room_number = '204' WHERE room_number = '109';
UPDATE suite_rooms SET name = 'Aura - Celebration Suite', sort_order = 10, room_number = '205' WHERE room_number = '110';

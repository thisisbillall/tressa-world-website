-- 10% offer on all Delight suites (uniform for the type).
--   node scripts/run-migration.mjs sql/023_delight_offer.sql

UPDATE suite_rooms
   SET offer_active = TRUE,
       offer_percent = 10,
       offer_label = 'Delight Offer · 10% Off'
 WHERE name = 'Aura - Delight Suite';

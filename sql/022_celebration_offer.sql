-- 5% offer on both Celebration suites.
--   node scripts/run-migration.mjs sql/022_celebration_offer.sql

UPDATE suite_rooms
   SET offer_active = TRUE,
       offer_percent = 5,
       offer_label = 'Celebration Offer · 5% Off'
 WHERE name = 'Aura - Celebration Suite';

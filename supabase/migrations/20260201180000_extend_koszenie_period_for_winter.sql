-- ============================================================================
-- migracja: extend_koszenie_period_for_winter
-- data: 2026-02-01
-- opis: rozszerzenie okresu wykonywania „Koszenie trawnika” na luty (02-01),
--       aby w zimie (np. 01.02) na liście nadchodzących zabiegów wyświetlały
--       się propozycje koszenia w najbliższych dniach.
--
-- dotknięte tabele:
--   - treatment_templates
--
-- uwagi:
--   - przed migracją: okres 03-01 do 10-31 (brak zabiegów w lutym)
--   - po migracji: okres 02-01 do 10-31 (zabiegi od początku lutego)
-- ============================================================================

update treatment_templates
set
  okresy_wykonywania = '[{"start":"02-01","end":"10-31"}]'::jsonb,
  updated_at = now()
where nazwa = 'Koszenie trawnika';

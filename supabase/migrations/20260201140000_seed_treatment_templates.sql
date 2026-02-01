-- ============================================================================
-- migracja: seed_treatment_templates
-- data: 2026-02-01
-- opis: uzupełnienie tabeli treatment_templates o minimalny zestaw zasad
--       pielęgnacji trawnika (baseline) dla klimatu PL/EU
--
-- dotknięte tabele:
--   - treatment_templates
--
-- uwagi:
--   - migracja uruchamiana w kontekście własności tabeli (bypass RLS)
--   - priorytety 1–10 (wyższy = ważniejszy), cooldowny w dniach
--   - okresy_wykonywania: JSONB [{"start":"MM-DD","end":"MM-DD"}, ...]
-- ============================================================================

insert into treatment_templates (
  nazwa,
  opis,
  typ_zabiegu,
  priorytet,
  minimalny_cooldown_dni,
  okresy_wykonywania
) values
  (
    'Koszenie trawnika',
    'Co 7–10 dni w sezonie. Nie skracać więcej niż ⅓ wysokości źdźbła. Wysokość 4–6 cm (rekreacyjny trawnik). Podstawa zdrowia trawnika.',
    'koszenie',
    10,
    7,
    '[{"start":"03-01","end":"10-31"}]'::jsonb
  ),
  (
    'Podlewanie trawnika',
    '1–2 razy w tygodniu, 15–25 mm wody na jedno podlewanie. Rzadziej, ale obficie (lepsze ukorzenienie). Pora: rano lub wieczorem.',
    'podlewanie',
    9,
    3,
    '[{"start":"05-01","end":"09-30"}]'::jsonb
  ),
  (
    'Nawożenie trawnika',
    'Co 6–8 tygodni. Nawóz do trawnika: wiosna – azotowy, jesień – jesienny. Nie nawozić na suchą trawę.',
    'nawożenie',
    8,
    42,
    '[{"start":"03-01","end":"09-30"}]'::jsonb
  ),
  (
    'Wertykulacja trawnika',
    '1–2 razy w roku. Cel: usunięcie filcu i martwej trawy. Trawnik musi być dobrze ukorzeniony. Wiosna (marzec–kwiecień) lub jesień (wrzesień).',
    'wertykulacja',
    6,
    120,
    '[{"start":"03-15","end":"04-30"},{"start":"09-01","end":"09-30"}]'::jsonb
  ),
  (
    'Aeracja trawnika',
    '1 raz w roku (maks. 2). Rozluźnienie gleby, poprawa napowietrzenia. Najlepiej po wertykulacji.',
    'aeracja',
    6,
    180,
    '[{"start":"04-01","end":"09-30"}]'::jsonb
  );

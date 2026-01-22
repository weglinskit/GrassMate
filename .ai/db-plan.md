# Schemat bazy danych PostgreSQL – GrassMate MVP

## 1. Tabele

### 1.1. `auth.users` (Supabase)

Tabela zarządzana przez Supabase, zawierająca użytkowników z autentykacją email/hasło.

**Kolumny (standardowe Supabase):**
- `id` (UUID, PK) – identyfikator użytkownika
- `email` (TEXT, UNIQUE, NOT NULL)
- `encrypted_password` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- Inne standardowe kolumny Supabase

---

### 1.2. `lawn_profiles`

Profile trawników powiązane z użytkownikami. Jeden aktywny trawnik na użytkownika.

**Kolumny:**
- `id` (UUID, PK) – identyfikator profilu
- `user_id` (UUID, FK → `auth.users.id`, NOT NULL, ON DELETE CASCADE)
- `nazwa` (TEXT, NOT NULL) – nazwa trawnika (np. "Trawnik przed domem")
- `wielkość_m2` (NUMERIC(10,2), NOT NULL, DEFAULT 100.0) – powierzchnia trawnika w m²
- `nasłonecznienie` (ENUM, NOT NULL, DEFAULT 'średnie') – poziom nasłonecznienia
- `rodzaj_powierzchni` (TEXT, NULLABLE) – opcjonalny opis rodzaju powierzchni
- `latitude` (NUMERIC(10,7), NOT NULL) – szerokość geograficzna (-90 do 90)
- `longitude` (NUMERIC(11,7), NOT NULL) – długość geograficzna (-180 do 180)
- `is_active` (BOOLEAN, NOT NULL, DEFAULT true) – aktywny trawnik
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Ograniczenia:**
- `UNIQUE(user_id, is_active)` gdzie `is_active = true` – tylko jeden aktywny trawnik na użytkownika
- `CHECK(latitude >= -90 AND latitude <= 90)`
- `CHECK(longitude >= -180 AND longitude <= 180)`
- `CHECK(wielkość_m2 > 0)`
- `CHECK(nazwa IS NOT NULL AND LENGTH(nazwa) > 0 AND LENGTH(nazwa) <= 255)`

**Enum `nasłonecznienie`:**
- `'niskie'`
- `'średnie'`
- `'wysokie'`

**Indeksy:**
- `idx_lawn_profiles_user_id_is_active` – `(user_id, is_active)` dla szybkiego wyszukiwania aktywnego trawnika
- `idx_lawn_profiles_user_id` – `(user_id)` dla listy trawników użytkownika

---

### 1.3. `treatment_templates`

Globalne szablony zabiegów współdzielone między użytkownikami. Definiują reguły i parametry zabiegów.

**Kolumny:**
- `id` (UUID, PK) – identyfikator szablonu
- `nazwa` (TEXT, NOT NULL) – nazwa zabiegu (np. "Koszenie trawnika")
- `opis` (TEXT, NULLABLE) – szczegółowy opis zabiegu
- `priorytet` (INTEGER, NOT NULL, DEFAULT 5) – priorytet zabiegu (1-10, wyższy = ważniejszy)
- `minimalny_cooldown_dni` (INTEGER, NOT NULL, DEFAULT 7) – minimalny odstęp między zabiegami w dniach
- `okresy_wykonywania` (JSONB, NOT NULL, DEFAULT '[]'::jsonb) – okresy w roku, w których zabieg jest wykonywany
  - Format: `[{"start": "03-01", "end": "10-31"}, ...]` (miesiąc-dzień)
- `typ_zabiegu` (ENUM, NOT NULL) – typ zabiegu
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Ograniczenia:**
- `CHECK(priorytet >= 1 AND priorytet <= 10)`
- `CHECK(minimalny_cooldown_dni >= 0)`
- `CHECK(LENGTH(nazwa) > 0 AND LENGTH(nazwa) <= 255)`
- `CHECK(LENGTH(opis) <= 2000)` jeśli `opis IS NOT NULL`

**Enum `typ_zabiegu`:**
- `'koszenie'`
- `'nawożenie'`
- `'podlewanie'`
- `'aeracja'`
- `'wertykulacja'`

**Indeksy:**
- `idx_treatment_templates_typ_zabiegu` – `(typ_zabiegu)` dla filtrowania po typie
- `idx_treatment_templates_priorytet` – `(priorytet DESC)` dla sortowania

---

### 1.4. `treatments`

Rekomendacje zabiegów (statyczne i dynamiczne) dla konkretnych trawników.

**Kolumny:**
- `id` (UUID, PK) – identyfikator rekomendacji
- `lawn_profile_id` (UUID, FK → `lawn_profiles.id`, NOT NULL, ON DELETE CASCADE)
- `template_id` (UUID, FK → `treatment_templates.id`, NOT NULL, ON DELETE RESTRICT)
- `data_proponowana` (DATE, NOT NULL) – proponowana data wykonania zabiegu
- `typ_generowania` (ENUM, NOT NULL) – sposób wygenerowania rekomendacji
- `uzasadnienie_pogodowe` (TEXT, NULLABLE) – uzasadnienie dla dynamicznych rekomendacji
- `status` (ENUM, NOT NULL, DEFAULT 'aktywny') – status rekomendacji
- `expires_at` (TIMESTAMPTZ, NULLABLE) – data wygaśnięcia rekomendacji
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Ograniczenia:**
- `CHECK(LENGTH(uzasadnienie_pogodowe) <= 1000)` jeśli `uzasadnienie_pogodowe IS NOT NULL`
- `CHECK(expires_at IS NULL OR expires_at > created_at)` jeśli `expires_at IS NOT NULL`

**Enum `typ_generowania`:**
- `'statyczny'` – z harmonogramu rocznego
- `'dynamiczny'` – wygenerowany na podstawie warunków pogodowych

**Enum `status`:**
- `'aktywny'` – rekomendacja aktywna
- `'wykonany'` – zabieg został wykonany
- `'odrzucony'` – użytkownik odrzucił rekomendację
- `'wygasły'` – rekomendacja wygasła automatycznie

**Indeksy:**
- `idx_treatments_lawn_profile_status` – `(lawn_profile_id, status, expires_at)` dla listy aktywnych zabiegów
- `idx_treatments_data_proponowana` – `(data_proponowana)` dla sortowania po dacie
- `idx_treatments_template_id` – `(template_id)` dla filtrowania po szablonie
- `idx_treatments_expires_at` – `(expires_at)` dla joba wygaszającego zabiegi

---

### 1.5. `treatment_history`

Append-only log zmian statusu zabiegów. Przechowuje historię wszystkich zmian statusu wraz z dodatkowymi danymi.

**Kolumny:**
- `id` (UUID, PK) – identyfikator wpisu w historii
- `treatment_id` (UUID, FK → `treatments.id`, NOT NULL, ON DELETE CASCADE)
- `lawn_profile_id` (UUID, FK → `lawn_profiles.id`, NOT NULL, ON DELETE CASCADE) – denormalizacja dla wydajności
- `status_old` (ENUM, NULLABLE) – poprzedni status
- `status_new` (ENUM, NOT NULL) – nowy status
- `data_wykonania_rzeczywista` (DATE, NULLABLE) – rzeczywista data wykonania (jeśli status = 'wykonany')
- `powód_odrzucenia` (TEXT, NULLABLE) – powód odrzucenia (jeśli status = 'odrzucony')
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) – moment zmiany statusu

**Ograniczenia:**
- `CHECK(LENGTH(powód_odrzucenia) <= 500)` jeśli `powód_odrzucenia IS NOT NULL`
- `CHECK(status_new != status_old)` – status musi się zmienić
- `CHECK((status_new = 'wykonany' AND data_wykonania_rzeczywista IS NOT NULL) OR (status_new != 'wykonany'))`
- `CHECK((status_new = 'odrzucony' AND powód_odrzucenia IS NOT NULL) OR (status_new != 'odrzucony'))`

**Enumy:** używają tych samych enumów co tabela `treatments` dla `status`.

**Indeksy:**
- `idx_treatment_history_lawn_profile_status` – `(lawn_profile_id, status_new, created_at)` dla historii trawnika
- `idx_treatment_history_treatment_id` – `(treatment_id, created_at)` dla historii konkretnego zabiegu
- `idx_treatment_history_cooldown` – `(lawn_profile_id, treatment_type, status_new, created_at)` dla sprawdzania cooldown
  - **Uwaga:** `treatment_type` wymaga JOIN z `treatments` i `treatment_templates`, rozważ denormalizację lub materialized view

---

### 1.6. `weather_cache`

Cache danych pogodowych współdzielony między użytkownikami w tej samej lokalizacji. TTL 24h.

**Kolumny:**
- `id` (UUID, PK) – identyfikator wpisu
- `latitude` (NUMERIC(10,7), NOT NULL) – szerokość geograficzna
- `longitude` (NUMERIC(11,7), NOT NULL) – długość geograficzna
- `date` (DATE, NOT NULL) – data danych pogodowych
- `temperatura_max` (NUMERIC(5,2), NULLABLE) – maksymalna temperatura w °C
- `opady_24h` (NUMERIC(6,2), NULLABLE) – opady w ostatnich 24h w mm
- `opady_72h_sum` (NUMERIC(6,2), NULLABLE) – suma opadów z ostatnich 72h w mm
- `dni_bez_opadów` (INTEGER, NULLABLE) – liczba dni bez opadów
- `prognoza_3d` (JSONB, NULLABLE, DEFAULT '{}'::jsonb) – prognoza na 3 dni do przodu
  - Format: `{"2024-03-15": {"temp_max": 15, "opady": 5}, ...}`
- `fetched_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) – moment pobrania danych

**Ograniczenia:**
- `UNIQUE(latitude, longitude, date)` – jeden wpis na lokalizację i datę
- `CHECK(latitude >= -90 AND latitude <= 90)`
- `CHECK(longitude >= -180 AND longitude <= 180)`
- `CHECK(temperatura_max >= -50 AND temperatura_max <= 60)` jeśli `temperatura_max IS NOT NULL`
- `CHECK(opady_24h >= 0)` jeśli `opady_24h IS NOT NULL`
- `CHECK(opady_72h_sum >= 0)` jeśli `opady_72h_sum IS NOT NULL`
- `CHECK(dni_bez_opadów >= 0)` jeśli `dni_bez_opadów IS NOT NULL`

**Indeksy:**
- `idx_weather_cache_location_date` – `(latitude, longitude, date)` – unikalny index przez UNIQUE constraint
- `idx_weather_cache_fetched_at` – `(fetched_at)` dla joba czyszczącego cache (TTL 24h)

---

### 1.7. `push_subscriptions`

Subskrypcje Web Push dla użytkowników. Wiele subskrypcji na użytkownika (różne urządzenia).

**Kolumny:**
- `id` (UUID, PK) – identyfikator subskrypcji
- `user_id` (UUID, FK → `auth.users.id`, NOT NULL, ON DELETE CASCADE)
- `endpoint` (TEXT, NOT NULL, UNIQUE) – endpoint Web Push
- `keys` (JSONB, NOT NULL) – klucze Web Push (p256dh, auth)
  - Format: `{"p256dh": "...", "auth": "..."}`
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `last_used_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) – ostatnie użycie subskrypcji

**Ograniczenia:**
- `CHECK(endpoint IS NOT NULL AND LENGTH(endpoint) > 0)`
- `CHECK(keys ? 'p256dh' AND keys ? 'auth')` – wymagane klucze w JSONB

**Indeksy:**
- `idx_push_subscriptions_user_id` – `(user_id)` dla listy subskrypcji użytkownika
- `idx_push_subscriptions_last_used_at` – `(last_used_at)` dla czyszczenia nieaktywnych subskrypcji

---

### 1.8. `notification_log`

Log wysłanych powiadomień Web Push. Śledzenie wysyłek i kliknięć.

**Kolumny:**
- `id` (UUID, PK) – identyfikator wpisu
- `user_id` (UUID, FK → `auth.users.id`, NOT NULL, ON DELETE CASCADE)
- `lawn_profile_id` (UUID, FK → `lawn_profiles.id`, NOT NULL, ON DELETE CASCADE)
- `treatment_id` (UUID, FK → `treatments.id`, NULLABLE, ON DELETE SET NULL) – może być NULL dla powiadomień ogólnych
- `typ_powiadomienia` (ENUM, NOT NULL) – typ powiadomienia
- `template_użyty` (TEXT, NOT NULL) – użyty szablon treści powiadomienia
- `wysłane_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) – moment wysłania
- `kliknięte_at` (TIMESTAMPTZ, NULLABLE) – moment kliknięcia (jeśli użytkownik kliknął)

**Ograniczenia:**
- `CHECK(LENGTH(template_użyty) > 0 AND LENGTH(template_użyty) <= 500)`
- `CHECK(kliknięte_at IS NULL OR kliknięte_at >= wysłane_at)`

**Enum `typ_powiadomienia`:**
- `'zabieg_planowy'` – powiadomienie o planowym zabiegu
- `'rekomendacja_pogodowa'` – powiadomienie o rekomendacji pogodowej

**Indeksy:**
- `idx_notification_log_user_id` – `(user_id, wysłane_at DESC)` dla historii powiadomień użytkownika
- `idx_notification_log_treatment_id` – `(treatment_id)` dla powiązania z zabiegiem
- `idx_notification_log_clicked` – `(kliknięte_at)` dla analityki kliknięć

---

### 1.9. `analytics_events`

Zdarzenia analityczne zbierane z aplikacji. Partycjonowane według miesięcy dla skalowalności.

**Kolumny:**
- `id` (UUID, PK) – identyfikator zdarzenia
- `user_id` (UUID, FK → `auth.users.id`, NOT NULL, ON DELETE CASCADE)
- `event_type` (ENUM, NOT NULL) – typ zdarzenia
- `metadata` (JSONB, NULLABLE, DEFAULT '{}'::jsonb) – dodatkowe dane zdarzenia
- `treatment_id` (UUID, FK → `treatments.id`, NULLABLE, ON DELETE SET NULL) – powiązane z zabiegiem (jeśli dotyczy)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) – moment zdarzenia

**Ograniczenia:**
- Brak dodatkowych constraints dla elastyczności

**Enum `event_type`:**
- `'reminder_sent'` – wysłano przypomnienie
- `'reminder_clicked'` – kliknięto przypomnienie
- `'task_completed'` – oznaczono zadanie jako wykonane
- `'task_skipped'` – odrzucono zadanie
- `'task_expired'` – zadanie wygasło
- `'weather_recommendation_created'` – utworzono rekomendację pogodową
- `'survey_answer'` – odpowiedź na ankietę (ocena 1-5 gwiazdek)

**Indeksy:**
- `idx_analytics_events_user_id_created` – `(user_id, created_at DESC)` dla historii użytkownika
- `idx_analytics_events_event_type` – `(event_type, created_at DESC)` dla analityki typów zdarzeń
- `idx_analytics_events_treatment_id` – `(treatment_id)` dla analityki zabiegów
- `idx_analytics_events_created_at` – `(created_at)` dla partycjonowania

**Partycjonowanie:**
- Tabela partycjonowana według `created_at` (miesięcznie)
- Format partycji: `analytics_events_YYYY_MM` (np. `analytics_events_2024_03`)
- Partycje tworzone automatycznie przez job cron lub ręcznie przed rozpoczęciem nowego miesiąca

---

## 2. Relacje między tabelami

### 2.1. Relacje jeden-do-wielu (1:N)

1. **`auth.users` → `lawn_profiles`**
   - Jeden użytkownik może mieć wiele profili trawników
   - FK: `lawn_profiles.user_id → auth.users.id`
   - ON DELETE: CASCADE

2. **`lawn_profiles` → `treatments`**
   - Jeden profil trawnika może mieć wiele rekomendacji zabiegów
   - FK: `treatments.lawn_profile_id → lawn_profiles.id`
   - ON DELETE: CASCADE

3. **`treatment_templates` → `treatments`**
   - Jeden szablon może być użyty w wielu rekomendacjach
   - FK: `treatments.template_id → treatment_templates.id`
   - ON DELETE: RESTRICT (zapobiega usunięciu szablonu w użyciu)

4. **`treatments` → `treatment_history`**
   - Jedna rekomendacja może mieć wiele wpisów w historii
   - FK: `treatment_history.treatment_id → treatments.id`
   - ON DELETE: CASCADE

5. **`lawn_profiles` → `treatment_history`** (denormalizacja)
   - FK: `treatment_history.lawn_profile_id → lawn_profiles.id`
   - ON DELETE: CASCADE
   - **Uwaga:** Denormalizacja dla wydajności zapytań analitycznych

6. **`auth.users` → `push_subscriptions`**
   - Jeden użytkownik może mieć wiele subskrypcji (różne urządzenia)
   - FK: `push_subscriptions.user_id → auth.users.id`
   - ON DELETE: CASCADE

7. **`auth.users` → `notification_log`**
   - Jeden użytkownik może mieć wiele wpisów w logu powiadomień
   - FK: `notification_log.user_id → auth.users.id`
   - ON DELETE: CASCADE

8. **`lawn_profiles` → `notification_log`**
   - Jeden profil trawnika może mieć wiele powiadomień
   - FK: `notification_log.lawn_profile_id → lawn_profiles.id`
   - ON DELETE: CASCADE

9. **`treatments` → `notification_log`** (opcjonalna)
   - Powiadomienie może być powiązane z konkretną rekomendacją
   - FK: `notification_log.treatment_id → treatments.id`
   - ON DELETE: SET NULL

10. **`auth.users` → `analytics_events`**
    - Jeden użytkownik może generować wiele zdarzeń analitycznych
    - FK: `analytics_events.user_id → auth.users.id`
    - ON DELETE: CASCADE

11. **`treatments` → `analytics_events`** (opcjonalna)
    - Zdarzenie może być powiązane z konkretną rekomendacją
    - FK: `analytics_events.treatment_id → treatments.id`
    - ON DELETE: SET NULL

### 2.2. Brak relacji wiele-do-wielu

W schemacie MVP nie ma relacji wiele-do-wielu wymagających tabel łączących.

---

## 3. Indeksy

### 3.1. Indeksy już wymienione w tabelach

Wszystkie indeksy zostały wymienione w sekcji "Indeksy" przy każdej tabeli. Poniżej podsumowanie strategicznych indeksów:

**Indeksy wydajnościowe:**
- `idx_lawn_profiles_user_id_is_active` – szybkie wyszukiwanie aktywnego trawnika
- `idx_treatments_lawn_profile_status` – lista aktywnych zabiegów dla trawnika
- `idx_treatment_history_cooldown` – sprawdzanie cooldown między zabiegami
- `idx_weather_cache_location_date` – szybkie wyszukiwanie danych pogodowych
- `idx_analytics_events_user_id_created` – historia zdarzeń użytkownika

**Indeksy dla jobów:**
- `idx_treatments_expires_at` – job wygaszający zabiegi (co godzinę)
- `idx_weather_cache_fetched_at` – job czyszczący cache (TTL 24h)

### 3.2. Dodatkowe indeksy composite (jeśli wymagane)

Rozważ utworzenie dodatkowych indeksów composite w zależności od częstych zapytań:
- `(user_id, treatment_type, status)` dla szybkiego filtrowania zabiegów użytkownika po typie
- `(latitude, longitude, fetched_at)` dla cache'owania prognoz pogodowych

---

## 4. Row Level Security (RLS)

### 4.1. Zasady ogólne

Wszystkie tabele zawierające `user_id` lub `lawn_profile_id` mają włączony RLS z politykami SELECT/INSERT/UPDATE/DELETE dla właściciela danych.

### 4.2. Polityki RLS

#### `lawn_profiles`
- **SELECT:** Użytkownik widzi tylko swoje profile trawników
- **INSERT:** Użytkownik może tworzyć tylko swoje profile
- **UPDATE:** Użytkownik może aktualizować tylko swoje profile
- **DELETE:** Użytkownik może usuwać tylko swoje profile

#### `treatments`
- **SELECT:** Użytkownik widzi tylko zabiegi powiązane ze swoimi trawnikami
- **INSERT:** Użytkownik może tworzyć zabiegi tylko dla swoich trawników (poprzez `lawn_profile_id`)
- **UPDATE:** Użytkownik może aktualizować tylko zabiegi powiązane ze swoimi trawnikami
- **DELETE:** Użytkownik może usuwać tylko zabiegi powiązane ze swoimi trawnikami

#### `treatment_history`
- **SELECT:** Użytkownik widzi tylko historię ze swoich trawników
- **INSERT:** Użytkownik może tworzyć wpisy w historii tylko dla swoich trawników
- **UPDATE:** Niedozwolone (append-only log)
- **DELETE:** Niedozwolone (append-only log)

#### `push_subscriptions`
- **SELECT:** Użytkownik widzi tylko swoje subskrypcje
- **INSERT:** Użytkownik może tworzyć tylko swoje subskrypcje
- **UPDATE:** Użytkownik może aktualizować tylko swoje subskrypcje
- **DELETE:** Użytkownik może usuwać tylko swoje subskrypcje

#### `notification_log`
- **SELECT:** Użytkownik widzi tylko swoje powiadomienia
- **INSERT:** Użytkownik może tworzyć wpisy tylko dla siebie (zazwyczaj przez backend/service)
- **UPDATE:** Użytkownik może aktualizować tylko swoje powiadomienia (np. kliknięcie)
- **DELETE:** Niedozwolone (log tylko do odczytu)

#### `analytics_events`
- **SELECT:** Użytkownik widzi tylko swoje zdarzenia
- **INSERT:** Użytkownik może tworzyć tylko swoje zdarzenia (zazwyczaj przez backend/service)
- **UPDATE:** Niedozwolone (append-only log)
- **DELETE:** Niedozwolone (append-only log)

#### `treatment_templates`
- **SELECT:** Publiczne (wszyscy zarejestrowani użytkownicy mogą czytać)
- **INSERT:** Tylko administratorzy/backend (seed data)
- **UPDATE:** Tylko administratorzy/backend
- **DELETE:** RESTRICT (nie można usuwać szablonów w użyciu)

#### `weather_cache`
- **SELECT:** Publiczne (wszyscy zarejestrowani użytkownicy mogą czytać)
- **INSERT:** Publiczne z limitem częstotliwości (zapobieganie spamowaniu)
- **UPDATE:** Publiczne z limitem częstotliwości
- **DELETE:** Tylko job cron (czyszczenie TTL)

### 4.3. Funkcje pomocnicze dla RLS

Utworzyć funkcje pomocnicze do sprawdzania własności:

```sql
-- Funkcja sprawdzająca, czy użytkownik jest właścicielem trawnika
CREATE FUNCTION is_lawn_owner(lawn_profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM lawn_profiles
    WHERE id = lawn_profile_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Funkcja sprawdzająca, czy użytkownik jest zarejestrowany
CREATE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 5. Wyzwalacze (Triggers)

### 5.1. Automatyczna aktualizacja `updated_at`

Utworzyć wyzwalacz dla automatycznej aktualizacji `updated_at`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Wyzwalacze dla każdej tabeli z kolumną updated_at
CREATE TRIGGER update_lawn_profiles_updated_at
  BEFORE UPDATE ON lawn_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_templates_updated_at
  BEFORE UPDATE ON treatment_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at
  BEFORE UPDATE ON treatments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 5.2. Aktualizacja `last_used_at` dla `push_subscriptions`

```sql
CREATE OR REPLACE FUNCTION update_push_subscription_last_used()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_subscriptions_last_used
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_last_used();
```

### 5.3. Sprawdzanie unikalności aktywnego trawnika

```sql
CREATE OR REPLACE FUNCTION ensure_single_active_lawn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deaktywuj inne aktywne trawniki użytkownika
    UPDATE lawn_profiles
    SET is_active = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_active_lawn_trigger
  BEFORE INSERT OR UPDATE ON lawn_profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_lawn();
```

### 5.4. Automatyczne dodawanie wpisu do `treatment_history`

```sql
CREATE OR REPLACE FUNCTION log_treatment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO treatment_history (
      treatment_id,
      lawn_profile_id,
      status_old,
      status_new,
      data_wykonania_rzeczywista,
      powód_odrzucenia
    ) VALUES (
      NEW.id,
      NEW.lawn_profile_id,
      OLD.status,
      NEW.status,
      CASE WHEN NEW.status = 'wykonany' THEN NEW.data_proponowana ELSE NULL END,
      CASE WHEN NEW.status = 'odrzucony' THEN 'Użytkownik odrzucił' ELSE NULL END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_treatment_status_change_trigger
  AFTER UPDATE ON treatments
  FOR EACH ROW
  EXECUTE FUNCTION log_treatment_status_change();
```

---

## 6. Joby cron (Supabase Edge Functions lub pg_cron)

### 6.1. Wygaszanie zabiegów (co godzinę)

```sql
-- Job: Wygaśnij zabiegi z expires_at < NOW()
-- Uruchamiany co godzinę
UPDATE treatments
SET status = 'wygasły', updated_at = NOW()
WHERE status = 'aktywny'
AND expires_at IS NOT NULL
AND expires_at < NOW();
```

### 6.2. Czyszczenie cache pogodowego (TTL 24h)

```sql
-- Job: Usuń wpisy z fetched_at starsze niż 24h
-- Uruchamiany co 6 godzin
DELETE FROM weather_cache
WHERE fetched_at < NOW() - INTERVAL '24 hours';
```

### 6.3. Przeliczanie rekomendacji (co 24h)

```sql
-- Job: Przelicz dynamiczne rekomendacje dla wszystkich aktywnych trawników
-- Uruchamiany codziennie o 00:00 UTC
-- Implementacja w Edge Function lub jako procedura składowana
-- Logika: Dla każdego aktywnego trawnika wygeneruj nowe rekomendacje na podstawie aktualnych danych pogodowych
```

### 6.4. Tworzenie partycji `analytics_events` (przed rozpoczęciem miesiąca)

```sql
-- Job: Utwórz partycję na następny miesiąc
-- Uruchamiany 28. dnia każdego miesiąca
-- Implementacja jako funkcja generująca partycję dla następnego miesiąca
```

---

## 7. Funkcje pomocnicze

### 7.1. Sprawdzanie cooldown dla zabiegu

```sql
CREATE OR REPLACE FUNCTION check_treatment_cooldown(
  p_lawn_profile_id UUID,
  p_template_id UUID,
  p_proposed_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_min_cooldown_days INTEGER;
  v_last_performed DATE;
BEGIN
  -- Pobierz minimalny cooldown z szablonu
  SELECT minimalny_cooldown_dni INTO v_min_cooldown_days
  FROM treatment_templates
  WHERE id = p_template_id;

  -- Sprawdź ostatnie wykonanie tego typu zabiegu
  SELECT MAX(data_wykonania_rzeczywista) INTO v_last_performed
  FROM treatment_history th
  JOIN treatments t ON t.id = th.treatment_id
  WHERE t.lawn_profile_id = p_lawn_profile_id
  AND t.template_id = p_template_id
  AND th.status_new = 'wykonany'
  AND th.data_wykonania_rzeczywista IS NOT NULL;

  -- Sprawdź czy minął wymagany cooldown
  IF v_last_performed IS NULL THEN
    RETURN true; -- Brak poprzedniego wykonania
  END IF;

  RETURN (p_proposed_date - v_last_performed) >= v_min_cooldown_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.2. Pobieranie aktywnego trawnika użytkownika

```sql
CREATE OR REPLACE FUNCTION get_active_lawn_profile(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  nazwa TEXT,
  wielkość_m2 NUMERIC,
  nasłonecznienie TEXT,
  latitude NUMERIC,
  longitude NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT lp.id, lp.nazwa, lp.wielkość_m2, lp.nasłonecznienie, lp.latitude, lp.longitude
  FROM lawn_profiles lp
  WHERE lp.user_id = p_user_id
  AND lp.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 8. Seed data

### 8.1. Szablony zabiegów (`treatment_templates`)

Utworzyć początkową listę szablonów na podstawie PRD:

1. **Koszenie trawnika**
   - `typ_zabiegu`: 'koszenie'
   - `minimalny_cooldown_dni`: 5
   - `okresy_wykonywania`: `[{"start": "03-01", "end": "11-30"}]`
   - `priorytet`: 8

2. **Nawożenie trawnika**
   - `typ_zabiegu`: 'nawożenie'
   - `minimalny_cooldown_dni`: 30
   - `okresy_wykonywania`: `[{"start": "04-01", "end": "09-30"}]`
   - `priorytet`: 9

3. **Podlewanie trawnika**
   - `typ_zabiegu`: 'podlewanie'
   - `minimalny_cooldown_dni`: 0 (można codziennie)
   - `okresy_wykonywania`: `[{"start": "05-01", "end": "09-30"}]`
   - `priorytet`: 7

4. **Aeracja trawnika**
   - `typ_zabiegu`: 'aeracja'
   - `minimalny_cooldown_dni`: 90
   - `okresy_wykonywania`: `[{"start": "04-01", "end": "05-31"}, {"start": "09-01", "end": "10-31"}]`
   - `priorytet`: 6

5. **Wertykulacja trawnika**
   - `typ_zabiegu`: 'wertykulacja'
   - `minimalny_cooldown_dni`: 90
   - `okresy_wykonywania`: `[{"start": "04-01", "end": "05-31"}]`
   - `priorytet`: 6

---

## 9. Uwagi dodatkowe

### 9.1. Denormalizacja

- **`treatment_history.lawn_profile_id`** – denormalizacja dla wydajności zapytań analitycznych (unikanie JOIN przez `treatment_id`)
- **`weather_cache`** – współdzielony cache między użytkownikami (denormalizacja w stosunku do relacji użytkownik–trawnik)

### 9.2. Ograniczenia częściowe (Partial Indexes)

- `UNIQUE(user_id, is_active)` gdzie `is_active = true` w `lawn_profiles` zapewnia tylko jeden aktywny trawnik

### 9.3. Typy danych

- **NUMERIC** dla współrzędnych i powierzchni – precyzja obliczeń (bez błędów zmiennoprzecinkowych)
- **JSONB** dla elastycznych struktur danych (okresy wykonywania, prognoza, metadata)
- **ENUM** dla stałych wartości – walidacja na poziomie bazy danych

### 9.4. Skalowalność

- **Partycjonowanie `analytics_events`** – przygotowanie na duże wolumeny danych analitycznych
- **Cache pogodowy** – redukcja zapytań do zewnętrznych API
- **Indeksy strategiczne** – optymalizacja najczęstszych zapytań

### 9.5. Bezpieczeństwo

- **RLS** – zabezpieczenie danych na poziomie wierszy
- **CASCADE DELETE** – automatyczne czyszczenie powiązanych danych przy usunięciu użytkownika/trawnika
- **RESTRICT DELETE** – ochrona `treatment_templates` przed usunięciem szablonów w użyciu

### 9.6. Backup i disaster recovery

- Supabase oferuje automatyczne backupy PostgreSQL
- Zalecane: regularne testy przywracania z backupu
- Partycje `analytics_events` mogą być archiwizowane oddzielnie

### 9.7. Migracje

- Użyj narzędzi Supabase do zarządzania migracjami (np. `supabase migration new`)
- Wersjonowanie schematu w repozytorium Git
- Seed data w osobnych plikach migracji

---

## 10. Checklist implementacji

- [ ] Utworzenie wszystkich tabel z kolumnami i typami danych
- [ ] Definicja wszystkich enumów
- [ ] Utworzenie kluczy podstawowych i obcych
- [ ] Dodanie wszystkich constraints (CHECK, UNIQUE, NOT NULL)
- [ ] Utworzenie wszystkich indeksów
- [ ] Włączenie RLS dla odpowiednich tabel
- [ ] Utworzenie polityk RLS (SELECT, INSERT, UPDATE, DELETE)
- [ ] Utworzenie funkcji pomocniczych dla RLS
- [ ] Utworzenie wyzwalaczy (triggers)
- [ ] Konfiguracja jobów cron (wygaszanie, cache, rekomendacje)
- [ ] Seed data dla `treatment_templates`
- [ ] Testy migracji (up/down)
- [ ] Dokumentacja API dla frontendu (opcjonalnie)

---

*Schemat bazy danych w wersji 1.0 dla MVP GrassMate. Zaktualizowano: 2026-01-22*

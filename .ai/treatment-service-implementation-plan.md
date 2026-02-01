# Plan wdrożenia usługi nadchodzących zabiegów

## 1. Opis usługi

Usługa **nadchodzących zabiegów** odpowiada za pobieranie i udostępnianie listy zabiegów do wykonania w najbliższych 10 dniach. Dane pochodzą z tabeli `treatments` (rekomendacje powiązane z profilem trawnika użytkownika), z osadzonymi danymi z `treatment_templates` (nazwa, typ zabiegu, cooldown). Lista jest wyświetlana na dashboardzie po zalogowaniu użytkownika w komponencie `TreatmentsList` i umożliwia otwarcie `CompleteTreatmentDrawer` w celu oznaczenia zabiegu jako wykonanego.

**Zakres:**

- **Backend:** funkcja serwisowa pobierająca zabiegi aktywne z przedziałem dat `data_proponowana` ∈ [dziś, dziś + 10 dni] oraz endpoint API (wykorzystanie istniejącego GET treatments z parametrami `from`/`to` lub ewentualnie dedykowany alias).
- **Frontend:** wywołanie API z parametrami `from` i `to` (okno 10 dni), wyświetlenie wyników w `TreatmentsList`; `CompleteTreatmentDrawer` pozostaje bez zmian (otwierany po wyborze zabiegu z listy).

**Źródło danych (z db-plan):**

- `treatment_templates`: `id`, `nazwa`, `opis`, `priorytet`, `minimalny_cooldown_dni`, `okresy_wykonywania`, `typ_zabiegu`.
- `treatments`: `id`, `lawn_profile_id`, `template_id`, `data_proponowana`, `typ_generowania`, `uzasadnienie_pogodowe`, `status`, `expires_at` — filtrowanie po `status = 'aktywny'` oraz `data_proponowana` w przedziale 10 dni.

---

## 2. Opis „konstruktora”

W projekcie serwisy są realizowane jako **funkcje czyste** przyjmujące `SupabaseClient` i argumenty biznesowe; nie ma klas ani konstruktorów. „Konstrukcja” usługi polega na:

1. **Dostęp do bazy:** przekazanie `supabase` z `context.locals` w endpointach Astro.
2. **Identyfikacja kontekstu:** `lawnProfileId` (z URL) oraz opcjonalnie `windowDays` (domyślnie 10) dla przedziału dat.
3. **Autentykacja:** weryfikacja JWT w middleware/endpoincie; zapytania do bazy wykonuje już zweryfikowany użytkownik przez `supabase` z sesją.

Nie ma osobnego obiektu „UpcomingTreatmentsService”; usługa = funkcja serwisowa + sposób wywołania z API + sposób użycia na frontendzie.

---

## 3. Publiczne metody i pola

### 3.1. Serwis (backend)

| Element | Opis |
|--------|------|
| **Funkcja** | `getUpcomingTreatments(supabase, lawnProfileId, windowDays?)` |
| **Parametry** | `supabase`: SupabaseClient; `lawnProfileId`: UUID; `windowDays`: number (opcjonalnie, domyślnie 10) |
| **Zwraca** | `Promise<{ data: TreatmentWithEmbedded[]; total: number }>` |
| **Zakres dat** | `from = today ISO (YYYY-MM-DD)`, `to = today + windowDays` (włącznie). Zabiegi: `status = 'aktywny'`, `data_proponowana >= from`, `data_proponowana <= to`, z `embed=template`. |

**Alternatywa (bez nowej funkcji):** użycie istniejącej `getTreatmentsForLawn(supabase, lawnProfileId, query)` z `query`: `status: 'aktywny'`, `from`, `to` (obliczone jak wyżej), `embed: 'template'`, `page: 1`, `limit: 100`, `sort: 'data_proponowana'`.

### 3.2. API

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/lawn-profiles/:lawnProfileId/treatments` | Lista zabiegów z query: `status=aktywny`, `from=<today>`, `to=<today+10>`, `embed=template`, `page=1`, `limit=100`. |

Brak nowego endpointu — wystarczy konsekwentne ustawienie parametrów zapytania.

### 3.3. Frontend

| Element | Opis |
|--------|------|
| **Funkcja** | `fetchTreatments(lawnProfileId)` — rozszerzenie o parametry `from` i `to` (obliczane w miejscu wywołania). |
| **Stała** | `UPCOMING_TREATMENTS_DAYS = 10` (np. w pliku konfiguracyjnym lub w komponencie). |
| **Komponent** | `PageDashboard` — wywołuje `fetchTreatments(profile.id)` z `from`/`to`; przekazuje `treatments` do `TreatmentsList`; `CompleteTreatmentDrawer` bez zmian. |

---

## 4. Prywatne metody i pola

### 4.1. Backend

- **Obliczanie przedziału dat:** funkcja pomocnicza (np. `getUpcomingDateRange(windowDays: number): { from: string; to: string }`) zwracająca `from`/`to` w formacie YYYY-MM-DD (timezone serwera lub UTC, spójnie z resztą aplikacji). Może być w `treatments.service.ts` lub w `lib/utils.ts` jeśli używana także gdzie indziej.
- **Mapowanie wierszy:** istniejąca `mapRowWithTemplate` w `treatments.service.ts` — używana przy `embed=template`, bez zmian.

### 4.2. Frontend

- **Obliczanie from/to w przeglądarce:** np. funkcja `getUpcomingDateRange(days: number): { from: string; to: string }` w `PageDashboard` lub w `lib/utils.ts`, używana tylko do budowy query params (dziś i dziś + `days` w formacie YYYY-MM-DD).
- **Query key:** `['lawn-profiles', profile?.id, 'treatments', from, to]` — opcjonalnie uwzględnić `from`/`to` w kluczu, aby cache był zgodny z oknem 10 dni.

---

## 5. Obsługa błędów

### 5.1. Scenariusze błędów (numerowane)

1. **Brak lub nieprawidłowy token JWT** — endpoint zwraca 401 Unauthorized; frontend przekierowuje do logowania (istniejąca obsługa w `PageDashboard`).
2. **Nieprawidłowy `lawnProfileId` (nie UUID)** — walidacja Zod w endpoincie → 400 z `details` (pole `lawnProfileId`).
3. **Profil trawnika nie istnieje** — `getLawnProfileOwnerId` zwraca `null` → 404 z komunikatem „Profil trawnika nie został znaleziony”.
4. **Użytkownik nie jest właścicielem profilu** — `ownerId !== userId` → 403 z komunikatem „Brak dostępu do tego profilu trawnika”.
5. **Nieprawidłowe parametry query (`from`/`to` nie YYYY-MM-DD lub `from` > `to`)** — Zod → 400 Validation error z `details`.
6. **Błąd zapytania do Supabase (getTreatmentsForLawn / getUpcomingTreatments)** — `catch` w endpoincie → 500, komunikat „Internal Server Error”; w logach: `console.error` z kodem i treścią błędu.
7. **Brak aktywnego profilu (frontend)** — użytkownik widzi formularz utworzenia profilu (obecne zachowanie).
8. **Błąd sieci lub 5xx przy pobieraniu zabiegów (frontend)** — toast błędu + przycisk „Ponów” (obecna obsługa w `PageDashboard`).
9. **Pusta lista** — zwracane `{ data: [], total: 0 }`; UI pokazuje „Brak nadchodzących zabiegów” w `TreatmentsList`.

### 5.2. Komunikaty

| Kontekst | Komunikat systemowy (log) | Komunikat użytkownika / API |
|----------|----------------------------|-----------------------------|
| 401 | — | „Unauthorized” (response); toast: „Sesja wygasła”, przekierowanie do logowania |
| 403 | — | „Forbidden”, message: „Brak dostępu do tego profilu trawnika” |
| 404 | — | „Not Found”, message: „Profil trawnika nie został znaleziony” |
| 400 (walidacja) | — | „Validation error”, details: [{ field, message }] |
| 500 | `console.error("GET .../treatments error:", e)` | „Internal Server Error” |
| Pusta lista | — | Tekst w UI: „Brak nadchodzących zabiegów” |

---

## 6. Kwestie bezpieczeństwa

1. **Autentykacja:** GET do zabiegów wymaga poprawnego JWT; brak tokena/wygasły token → 401. Użycie `getUserIdFromRequest` w endpoincie (obecna implementacja).
2. **Autoryzacja:** przed zwróceniem zabiegów sprawdzane jest, czy `lawn_profile.user_id === auth.uid()` przez `getLawnProfileOwnerId`; w przeciwnym razie 403.
3. **RLS:** zapytania wykonane przez `supabase` z kontekstem użytkownika; polityki RLS na `lawn_profiles` i `treatments` ograniczają dane do właściciela. Szablony (`treatment_templates`) są tylko do odczytu dla authenticated.
4. **Walidacja wejścia:** `lawnProfileId` (Zod UUID), `from`/`to` (Zod + regex YYYY-MM-DD, `from <= to`), `page`/`limit` w dozwolonych zakresach — zapobiega wstrzykiwaniu i nieprawidłowym zapytaniom.
5. **Okno czasowe:** ograniczenie do 10 dni (lub konfigurowalne `windowDays`) zmniejsza ryzyko nadmiernego ujawnienia danych i obciążenia zapytania.

---

## 7. Plan wdrożenia krok po kroku

### Krok 1: Stała i helper dat (backend)

- W `src/lib/services/treatments.service.ts` (lub `src/lib/utils.ts`) dodać:
  - Stałą `UPCOMING_TREATMENTS_DEFAULT_DAYS = 10`.
  - Funkcję `getUpcomingDateRange(windowDays: number): { from: string; to: string }` używającą aktualnej daty (np. UTC lub lokalna serwera) i zwracającą `from` w formacie YYYY-MM-DD oraz `to` = from + windowDays dni (włącznie).
- Przykład: dziś 2026-02-01, windowDays 10 → `from: "2026-02-01"`, `to: "2026-02-11"`.

### Krok 2: Funkcja serwisowa nadchodzących zabiegów

- W `src/lib/services/treatments.service.ts` dodać funkcję:
  - `getUpcomingTreatments(supabase, lawnProfileId, windowDays = UPCOMING_TREATMENTS_DEFAULT_DAYS)`.
  - Wewnętrznie wywołać `getUpcomingDateRange(windowDays)` i zbudować obiekt `GetTreatmentsQuerySchema`: `status: 'aktywny'`, `from`, `to`, `embed: 'template'`, `page: 1`, `limit: 100`, `sort: 'data_proponowana'`.
  - Wywołać istniejącą `getTreatmentsForLawn(supabase, lawnProfileId, query)` i zwrócić `{ data, total }`.
- Alternatywa: nie dodawać nowej funkcji, a w endpoincie (lub w jednym miejscu wywołania) zawsze obliczać `from`/`to` i przekazywać do `getTreatmentsForLawn`. Wtedy krok 2 ogranicza się do udokumentowania tego wzorca i ewentualnie helpera `getUpcomingDateRange`.

### Krok 3: API — parametry „nadchodzące”

- Endpoint GET `src/pages/api/lawn-profiles/[lawnProfileId]/treatments.ts` pozostaje bez zmian pod względem sygnatury.
- Dla wywołań „nadchodzące zabiegi” (np. z dashboardu) frontend będzie wysyłał query: `status=aktywny`, `from=<today>`, `to=<today+10>`, `embed=template`, `page=1`, `limit=100`.
- Opcjonalnie: dodać alias query `upcoming=1`; w endpoincie przy `upcoming=1` nadpisać `from`/`to` wartościami z `getUpcomingDateRange(10)` i wymusić `status=aktywny`, `embed=template` — wtedy frontend może wywołać tylko `?upcoming=1` zamiast ręcznie podawać daty. Wymaga rozszerzenia `getTreatmentsQuerySchema` o opcjonalny `upcoming: z.boolean().optional()` i logiki w endpoincie.

### Krok 4: Schemat odpowiedzi API (response_format)

Odpowiedź listy zabiegów (istniejąca) ma kształt:

```json
{
  "data": [
    {
      "id": "uuid",
      "lawn_profile_id": "uuid",
      "template_id": "uuid",
      "data_proponowana": "YYYY-MM-DD",
      "typ_generowania": "statyczny | dynamiczny",
      "uzasadnienie_pogodowe": "string | null",
      "status": "aktywny",
      "expires_at": "timestamp | null",
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "template": {
        "id": "uuid",
        "nazwa": "string",
        "typ_zabiegu": "koszenie | nawożenie | podlewanie | aeracja | wertykulacja",
        "minimalny_cooldown_dni": 7
      }
    }
  ],
  "total": 0
}
```

**Odpowiednik w formacie JSON Schema (dla narzędzi / dokumentacji), strict:**

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "upcoming_treatments_response",
    "strict": true,
    "schema": {
      "type": "object",
      "properties": {
        "data": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "lawn_profile_id": { "type": "string" },
              "template_id": { "type": "string" },
              "data_proponowana": { "type": "string" },
              "typ_generowania": { "type": "string", "enum": ["statyczny", "dynamiczny"] },
              "uzasadnienie_pogodowe": { "type": ["string", "null"] },
              "status": { "type": "string", "enum": ["aktywny", "wykonany", "odrzucony", "wygasły"] },
              "expires_at": { "type": ["string", "null"] },
              "created_at": { "type": "string" },
              "updated_at": { "type": "string" },
              "template": {
                "type": "object",
                "properties": {
                  "id": { "type": "string" },
                  "nazwa": { "type": "string" },
                  "typ_zabiegu": { "type": "string", "enum": ["koszenie", "nawożenie", "podlewanie", "aeracja", "wertykulacja"] },
                  "minimalny_cooldown_dni": { "type": "integer" }
                },
                "required": ["id", "nazwa", "typ_zabiegu", "minimalny_cooldown_dni"]
              }
            },
            "required": ["id", "lawn_profile_id", "template_id", "data_proponowana", "typ_generowania", "status", "created_at", "updated_at"]
          }
        },
        "total": { "type": "integer" }
      },
      "required": ["data", "total"]
    }
  }
}
```

### Krok 5: Frontend — stała i helper dat

- Np. w `src/lib/constants.ts` lub w `PageDashboard.tsx`: stała `UPCOMING_TREATMENTS_DAYS = 10`.
- Funkcja `getUpcomingDateRange(days: number): { from: string; to: string }` w przeglądarce (np. w `utils` lub lokalnie w komponencie), zwracająca daty w YYYY-MM-DD na podstawie `new Date()` (timezone użytkownika).

### Krok 6: Frontend — fetch z przedziałem 10 dni

- W `PageDashboard.tsx` w `fetchTreatments(lawnProfileId)`:
  - Obliczyć `const { from, to } = getUpcomingDateRange(UPCOMING_TREATMENTS_DAYS)`.
  - W `URLSearchParams` dodać: `from`, `to`, oraz istniejące: `status: 'aktywny'`, `page: '1'`, `limit: '20'` (lub 100), `embed: 'template'`.
- Zachować obsługę błędów i toasta oraz przekierowanie przy 401 (obecna implementacja).

### Krok 7: Query key (opcjonalnie)

- W `useQuery` dla zabiegów uwzględnić w `queryKey` przedział dat, np. `['lawn-profiles', profile?.id, 'treatments', from, to]`, aby cache był spójny z oknem 10 dni i uniknąć nieaktualnych danych po północy bez invalidacji.

### Krok 8: Testy

- **Jednostkowe (Vitest):** test `getUpcomingDateRange` (np. przy ustalonym `Date.now()`): sprawdzenie formatu YYYY-MM-DD i że `to - from` = windowDays (w dniach). Test `getUpcomingTreatments` z mockowanym Supabase: zwraca tylko wiersze z `data_proponowana` w [from, to] i statusem `aktywny`.
- **E2E (Playwright):** po zalogowaniu i z istniejącym profilem sprawdzenie, że lista zabiegów na dashboardzie zawiera tylko zabiegi z datą w najbliższych 10 dniach (np. seed z zabiegami w tym przedziale i poza nim) oraz że kliknięcie „Oznacz wykonanie” otwiera drawer i pozwala oznaczyć zabieg.

### Krok 9: Dokumentacja i code review

- Zaktualizować komentarze JSDoc przy `getTreatmentsForLawn` / `getUpcomingTreatments` (zakres dat, embed).
- W README lub .ai: krótka wzmianka, że „nadchodzące zabiegi” = zabiegi aktywne z `data_proponowana` w przedziale [dziś, dziś+10 dni], wyświetlane na dashboardzie i obsługiwane przez `CompleteTreatmentDrawer`.

---

## Podsumowanie

- **Usługa** = pobieranie zabiegów aktywnych z przedziałem `data_proponowana` w najbliższych 10 dniach, z danymi szablonu z `treatment_templates`.
- **Backend:** helper dat + istniejąca `getTreatmentsForLawn` z parametrami `from`/`to`/`status`/`embed` lub cienka funkcja `getUpcomingTreatments` opakowująca to samo.
- **API:** ten sam GET treatments z query `from`, `to`, `status=aktywny`, `embed=template`.
- **Frontend:** w dashboardzie wywołać fetch z `from`/`to` (okno 10 dni); lista w `TreatmentsList`, oznaczanie wykonania w `CompleteTreatmentDrawer` bez zmian.
- **Błędy:** 401, 403, 404, 400 (walidacja), 500 oraz pusta lista — każdy scenariusz ma określony komunikat systemowy i użytkownika.
- **Bezpieczeństwo:** JWT, weryfikacja własności profilu, RLS, walidacja wejścia i ograniczenie okna czasowego.

Po wdrożeniu tych kroków użytkownik po zalogowaniu zobaczy na liście tylko nadchodzące zabiegi do wykonania w najbliższych 10 dniach i będzie mógł je oznaczać jako wykonane w `CompleteTreatmentDrawer`.

---

## Wdrożone

- **Nadchodzące zabiegi** = zabiegi aktywne z `data_proponowana` w przedziale [dziś, dziś+10 dni] (UTC na backendzie, lokalny timezone na frontendzie), wyświetlane na dashboardzie w `TreatmentsList`, oznaczanie wykonania w `CompleteTreatmentDrawer`.
- Backend: `getUpcomingDateRange`, `getUpcomingTreatments`, alias API `upcoming=1`. Frontend: `UPCOMING_TREATMENTS_DAYS`, `getUpcomingDateRange` (utils), fetch z `from`/`to`, queryKey z przedziałem. Testy: Vitest (utils, schema, service), E2E (Playwright) w `e2e/upcoming-treatments.spec.ts`.

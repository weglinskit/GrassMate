# Plan testów – GrassMate

**Wersja:** 1.0  
**Projekt:** GrassMate MVP  
**Źródła:** struktura repozytorium, `.ai/tech-stack.md`, `.ai/prd.md`, kod w `src/`

Dokument definiuje strategię testowania aplikacji GrassMate w oparciu o realną architekturę i moduły projektu. Nie powiela planów implementacji z `.ai/` (dashboard-view, profile-view, endpointy), lecz wskazuje, **co** i **jak** testować.

---

## 1. Cel test planu

- **Zapewnienie jakości** krytycznych ścieżek: autentykacja, profil trawnika, lista zabiegów, oznaczenie zabiegu jako wykonany.
- **Wykrywanie regresji** przy zmianach w API, serwisach i middleware.
- **Dokumentacja zachowań** przez testy (schematy Zod, mapowanie błędów, kontrakty API).
- **Przygotowanie do CI/CD** (GitHub Actions według tech-stack) — testy jako element pipeline’u przed wdrożeniem na DigitalOcean.

---

## 2. Zakres testów

| Obszar | Lokalizacja w repo | Opis |
|--------|--------------------|------|
| **Autentykacja** | `src/lib/auth.server.ts`, `src/lib/auth.browser.ts`, `src/lib/auth.errors.ts`, `src/lib/schemas/auth.schema.ts`, `src/components/auth/*` | Weryfikacja JWT, mapowanie błędów Supabase, walidacja formularzy (login, rejestracja, reset hasła). |
| **Middleware** | `src/middleware/index.ts` | Ochrona ścieżek (`/`, `/profil`), publiczne (`/login`, `/rejestracja`, …), pomijanie `/api`, przekierowanie na login przy braku sesji. |
| **API – lawn-profiles** | `src/pages/api/lawn-profiles.ts`, `src/pages/api/lawn-profiles/active.ts`, `src/pages/api/lawn-profiles/[lawnProfileId]/index.ts`, `src/pages/api/lawn-profiles/[lawnProfileId]/treatments.ts` | POST/GET active/PATCH, GET treatments; walidacja body/query, 401/403/404/409/500. |
| **API – treatments** | `src/pages/api/treatments/[id]/complete.ts` | PATCH complete; walidacja body, weryfikacja własności, status „aktywny”. |
| **Serwisy** | `src/lib/services/lawn-profiles.service.ts`, `src/lib/services/treatments.service.ts` | Logika biznesowa: tworzenie/aktualizacja profilu, unikalność aktywnego profilu, listowanie zabiegów z filtrami, `completeTreatment`. |
| **Schematy Zod** | `src/lib/schemas/*.ts` | Poprawność walidacji (granice, enumy, refine) dla request body i query params. |
| **Komponenty React** | `src/components/auth/*`, `src/components/dashboard/*`, `src/components/profile/*` | Formularze, walidacja po stronie klienta, wywołania API (z mockami), stany ładowania/błędów. |
| **Konfiguracja i build** | `astro.config.mjs`, `package.json`, `tsconfig.json` | Build Astro (output: server, adapter: node), brak błędów TypeScript. |

---

## 3. Poza zakresem (na ten moment)

- **Integracja z Openrouter.ai** — w PRD/tech-stack wspomniana, brak implementacji w `src/`; gdy pojawią się endpointy/klient, dodać testy integracyjne.
- **Pogoda (weather_cache, Open-Meteo)** — typy w `src/types.ts` (WeatherForecastResponse itd.), brak endpointów w `src/pages/api/`; po implementacji — testy integracyjne i ewentualnie E2E.
- **Powiadomienia push / analytics_events** — tabele w migracjach, brak widocznych endpointów w repo; wyłącznie z zakresu gdy powstaną.
- **Testy wydajnościowe / obciążeniowe** — nie są priorytetem dla MVP; rozważyć przy skalowaniu (np. lista zabiegów przy dużym `limit`).
- **Testy dostępności (a11y)** — zalecane jako kolejny krok po ustabilizowaniu testów funkcjonalnych; można użyć `eslint-plugin-jsx-a11y` już obecnego w projekcie oraz narzędzi E2E (np. axe).

---

## 4. Strategia testowania

- **Piramida:** dużo testów jednostkowych (schematy, mapowanie błędów, serwisy z mockowanym Supabase), mniej testów integracyjnych (endpointy API z testowym klientem Supabase lub mockiem `locals`), kilka kluczowych E2E (logowanie, dashboard bez profilu → tworzenie profilu → lista zabiegów → complete).
- **Izolacja:** serwisy i auth — mock `SupabaseClient`; endpointy — mock `locals.supabase` i `getUserIdFromRequest` lub testowy użytkownik; komponenty React — mock `supabaseBrowser` / fetch.
- **Dane:** stałe fixture’y (UUID, daty YYYY-MM-DD, poprawne/niepoprawne body) w plikach lub katalogu `src/__fixtures__/` (lub `tests/fixtures/`), bez połączenia z prawdziwą bazą w testach jednostkowych i większości integracyjnych.
- **Środowisko:** testy jednostkowe i integracyjne uruchamiane w CI (Node); E2E — lokalnie lub w CI z headless przeglądarką i (opcjonalnie) lokalnym Supabase (np. `supabase start`).

---

## 5. Priorytety testowe

### 5.1. Krytyczne (must-have)

| # | Co testować | Dlaczego | Poziom |
|---|-------------|----------|--------|
| 1 | `getUserIdFromRequest` — brak nagłówka, nieprawidłowy token, poprawny Bearer | Każdy endpoint API zależy od tej funkcji; błąd = 401 lub nieprawidłowy dostęp. | Unit |
| 2 | `mapAuthErrorToMessage` — wszystkie gałęzie (invalid credentials, email not confirmed, already registered, rate limit, network, fallback) | Bezpieczeństwo: nie ujawniać wewnętrznych komunikatów Supabase (auth-spec). | Unit |
| 3 | Schematy Zod: `createLawnProfileSchema`, `updateLawnProfileSchema`, `getTreatmentsQuerySchema`, `completeTreatmentSchema` — granice (min/max), enumy, refine (from ≤ to) | Błędna walidacja = 400 z nieprawidłowymi danymi w bazie lub niekonsystentne API. | Unit |
| 4 | Serwis `createLawnProfile` — sukces, `UniqueActiveProfileError` (np. przy duplikacie is_active), błąd Supabase | Logika „jeden aktywny profil na użytkownika” jest kluczowa. | Unit (mock Supabase) |
| 5 | Serwis `updateLawnProfile` — 404 (profil nie istnieje), 403 (inny user), sukces, UniqueActiveProfileError | Poprawność autoryzacji i komunikatów. | Unit (mock Supabase) |
| 6 | Serwis `completeTreatment` — brak zabiegu, 403 (inny user), status ≠ „aktywny” (400), sukces | Centralna logika oznaczania zabiegu. | Unit (mock Supabase) |
| 7 | Middleware — ścieżki chronione vs publiczne vs skip; przekierowanie na `/login?returnUrl=…` gdy brak sesji i guard włączony | Nieprawidłowe zachowanie = wyciek chronionych stron lub zablokowanie logowania. | Unit / integracja (mock request, Astro middleware) |
| 8 | POST /api/lawn-profiles — 401 bez tokena, 400 (JSON/schema), 201 z ciałem, 409 przy UniqueActiveProfileError | Kontrakt API i bezpieczeństwo. | Integracja |
| 9 | GET /api/lawn-profiles/active — 401 bez tokena, 200 z data: null / data: LawnProfile | Podstawa dashboardu i profilu. | Integracja |
| 10 | PATCH /api/treatments/:id/complete — 401, 400 (walidacja/status), 403 (brak dostępu), 200 z data | Kluczowa akcja użytkownika. | Integracja |
| 11 | Przepływ E2E: logowanie → dashboard → brak profilu → utworzenie profilu → lista zabiegów → oznaczenie wykonania | Weryfikacja pełnej ścieżki użytkownika. | E2E |

### 5.2. Wysokie ryzyko

| # | Co testować | Dlaczego | Poziom |
|---|-------------|----------|--------|
| 12 | GET /api/lawn-profiles/:id/treatments — walidacja `lawnProfileId` (UUID), query (page, limit, from, to, sort, embed), 404/403, 200 z paginacją | Złożone parametry i autoryzacja. | Integracja |
| 13 | PATCH /api/lawn-profiles/:id — walidacja path i body, 404/403/409 | Spójność z serwisem i komunikatami. | Integracja |
| 14 | Serwis `getTreatmentsForLawn` — filtry, paginacja, embed template, mapowanie `treatment_templates` → `template` | Łatwo pomylić nazwy pól lub logikę range. | Unit (mock Supabase) |
| 15 | Schematy auth: `loginSchema`, `registerSchema`, `resetPasswordSchema` (refine: hasła muszą się zgadzać) | Błędna walidacja = nieprzyjemne UX lub słabe hasła. | Unit |
| 16 | Formularze auth (LoginForm, RegisterForm) — walidacja Zod przed submit, wyświetlanie błędów pól i toast | Duża powierzchnia użytkownika. | Unit (React Testing Library, mock Supabase) |
| 17 | CompleteTreatmentDrawer — walidacja daty YYYY-MM-DD, wywołanie PATCH z tokenem, obsługa błędu 400/403 | Bezpośredni wpływ na dane zabiegów. | Unit (mock fetch / API) |

### 5.3. Drugorzędne

| # | Co testować | Dlaczego | Poziom |
|---|-------------|----------|--------|
| 18 | `getLawnProfileOwnerId`, `getActiveLawnProfile`, `getLawnProfileById` — zwracane wartości i błędy | Pokrycie serwisów. | Unit |
| 19 | ProfileEditForm / ProfileCreateForm — walidacja, mapowanie błędów 400 na pola | Spójność z API. | Unit |
| 20 | Stany dashboardu (DashboardLoader, EmptyProfileState, ErrorState, TreatmentsList) — render przy różnych stanach | Stabilność UI. | Unit |
| 21 | Build Astro (`astro build`) i brak błędów TypeScript | Regresje konfiguracji. | Build / smoke |

---

## 6. Typy testów i narzędzia

### 6.1. Testy jednostkowe

- **Środowisko:** Node; runner: **Vitest** (dobra integracja z Vite/Astro, ESM, watch).
- **Co:**
  - Funkcje czyste: `src/lib/auth.errors.ts` (`mapAuthErrorToMessage`), `src/lib/auth.server.ts` (`getUserIdFromRequest` z mockiem Supabase).
  - Schematy Zod: `src/lib/schemas/*.ts` — `safeParse` z poprawnymi i niepoprawnymi danymi.
  - Serwisy: `src/lib/services/lawn-profiles.service.ts`, `treatments.service.ts` — mock `SupabaseClient` (np. zwracanie `{ data, error }`), sprawdzenie wyjątków i zwracanych wartości.
- **Narzędzia:** Vitest, `vi.fn()` / `vi.mocked()` dla Supabase; ewentualnie `zod` testy bez dodatkowych bibliotek.

### 6.2. Testy integracyjne API

- **Środowisko:** Node; Astro w trybie „test” lub bezpośrednie wywołanie handlerów endpointów (GET/POST/PATCH) z obiektem `{ request, locals, params }`.
- **Co:**
  - Request z/bez `Authorization: Bearer <token>`; nieprawidłowy JSON; niepoprawne body (Zod); brak `locals.supabase`.
  - Dla realistycznej integracji z bazą: opcjonalnie Supabase local (`supabase start`) i testowy użytkownik — osobna konfiguracja (np. `tests/setup-integration.ts`).
- **Narzędzia:** Vitest; budowanie `Request` i `locals` z mockiem Supabase lub prawdziwym klientem; asercje na `Response.status` i `Response.json()`.

### 6.3. Testy komponentów React

- **Środowisko:** Node (jsdom) lub happy-dom; Vitest + **React Testing Library**.
- **Co:**
  - Render formularzy (Login, Register, CompleteTreatmentDrawer, ProfileCreate/Edit); wpisanie niepoprawnych danych i sprawdzenie komunikatów; submit z mockiem (Supabase auth, fetch).
  - Komponenty prezentacyjne (EmptyProfileState, ErrorState, TreatmentCard) — render z props.
- **Narzędzia:** `@testing-library/react`, `@testing-library/user-event`; mock `@/db/supabase.browser`, `getAccessToken`, `fetch`.

### 6.4. Testy E2E

- **Środowisko:** Przeglądarka; serwer Astro (`astro preview` lub `astro dev`) + lokalny lub testowy Supabase.
- **Co:**
  - Logowanie na `/login` → przekierowanie na `/`; dashboard bez profilu → utworzenie profilu → widok listy; oznaczenie zabiegu jako wykonany (drawer) i odświeżenie listy.
  - Opcjonalnie: profil `/profil` — edycja i zapis (gdy PATCH jest dostępny).
- **Narzędzia:** **Playwright** (rekomendowany dla Astro, jeden runner dla Chromium/Firefox/WebKit); lub Cypress. Konfiguracja: `playwright.config.ts`, katalog `e2e/` z testami.

### 6.5. Testy kontraktowe

- **Cel:** Zgodność odpowiedzi API z typami (`src/types.ts`) i oczekiwanym kształtem (np. `{ data: LawnProfile }`, `{ data, total }`).
- **Realizacja:** W ramach testów integracyjnych API — asercje na strukturze JSON (np. expect(response).toMatchObject({ data: expect.objectContaining({ id: expect.any(String), nazwa: expect.any(String) }) })). Dla zaawansowanego kontraktu: np. schematy JSON Schema wygenerowane z Zod lub ręczne — opcjonalnie w późniejszej fazie.

### 6.6. Testy wydajnościowe

- **Na ten moment:** Poza zakresem (patrz sekcja 3). W przyszłości: np. GET treatments z dużym `limit`, liczba równoczesnych użytkowników — osobny dokument.

---

## 7. Obszary wysokiego ryzyka

| Obszar | Ryzyko | Rekomendacja testów |
|--------|--------|----------------------|
| **Middleware a env** | Zachowanie zależy od `PUBLIC_AUTH_GUARD_ENABLED`. Gdy wyłączony, chronione ścieżki są dostępne bez sesji. | Testy jednostkowe/integracyjne dla obu wartości zmiennej; w CI domyślnie guard włączony. |
| **JWT w API** | Wszystkie endpointy polegają na `getUserIdFromRequest`. Błędna implementacja = dostęp do cudzych danych. | Unit testy dla brak tokena, zły format, wygasły token; integracja: 401 bez nagłówka, 403 przy dostępie do cudzego profilu/zabiegu. |
| **Unikalność aktywnego profilu** | Constraint w bazie (unique na user_id + is_active) + `UniqueActiveProfileError`. | Unit test serwisu przy symulacji błędu 23505; integracja POST drugi aktywny profil → 409. |
| **Paginacja i filtry treatments** | Błędny `range` lub `from/to` = pusta lista lub duplikaty. | Unit test `getTreatmentsForLawn` z mockiem zwracającym określone wiersze; integracja z query `page`, `limit`, `from`, `to`. |
| **Mapowanie błędów Supabase** | `auth.errors` nie może ujawniać szczegółów (auth-spec). | Unit testy dla każdego znanego komunikatu Supabase i fallbacku. |
| **Reset hasła (token w URL)** | Nieprawidłowe odczytanie fragmentu/query = błąd lub niebezpieczeństwo. | Unit/integracja komponentu ResetPasswordForm i ewentualnie strony `reset-haslo.astro` (odczyt tokena). |

---

## 8. Propozycja organizacji testów w repozytorium

```
GrassMate/
├── src/
│   ├── lib/
│   │   ├── auth.errors.ts
│   │   ├── auth.server.ts
│   │   ├── schemas/
│   │   └── services/
│   └── ...
├── tests/
│   ├── unit/
│   │   ├── auth.errors.test.ts
│   │   ├── auth.server.test.ts
│   │   ├── schemas/
│   │   │   ├── auth.schema.test.ts
│   │   │   ├── lawn-profiles.schema.test.ts
│   │   │   ├── treatments.schema.test.ts
│   │   │   └── complete-treatment.schema.test.ts
│   │   └── services/
│   │       ├── lawn-profiles.service.test.ts
│   │       └── treatments.service.test.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── lawn-profiles.test.ts
│   │   │   ├── lawn-profiles-active.test.ts
│   │   │   ├── lawn-profiles-id.test.ts
│   │   │   ├── lawn-profiles-treatments.test.ts
│   │   │   └── treatments-complete.test.ts
│   │   └── middleware.test.ts
│   └── fixtures/
│       ├── auth.ts
│       ├── lawn-profiles.ts
│       └── treatments.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   └── playwright.config.ts
├── vitest.config.ts
├── vitest.workspace.ts        # opcjonalnie: unit + integration
└── package.json               # scripts: "test", "test:unit", "test:integration", "test:e2e"
```

- **Konwencja nazw:** `*.test.ts` (Vitest), `*.spec.ts` (Playwright E2E).
- **Import aliasy:** te same co w aplikacji (`@/lib/...`), skonfigurowane w `vitest.config.ts` (resolve.alias) i `tsconfig.json` (paths).

---

## 9. Rekomendacje i kolejne kroki

1. **Wprowadzić Vitest** — `npm i -D vitest @testing-library/react @testing-library/user-event jsdom`, skonfigurować `vitest.config.ts` z aliasami i środowiskiem jsdom dla React. Dodać skrypty: `"test": "vitest"`, `"test:run": "vitest run"`.
2. **Rozpocząć od testów jednostkowych** — `auth.errors.ts`, schematy Zod, potem `auth.server.getUserIdFromRequest` (mock Supabase), następnie serwisy lawn-profiles i treatments z mockiem Supabase.
3. **Dodać testy integracyjne API** — wywołanie handlerów Astro (export GET/POST/PATCH) z mockiem `locals.supabase` i requestem z tokenem; asercje na status i JSON. W razie potrzeby wspólny helper do generowania JWT testowego (np. Supabase `signInWithPassword` w skrypcie seed lub testowy token z projektem).
4. **Testy React (RTL)** — LoginForm, RegisterForm, CompleteTreatmentDrawer; mock `supabaseBrowser` i `getAccessToken`/fetch. Następnie ProfileCreateForm, ProfileEditForm, stany dashboardu.
5. **Middleware** — testy z mockiem `defineMiddleware`, requestem z odpowiednim pathname i (opcjonalnie) ciasteczkami sesji; sprawdzenie redirect vs next().
6. **E2E (Playwright)** — `npm i -D @playwright/test`, konfiguracja `playwright.config.ts`, 1–2 scenariusze: logowanie + dashboard (brak profilu → utworzenie → lista → complete). Uruchamianie przy `astro preview` lub w CI z buildem.
7. **CI (GitHub Actions)** — workflow: lint, `npm run build`, `npm run test:run` (Vitest); osobny job lub workflow dla E2E z uruchomionym Serwem i opcjonalnie lokalnym Supabase. Nie blokować merge tylko na E2E na start, jeśli brak infrastruktury.
8. **Dokumentacja** — w README sekcja „Testowanie”: jak uruchomić testy jednostkowe, integracyjne i E2E; wymagania (Node, opcjonalnie Docker dla Supabase).
9. **Kolejność wdrożenia** — (1) Vitest + unit auth + schematy, (2) unit serwisy, (3) integracja API, (4) middleware, (5) komponenty React, (6) E2E + CI.

---

*Plan testów dotyczy wyłącznie weryfikacji jakości i regresji; nie zastępuje planów implementacji funkcji (dashboard-view, profile-view, endpointy) ani specyfikacji (auth-spec, api-plan).*

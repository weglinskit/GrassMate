# Specyfikacja techniczna: Moduł rejestracji, logowania i odzyskiwania hasła

**Wersja:** 1.0  
**Projekt:** GrassMate MVP  
**Źródła:** PRD (`.ai/prd.md`), Tech Stack (`.ai/tech-stack.md`), UI Plan (`.ai/ui-plan.md`), API Plan (`.ai/api-plan.md`), Astro `astro.config.mjs` (output: server, adapter: node).

Specyfikacja opisuje architekturę modułu autentykacji użytkowników (rejestracja, logowanie, wylogowanie, odzyskiwanie hasła) w kontekście istniejącej aplikacji GrassMate. Nie zawiera implementacji kodu, lecz wskazuje komponenty, moduły, serwisy i kontrakty.

**Zakres względem PRD:** PRD sekcja 3.1.F wymienia „Rejestracja i logowanie przez e-mail + hasło” oraz przechowywanie historii i profilu w zewnętrznej bazie. Niniejsza specyfikacja w pełni realizuje ten wymóg. Dodatkowo obejmuje **odzyskiwanie hasła** (strony zapomniane-hasło, reset-hasło) jako standardowe uzupełnienie auth opartego na haśle — PRD tego nie wyklucza, a widok „Panel ustawień (konto)” (PRD sekcja 9) implikuje możliwość zarządzania kontem. **Google OAuth** pozostaje poza MVP (PRD sekcja 3.2: roadmapa).

---

## 1. Architektura interfejsu użytkownika

### 1.1. Przegląd zmian w warstwie frontendu

Aplikacja ma już zdefiniowane **ścieżki chronione** (`/`, `/profil`) oraz **ścieżkę publiczną** (`/login`) w middleware. Moduł auth rozszerza frontend o:

- **Nowe strony Astro** (publiczne): `/login`, `/rejestracja`, `/zapomniane-haslo`, `/reset-haslo`.
- **Nowy layout** (opcjonalny): layout dla stron auth (z uproszczonym headerem z linkiem do logowania).
- **Rozszerzenie middleware**: dodanie `/rejestracja`, `/zapomniane-haslo`, `/reset-haslo` do `PUBLIC_PATHS`; weryfikacja sesji przez Supabase SSR (cookies) zamiast placeholder `hasValidSession = false`.
- **Rozszerzenie layoutu chronionego**: brak zmian w strukturze `ProtectedLayout.astro`; ewentualnie dodanie w headerze akcji „Wyloguj” (client-side React lub link do endpointu wylogowania).

Strony auth **nie** używają `ProtectedLayout` — użytkownik niezalogowany musi mieć do nich dostęp. Zalogowany użytkownik wchodzący na `/login` lub `/rejestracja` powinien być przekierowany na `returnUrl` lub `/`.

---

### 1.2. Strony i komponenty

| Element | Typ | Ścieżka / lokalizacja | Odpowiedzialność |
|--------|-----|------------------------|------------------|
| **Strona logowania** | Astro | `src/pages/login.astro` | Render strony; przekazanie `returnUrl` z query do komponentu; brak nawigacji Dashboard/Profil lub uproszczony header (np. logo + „Nie masz konta? Zarejestruj się”). |
| **Formularz logowania** | React | np. `src/components/auth/LoginForm.tsx` | Pola: e-mail, hasło. Przycisk „Zaloguj się”. Wywołanie Supabase Auth `signInWithPassword`; przy sukcesie — ustawienie sesji (cookies przez klienta Supabase SSR) i przekierowanie na `returnUrl` lub `/`. Obsługa błędów (toast / komunikaty inline). |
| **Strona rejestracji** | Astro | `src/pages/rejestracja.astro` | Analogicznie do logowania: przekazanie `returnUrl`; link „Masz już konto? Zaloguj się” do `/login`. |
| **Formularz rejestracji** | React | np. `src/components/auth/RegisterForm.tsx` | Pola: e-mail, hasło, potwierdzenie hasła. Wywołanie `signUp`; obsługa potwierdzenia e-mail (jeśli włączone w Supabase): komunikat „Sprawdź skrzynkę”. Przekierowanie po sukcesie na `returnUrl` lub `/` lub na dedykowany ekran „Potwierdź e-mail”. |
| **Strona „Zapomniane hasło”** | Astro | `src/pages/zapomniane-haslo.astro` | Jedno pole: e-mail. Link powrotu do `/login`. |
| **Formularz zapomnianego hasła** | React | np. `src/components/auth/ForgotPasswordForm.tsx` | Pole e-mail; przycisk „Wyślij link do resetu”. Wywołanie `resetPasswordForEmail` z `redirectTo` wskazującym na `/reset-haslo`. Komunikat sukcesu: „Jeśli konto istnieje, wysłaliśmy link na podany adres” (bez ujawniania, czy e-mail jest w bazie). |
| **Strona resetu hasła** | Astro | `src/pages/reset-haslo.astro` | Obsługa wejścia z linku z e-maila (hash `#access_token=...&type=recovery` lub przekierowanie Supabase z tokenami). Render formularza ustawiania nowego hasła tylko gdy wykryto `type=recovery` (token w URL). |
| **Formularz nowego hasła** | React | np. `src/components/auth/ResetPasswordForm.tsx` | Pola: nowe hasło, potwierdzenie. Odczyt tokena z URL (fragment lub query); wywołanie `updateUser({ password })` z tokenem; przy sukcesie przekierowanie na `/login` z komunikatem (np. query `?message=password-reset`). |

**Layout dla stron auth:** Wspólny layout (np. `AuthLayout.astro`) dziedziczący po `Layout.astro` (globalne style, Toaster), z minimalnym headerem (logo GrassMate, ewentualnie link do `/login` / „Zarejestruj się”) i bez linków Dashboard/Profil. Strony `/login`, `/rejestracja`, `/zapomniane-haslo`, `/reset-haslo` używają tego layoutu.

---

### 1.3. Rozdzielenie odpowiedzialności: Astro vs React

- **Astro (strony):**
  - Odczyt `Astro.url.searchParams` (np. `returnUrl`, `message`) i przekazanie do komponentów React przez props.
  - Render HTML; brak logiki sesji po stronie Astro na stronach auth (sesja jest weryfikowana w middleware dla chronionych tras; dla `/login` opcjonalnie redirect zalogowanego użytkownika może być w middleware lub w React po mount).
  - Ewentualnie: w `login.astro` / `rejestracja.astro` odczyt sesji z `locals` (jeśli middleware ustawi tam użytkownika) i warunkowe przekierowanie zalogowanego użytkownika — aby uniknąć migotania, preferowane jest przekierowanie w middleware (patrz sekcja 3).

- **React (formularze i akcje):**
  - Wszystkie wywołania Supabase Auth: `signInWithPassword`, `signUp`, `signOut`, `resetPasswordForEmail`, `updateUser`.
  - Walidacja pól po stronie klienta (np. Zod w formularzach) przed wysłaniem do Supabase.
  - Nawigacja po sukcesie: `window.location.href` lub router Astro (np. View Transitions) do `returnUrl` lub `/`.
  - Wyświetlanie błędów: toast (sonner) oraz ewentualnie komunikaty inline przy polach (mapowanie błędów Supabase na pola).

Integracja z backendem autentykacji: backendem jest **Supabase Auth** (API Supabase), nie własne endpointy REST w `src/pages/api/`. Klient Supabase w przeglądarce musi być skonfigurowany do używania cookies (pakiet `@supabase/ssr`) tak, aby middleware i SSR mogły odczytać sesję.

---

### 1.4. Walidacja i komunikaty błędów

- **Walidacja po stronie klienta (Zod):**
  - E-mail: format adresu e-mail, wymagane.
  - Hasło (logowanie/rejestracja): wymagane; minimalna długość zgodna z polityką Supabase (np. 6 znaków).
  - Potwierdzenie hasła: zgodność z polem „hasło”; tylko w rejestracji i reset-hasło.
  - Nowe hasło (reset): wymagane, min. długość; potwierdzenie musi się zgadzać.

- **Mapowanie błędów Supabase na UX:**
  - `Invalid login credentials` → komunikat ogólny: „Nieprawidłowy e-mail lub hasło” (bez ujawniania, czy chodzi o e-mail czy hasło).
  - `Email not confirmed` → „Potwierdź adres e-mail — sprawdź skrzynkę”.
  - `User already registered` / konflikt → „Konto z tym adresem e-mail już istnieje. Zaloguj się lub użyj odzyskiwania hasła”.
  - Błędy rate limit / „Too many requests” → „Zbyt wiele prób. Spróbuj za chwilę”.
  - Błąd sieciowy → „Błąd połączenia. Sprawdź internet i spróbuj ponownie”.
  - Nie ujawniać wewnętrznych komunikatów Supabase (zgodnie z PRD/UI Plan).

- **Komunikaty sukcesu:**
  - Po rejestracji (gdy wymagane potwierdzenie e-mail): „Sprawdź skrzynkę i potwierdź adres e-mail”.
  - Po wysłaniu linku resetu: „Jeśli konto istnieje, wysłaliśmy link na podany adres”.
  - Po ustawieniu nowego hasła: przekierowanie na `/login?message=password-reset` i toast/komunikat „Hasło zostało zmienione. Zaloguj się”.

---

### 1.5. Kluczowe scenariusze

1. **Logowanie:** Użytkownik na `/login?returnUrl=/profil` → wypełnia e-mail i hasło → „Zaloguj się” → sukces → przekierowanie na `/profil`. Błąd → toast + ewentualnie inline przy polach.
2. **Rejestracja:** Użytkownik na `/rejestracja` → wypełnia e-mail, hasło, potwierdzenie → „Zarejestruj się” → sukces (z potwierdzeniem e-mail lub bez) → przekierowanie na `returnUrl` lub `/` lub komunikat „Sprawdź skrzynkę”.
3. **Zapomniane hasło:** Użytkownik na `/zapomniane-haslo` → podaje e-mail → „Wyślij link” → komunikat sukcesu (ogólny). Klik w link w e-mailu → przekierowanie na `/reset-haslo` z tokenem → użytkownik ustawia nowe hasło → sukces → redirect na `/login?message=password-reset`.
4. **Zalogowany wchodzi na /login:** Middleware lub strona wykrywa sesję → przekierowanie na `returnUrl` lub `/` bez renderowania formularza.
5. **Wylogowanie:** Z chronionego widoku (header) użytkownik klika „Wyloguj” → wywołanie `signOut()` (Supabase) + ewentualnie wyczyszczenie cookies po stronie klienta → przekierowanie na `/login`.
6. **Sesja wygasła na chronionej stronie:** API zwraca 401 → istniejąca logika w `PageDashboard` / `PageProfil` (toast „Sesja wygasła”, redirect na `/login?returnUrl=...`) pozostaje bez zmian.

---

## 2. Logika backendowa

### 2.1. Endpointy API i modele danych

Moduł auth **nie wprowadza nowych endpointów REST** w `src/pages/api/`. Rejestracja, logowanie, wylogowanie i odzyskiwanie hasła realizuje **Supabase Auth** (API Supabase). Zgodnie z API Plan: „Sign up / sign in are handled by Supabase Auth endpoints (not custom REST).”

**Istniejące endpointy API** (`/api/lawn-profiles`, `/api/lawn-profiles/active`, `/api/lawn-profiles/:id/treatments`, `/api/treatments/:id/complete`) wymagają aktualizacji: zamiast stałej `DEV_USER_ID` należy pobierać `userId` z JWT (sesji) zweryfikowanej przez Supabase. Kontrakt odpowiedzi i body tych endpointów się nie zmienia; zmienia się tylko sposób uzyskania użytkownika (patrz sekcja 3).

**Modele danych:** Brak nowych modeli domenowych po stronie aplikacji. Supabase Auth zarządza `auth.users`; aplikacja tylko odczytuje `user.id` (UUID) po weryfikacji JWT i używa go jako `user_id` w zapytaniach do `lawn_profiles`, `treatments` itd.

---

### 2.2. Walidacja danych wejściowych

- **Strony auth:** Walidacja wejścia użytkownika (e-mail, hasło) odbywa się w formularzach React (Zod); do Supabase wysyłane są tylko zwalidowane dane. Supabase Auth ma własne limity (np. długość hasła, polityka haseł) — komunikaty błędów z Supabase mapowane są na przyjazne komunikaty (patrz 1.4).
- **Endpointy API (lawn-profiles, treatments):** Istniejąca walidacja (Zod w `src/lib/schemas`) pozostaje; jedyna zmiana to źródło `userId`: z JWT z nagłówka `Authorization: Bearer <access_token>` lub z sesji odczytanej z cookies (w zależności od wybranej implementacji — patrz sekcja 3). Brak nowych schematów Zod dla auth (nie ma własnych body dla logowania/rejestracji w API).

---

### 2.3. Obsługa wyjątków

- **W middleware:** Jeśli weryfikacja sesji (Supabase `getUser`) rzuci wyjątek (np. błąd sieci do Supabase), zalecane zachowanie: traktować jako brak sesji i przekierować na `/login?returnUrl=...`, aby nie blokować użytkownika. Błędy logować po stronie serwera.
- **W endpointach API:** Brak lub nieprawidłowy JWT → 401 z `{ "error": "Unauthorized" }` (zgodnie z API Plan). Nie zmieniać formatu błędów 400, 403, 404, 500.
- **Po stronie klienta (formularze):** Błędy Supabase Auth obsługiwane w komponentach React i mapowane na toasty/komunikaty (patrz 1.4).

---

### 2.4. Renderowanie stron server-side (Astro)

- **astro.config.mjs:** Obecna konfiguracja (`output: "server"`, `adapter: node`) pozostaje. Strony auth (`/login`, `/rejestracja`, `/zapomniane-haslo`, `/reset-haslo`) są renderowane na serwerze na żądanie; nie wymagają `prerender`.
- **Middleware:** Wykonywane przed renderem każdej strony; tam następuje odczyt cookies, weryfikacja sesji Supabase i ewentualne przekierowanie. Strony auth nie powinny otrzymywać pełnego obiektu użytkownika w `locals` (opcjonalnie można ustawić `locals.user` dla wygodnego przekierowania „zalogowany wszedł na /login”).
- **Layouty:** `Layout.astro` i `ProtectedLayout.astro` bez zmian w kontekście SSR. Nowy `AuthLayout.astro` tylko opakowuje slot w uproszczony header; nie zależy od sesji w sposób wymagający dodatkowego fetchu.

---

## 3. System autentykacji (Supabase Auth + Astro)

### 3.1. Wykorzystanie Supabase Auth

- **Rejestracja:** `supabase.auth.signUp({ email, password })`. Opcjonalnie w Supabase Dashboard włącza się „Confirm email” — wtedy użytkownik musi kliknąć link w e-mailu zanim będzie mógł się zalogować; aplikacja wyświetla komunikat „Sprawdź skrzynkę”.
- **Logowanie:** `supabase.auth.signInWithPassword({ email, password })`. Sukces zwraca sesję; tokeny muszą być zapisane w cookies (patrz 3.2).
- **Wylogowanie:** `supabase.auth.signOut()`. Po stronie klienta (SSR) należy wywołać signOut i upewnić się, że cookies sesji są usunięte (pakiet `@supabase/ssr` to obsługuje przy prawidłowej konfiguracji).
- **Odzyskiwanie hasła:**
  - Krok 1: `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://domena.app/reset-haslo' })`. W Supabase w ustawieniach Auth dodaje się URL przekierowania (np. `/reset-haslo`).
  - Krok 2: Użytkownik klika link w e-mailu; Supabase przekierowuje na podany URL z tokenami w fragmencie (hash) lub w query (zależnie od konfiguracji). Aplikacja na stronie `/reset-haslo` odczytuje token (np. `type=recovery`, `access_token=...`) i renderuje formularz nowego hasła.
  - Krok 3: Z tokenem wywołanie `supabase.auth.updateUser({ password: newPassword })` (klient musi być ustawiony z sesją recovery, np. przez `setSession` z tokenem z URL). Po sukcesie przekierowanie na `/login?message=password-reset`.

Dokumentacja Supabase: Password-based Auth, Server-Side Rendering, `@supabase/ssr` (creating a client for SSR).

---

### 3.2. Integracja z Astro (SSR, cookies, middleware)

- **Pakiet:** Użycie `@supabase/ssr` obok `@supabase/supabase-js`. Klient przeglądarkowy i serwerowy muszą współdzielić sesję przez **cookies** (nie localStorage), aby middleware i API mogły odczytać użytkownika.

- **Klient serwerowy (middleware + API + strony Astro):**
  - W middleware i w endpointach API: tworzenie klienta Supabase przez `createServerClient` z `@supabase/ssr`, przekazując `request`, `response` (lub odpowiedniki w Astro) oraz funkcje do odczytu/zapisu cookies. Po utworzeniu klienta wywołanie `supabase.auth.getUser()` (lub równoważne) w celu weryfikacji sesji. W middleware: jeśli `getUser()` zwraca użytkownika i ścieżka jest chroniona — pozwolić; jeśli nie zwraca użytkownika i ścieżka jest chroniona — redirect na `/login?returnUrl=...`. Jeśli ścieżka jest publiczna (np. `/login`) i użytkownik jest zalogowany — opcjonalnie redirect na `returnUrl` lub `/`.
  - W `context.locals` można ustawić `supabase` (klient z sesją) oraz np. `user` (wynik `getUser()`), aby strony i API nie musiały ponownie wywoływać `getUser()`. Obecnie `context.locals.supabase` jest ustawiane w middleware; po wdrożeniu auth ten klient musi być utworzony przez `createServerClient` z obsługą cookies, a nie przez `createClient` z kluczem anon/service.

- **Klient przeglądarkowy (React):**
  - W komponentach React (formularze logowania, rejestracji itd.) używany jest klient Supabase stworzony przez `createBrowserClient` z `@supabase/ssr`, tak aby zapisywał/odczytywał sesję w cookies i był spójny z serwerem. Ten klient jest używany do `signInWithPassword`, `signUp`, `signOut`, `resetPasswordForEmail`, `updateUser`.

- **Pliki konfiguracyjne:**
  - **Serwer (middleware, API):** np. funkcja `createServerClient(request, response)` w `src/db/supabase.server.ts` (lub w tym samym pliku co middleware), używająca `Astro.cookies` lub request/response do odczytu/zapisu cookies. Middleware wywołuje tę funkcję i przypisuje wynik do `context.locals.supabase`; następnie wywołuje `getUser()` i ewentualnie ustawia `context.locals.user`.
  - **Klient (React):** np. `src/db/supabase.browser.ts` — `createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)`. Eksportowany singleton używany w komponentach auth. W pliku `.env` / `env.d.ts`: zmienne `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_ANON_KEY` (klucz anon, nie service_role) dla klienta przeglądarkowego.

- **Zmienne środowiskowe:** Obecne: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Dla klienta w przeglądarce potrzebne są `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_ANON_KEY` (klucz anon jest publiczny; service_role tylko na serwerze). W middleware/API używane są URL + anon lub service_role w zależności od potrzeby weryfikacji użytkownika (getUser wymaga klienta z tokenem użytkownika z cookies, więc typowo anon + cookies).

---

### 3.3. Przepływ sesji i guard

1. **Żądanie do chronionej strony (`/`, `/profil`):** Middleware odczytuje cookies, tworzy `createServerClient`, wywołuje `getUser()`. Brak użytkownika → `redirect('/login?returnUrl=' + encodeURIComponent(pathname))`. Obecność użytkownika → `next()`, strony renderują się z dostępem do `locals.supabase` i opcjonalnie `locals.user`.
2. **Żądanie do strony auth (`/login`, `/rejestracja`, …):** Middleware tworzy klienta i `getUser()`. Jeśli użytkownik zalogowany → redirect na `returnUrl` z query lub na `/` (aby nie pokazywać formularza logowania zalogowanemu).
3. **Wywołania API z chronionych widoków:** Klient React (fetch do `/api/...`) musi wysyłać token w nagłówku `Authorization: Bearer <access_token>`. Token jest dostępny po zalogowaniu — np. `supabase.auth.getSession()` w przeglądarce zwraca `session.access_token`. Każdy request do API (np. z React Query lub fetch) powinien dołączać ten nagłówek. Alternatywa: jeśli API i front działają w tej samej domenie i sesja jest w httpOnly cookies, serwer może odczytać sesję z cookies i nie wymagać Bearer w API (wtedy wystarczy, że middleware/request przekazuje cookies). Dokumentacja Supabase SSR opisuje przekazywanie cookies do requestów — w Astro adapter node przekazuje cookies w request, więc endpointy API mogą użyć tego samego `createServerClient(request)` i `getUser()` bez Bearer. Wybór: albo Bearer z klienta, albo cookies; zalecane dla spójności z istniejącym API Plan („Authorization: Bearer”) — token z sesji wstawiany w nagłówku przy każdym wywołaniu API z frontu.
4. **Włączenie guarda:** Obecnie guard jest warunkowy (`PUBLIC_AUTH_GUARD_ENABLED === "true"`). Po wdrożeniu auth ustawienie tej zmiennej na `true` włączy przekierowania na `/login` dla chronionych ścieżek.

---

### 3.4. Zgodność z istniejącą aplikacją

- **Middleware:** Rozszerzenie `PUBLIC_PATHS` o `/rejestracja`, `/zapomniane-haslo`, `/reset-haslo`. Zastąpienie placeholder `hasValidSession = false` logiką opartą na `getUser()` z `createServerClient` i cookies. Zachowanie `PROTECTED_PATHS = ["/", "/profil"]` i `SKIP_PATHS_PREFIX` bez zmian.
- **Strony `/` i `/profil`:** Bez zmian w plikach Astro (np. `index.astro`, `profil.astro`); nadal używają `ProtectedLayout` i komponentów React. Komponenty `PageDashboard` i `PageProfil` już obsługują 401 i redirect na `/login?returnUrl=...` — pozostawić bez zmian.
- **Endpointy API:** Zamiana `DEV_USER_ID` na `userId` z `locals.user.id` (lub z JWT zweryfikowanego w middleware/endpoincie). Serwis `lawn-profiles.service` i `treatments.service` przyjmują `userId` — sygnatury bez zmian; zmienia się tylko sposób przekazania `userId` z endpointu (z sesji zamiast stałej).
- **Typy:** W `env.d.ts` rozszerzenie `App.Locals` o opcjonalne pole `user: { id: string } | null` (lub typ użytkownika Supabase), jeśli middleware ustawi użytkownika w `locals`.

---

## 4. Zgodność z User Stories (PRD sekcja 4)

Poniższe mapowanie potwierdza, że każda User Story z PRD może być zrealizowana przy założeniu wdrożenia niniejszej specyfikacji auth oraz istniejących planów (dashboard, profil, API):

| User Story | Wymagania wobec auth | Realizacja w tej specyfikacji |
|------------|----------------------|--------------------------------|
| **4.1 Onboarding** — szybko rozpocząć z podstawowymi rekomendacjami bez znajomości parametrów trawnika | Rejestracja/logowanie bez blokowania; po wejściu dostęp do dashboardu. Profil trawnika jest opcjonalny (PRD 3.1.G). | Po rejestracji lub logowaniu przekierowanie na `returnUrl` lub `/`. Brak wymuszania uzupełnienia profilu przed wejściem na dashboard. |
| **4.2 Lista zabiegów** | Sesja użytkownika, dane zabiegów powiązane z `user_id`. | `userId` z sesji (JWT/cookies) w API; endpointy lawn-profiles i treatments używają `userId` z sesji. |
| **4.3 Dynamiczne rekomendacje** | To samo co 4.2. | Jak wyżej. |
| **4.4 Oznaczanie wykonania** | To samo co 4.2. | Jak wyżej. |
| **4.5 Historia** | To samo co 4.2. | Jak wyżej. |
| **4.6 Logowanie** — zalogować się na swój profil i mieć zapisane zabiegi niezależnie od urządzenia | Rejestracja, logowanie e-mail + hasło; sesja i trwałe powiązanie danych z użytkownikiem. | Pełna realizacja: sign up, sign in, sesja w cookies (Supabase SSR), `userId` w API; dane w bazie per użytkownik. |

**Wnioski:** Nie stwierdzono sprzeczności. Odzyskiwanie hasła (zapomniane-hasło, reset-hasło) nie jest wymienione w User Stories, ale jest spójne z PRD (widok „Panel ustawień (konto)”) i nie koliduje z żadną historyjką.

---

## 5. Podsumowanie i wnioski

- **Frontend:** Cztery nowe strony Astro (login, rejestracja, zapomniane-hasło, reset-haslo), wspólny layout auth, formularze React z walidacją Zod i integracją Supabase Auth; komunikaty błędów i sukcesu zgodne z PRD/UI Plan; obsługa `returnUrl` i przekierowanie zalogowanego użytkownika z stron auth.
- **Backend:** Brak nowych endpointów REST; aktualizacja istniejących endpointów API — pobieranie `userId` z sesji/JWT zamiast `DEV_USER_ID`; zachowanie kontraktów odpowiedzi i walidacji Zod.
- **Auth:** Supabase Auth dla sign up, sign in, sign out, reset password; integracja przez `@supabase/ssr` z cookies, `createServerClient` w middleware i API, `createBrowserClient` w React; middleware rozszerzone o weryfikację sesji i nowe ścieżki publiczne; po wdrożeniu włączenie guarda przez `PUBLIC_AUTH_GUARD_ENABLED=true`.

Ta specyfikacja pozwala wdrożyć moduł rejestracji, logowania i odzyskiwania hasła bez naruszania działania dashboardu, profilu trawnika i istniejących API.

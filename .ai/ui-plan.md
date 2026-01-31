# Architektura UI dla GrassMate

## 1. Przegląd struktury UI

Aplikacja GrassMate w wersji MVP składa się z **dwóch głównych widoków chronionych** (dashboard i profil trawnika), **jednego widoku publicznego** (logowanie) oraz **statycznej strony 404**. Wszystkie trasy oprócz `/login` i `/404` są chronione guardem autoryzacji: brak ważnego tokena JWT skutkuje przekierowaniem na `/login?returnUrl=<ścieżka>`. Po zalogowaniu użytkownik wraca na `returnUrl` lub na stronę główną.

**Dashboard** (`/`) jest widokiem warunkowym: najpierw pobierany jest aktywny profil (`GET /api/lawn-profiles/active`). Jeśli wynik to `null`, użytkownik od razu widzi formularz tworzenia trawnika (bez osobnego ekranu „brak profilu”). Jeśli profil istnieje, pobierana jest lista zabiegów (`GET /api/lawn-profiles/:lawnProfileId/treatments`), a użytkownik widzi listę nadchodzących zabiegów z możliwością oznaczenia wykonania w drawerze. **Profil trawnika** (`/profil`) to osobny widok z danymi z aktywnego profilu i edycją in-place (jeden formularz, przycisk „Zapisz”, jeden PATCH — z założeniem, że endpoint `PATCH /api/lawn-profiles/:id` zostanie udostępniony; w przeciwnym razie widok w trybie tylko do odczytu z wyłączonym „Zapisz”).

Struktura opiera się na **Astro 5** (strony, layouty, middleware), **React 19** (komponenty interaktywne: formularze, lista zabiegów, drawer), **Tailwind 4** i **Shadcn/ui**. Stan i pobieranie danych realizowane są przez prosty mechanizm z invalidacją (np. React Query lub SWR). Walidacja współdzielona (Zod w `src/lib/schemas`) jest używana w formularzach i w API, co zapewnia spójne reguły i mapowanie błędów 400 na pola. Design jest minimalny, „lifestylowy”, lekki, w klimacie ogrodniczym; MVP zakłada aplikację desktopową (brak wymagań responsywności).

---

## 2. Lista widoków

### 2.1. Dashboard (strona główna)

| Aspekt | Opis |
|--------|------|
| **Nazwa** | Dashboard |
| **Ścieżka** | `/` |
| **Główny cel** | Pokazanie użytkownikowi nadchodzących zabiegów do wykonania lub — przy braku profilu — umożliwienie utworzenia pierwszego profilu trawnika w tym samym widoku. |
| **Kluczowe informacje** | (a) Gdy brak profilu: formularz tworzenia (nazwa, latitude, longitude oraz opcjonalnie wielkość_m2, nasłonecznienie, rodzaj_powierzchni). (b) Gdy jest profil: lista zabiegów (np. status=aktywny, zakres dat) z danymi zabiegu (nazwa/szablon, data proponowana, uzasadnienie pogodowe, status), przycisk/akcja „Oznacz wykonanie” przy każdym elemencie. |
| **Kluczowe komponenty** | Layout z headerem; komponent stanu ładowania (skeleton/spinner); formularz tworzenia profilu (React); lista zabiegów (React); drawer „Oznacz wykonanie” (wybór daty wykonania, przycisk „Oznacz jako wykonane”); toasty dla komunikatów sukcesu/błędów. |
| **UX, dostępność, bezpieczeństwo** | Cztery stany: (1) ładowanie profilu (GET active), (2) brak profilu → formularz, (3) jest profil → ładowanie listy zabiegów, (4) lista załadowana lub pusty stan z komunikatem. Jeden spójny wzorzec ładowania (np. skeleton). Po POST 201 (utworzenie profilu) — refetch active + treatments, przełączenie na listę bez przekierowania; opcjonalnie toast „Profil utworzony”. Drawer zamykany po udanym PATCH complete; invalidacja listy zabiegów. Guard: tylko zalogowani; niezalogowani przekierowani na `/login?returnUrl=/`. Błędy API: 401 → wylogowanie + redirect; 403/404 → toast; 400 → inline przy polach (formularz profilu); 429/500 → toast (500 z opcją ponowienia). |

### 2.2. Profil trawnika

| Aspekt | Opis |
|--------|------|
| **Nazwa** | Profil trawnika |
| **Ścieżka** | `/profil` |
| **Główny cel** | Wyświetlenie danych aktywnego profilu trawnika i umożliwienie edycji in-place (jedna akcja „Zapisz” i jeden request PATCH), z zachowaniem spójności z API i wspólną walidacją. |
| **Kluczowe informacje** | Dane z `GET /api/lawn-profiles/active`: nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude (oraz ewentualnie is_active, daty). Formularz wypełniony tymi danymi; użytkownik edytuje pola i klika „Zapisz” → PATCH `/api/lawn-profiles/:id` (gdy endpoint dostępny). |
| **Kluczowe komponenty** | Layout z headerem; formularz profilu (React) z polami zgodnymi ze schematem Zod; przycisk „Zapisz”; obsługa stanu ładowania (pobieranie active) i pustego stanu (brak profilu — wówczas np. link do dashboardu lub komunikat). |
| **UX, dostępność, bezpieczeństwo** | Edycja in-place, bez trybu „podgląd”. Błędy walidacji 400: mapowanie `details` na pola formularza, komunikaty inline; ewentualnie krótki komunikat u góry formularza. Jeśli PATCH nie jest wdrożony w MVP: widok tylko do odczytu, przycisk „Zapisz” wyłączony. Guard jak na dashboardzie. Wspólny schemat Zod z API. |

### 2.3. Logowanie

| Aspekt | Opis |
|--------|------|
| **Nazwa** | Logowanie |
| **Ścieżka** | `/login` |
| **Główny cel** | Uwierzytelnienie użytkownika (e-mail + hasło) przez Supabase Auth i przekierowanie na `returnUrl` (z query) lub na `/`. |
| **Kluczowe informacje** | Formularz: e-mail, hasło; opcjonalnie link do rejestracji (jeśli Supabase Auth obsługuje rejestrację z poziomu tej samej ścieżki lub osobnej). Komunikat o wygaśnięciu sesji po przekierowaniu z 401 (opcjonalnie toast). |
| **Kluczowe komponenty** | Strona Astro z formularzem logowania (React); obsługa `returnUrl` z query; integracja z Supabase Auth (sign in); przekierowanie po sukcesie. |
| **UX, dostępność, bezpieczeństwo** | Jedna ścieżka `/login`; zapis i użycie `returnUrl`; po zalogowaniu przekierowanie na `returnUrl` lub `/`. Nie ujawniać wewnętrznych szczegółów przy błędach auth. Publiczna trasa — bez guarda wymagającego tokena. |

### 2.4. Strona 404

| Aspekt | Opis |
|--------|------|
| **Nazwa** | Nie znaleziono |
| **Ścieżka** | `/404` (lub odpowiednik w Astro dla nieznanych ścieżek) |
| **Główny cel** | Poinformowanie użytkownika, że strona nie istnieje, i umożliwienie powrotu na stronę główną. |
| **Kluczowe informacje** | Krótki komunikat (np. „Strona nie została znaleziona”); link „Strona główna” do `/`. |
| **Kluczowe komponenty** | Statyczna strona Astro (`src/pages/404.astro`); link do `/`. |
| **UX, dostępność, bezpieczeństwo** | Brak sprawdzania auth; minimalna treść. Odpowiedni nagłówek HTTP 404. |

---

## 3. Mapa podróży użytkownika

- **Wejście do aplikacji (niezalogowany):** Użytkownik wchodzi na `/` lub `/profil` → middleware wykrywa brak tokena → przekierowanie na `/login?returnUrl=/` (lub `/profil`). Na `/login` użytkownik podaje e-mail i hasło → logowanie przez Supabase Auth → przekierowanie na `returnUrl` lub `/`.

- **Wejście na dashboard (zalogowany):** Użytkownik otwiera `/`. (1) Aplikacja pokazuje stan ładowania (skeleton). (2) GET `/api/lawn-profiles/active`. (3a) Jeśli `data === null`: wyświetlenie formularza tworzenia trawnika. Użytkownik wypełnia wymagane pola (nazwa, latitude, longitude) i opcjonalne → wysyła POST `/api/lawn-profiles`. Przy 201: refetch active, fetch treatments, UI przełącza się na listę zabiegów na tej samej stronie; opcjonalnie toast „Profil utworzony”. (3b) Jeśli profil jest: GET `/api/lawn-profiles/:lawnProfileId/treatments` (np. status=aktywny, zakres dat). Lista zabiegów jest wyświetlana; przy każdym zabiegu akcja „Oznacz wykonanie” otwiera drawer. W drawerze użytkownik wybiera datę wykonania (domyślnie dziś) i klika „Oznacz jako wykonane” → PATCH `/api/treatments/:id/complete`. Po sukcesie drawer się zamyka, lista zabiegów jest invalidowana i odświeżana.

- **Przejście do profilu:** Z headeru użytkownik klika „Profil” → przejście na `/profil`. Pobierane są dane GET `/api/lawn-profiles/active`; formularz jest wypełniony. Użytkownik edytuje pola i klika „Zapisz” → PATCH `/api/lawn-profiles/:id` (jeśli dostępny). Po sukcesie: opcjonalnie toast; dane odświeżone.

- **Powrót na dashboard:** Z headeru link „Dashboard” (lub nazwa aplikacji) → `/`. Ponownie sekwencja active → lista lub formularz tworzenia.

- **Nieznana ścieżka:** Użytkownik wchodzi na nieistniejący URL → wyświetlenie strony 404 z linkiem „Strona główna” do `/`. Auth nie jest sprawdzane.

Główny przypadek użycia (lista zabiegów i oznaczenie wykonania): zalogowany użytkownik z istniejącym profilem → dashboard → lista zabiegów → „Oznacz wykonanie” → drawer → wybór daty → „Oznacz jako wykonane” → zamknięcie drawera i odświeżenie listy.

---

## 4. Układ i struktura nawigacji

- **Nawigacja globalna:** Header obecny na wszystkich chronionych widokach (dashboard, profil) oraz ewentualnie na stronie logowania i 404 (w zależności od wyboru wizualnego). W headerze: link do **Dashboard** (lub nazwa aplikacji „GrassMate”) → `/`; link **Profil** → `/profil`. W MVP brak bocznego menu, stopki i dodatkowych linków.

- **Guard i przekierowania:** Middleware (lub layout) sprawdza zalogowanie przed renderem chronionych tras. Brak tokena → redirect na `/login?returnUrl=<obecna_ścieżka>`. Po zalogowaniu przekierowanie na `returnUrl` lub `/`. Dzięki sprawdzaniu przed renderem unika się migotania i zbędnych wywołań API po stronie chronionych widoków.

- **Strony:** Dwa główne routy aplikacji: `/` (dashboard) i `/profil` (profil trawnika). Osobne widoki, nie zakładki w jednej stronie. Login i 404 jako osobne strony.

---

## 5. Kluczowe komponenty

- **Header / Nawigacja** — Globalny pasek z linkami do `/` i `/profil`; spójny na dashboardzie i profilu. Może zawierać nazwę aplikacji (link do `/`).

- **Layout chroniony** — Layout Astro/React obejmujący `/` i `/profil`, w którym renderowana jest nawigacja i treść; współpracuje z guardem (middleware) tak, że chronione strony renderują się tylko dla zalogowanych.

- **Komponent ładowania (skeleton / spinner)** — Jeden spójny wzorzec używany na dashboardzie dla stanów: ładowanie active, ładowanie listy zabiegów. Może być reużyty na stronie profilu przy pobieraniu active.

- **Formularz tworzenia profilu trawnika** — Pola: nazwa (wymagane), latitude, longitude (wymagane), wielkość_m2, nasłonecznienie, rodzaj_powierzchni (opcjonalne/z domyślnymi). Wspólny schemat Zod; wysyłka POST `/api/lawn-profiles`. Obsługa błędów 400 z mapowaniem `details` na pola (inline).

- **Formularz edycji profilu** — Te same pola co przy tworzeniu, wypełnione danymi z GET active. Przycisk „Zapisz” → PATCH `/api/lawn-profiles/:id`. Jeśli endpoint niedostępny w MVP: tylko odczyt, „Zapisz” wyłączony. Wspólna walidacja i obsługa 400.

- **Lista zabiegów** — Wyświetla elementy z GET treatments (np. nazwa/szablon, data proponowana, uzasadnienie pogodowe). Przy każdym elemencie akcja otwierająca drawer „Oznacz wykonanie”. Obsługa pustego stanu (komunikat/CTA).

- **Drawer „Oznacz wykonanie”** — Zawiera pole wyboru daty wykonania (domyślnie dziś) oraz przycisk „Oznacz jako wykonane”. Wysyłka PATCH `/api/treatments/:id/complete`. Po sukcesie: zamknięcie drawera, invalidacja listy zabiegów. W MVP bez opcji „Odrzuć”.

- **Toasty (powiadomienia)** — Komunikaty sukcesu (np. „Profil utworzony”, „Zabieg oznaczony jako wykonany”) oraz błędów z API: 403, 404, 429, 500 (ogólny komunikat + ewentualnie ponowienie przy 500). 401 obsługiwane przez wylogowanie i redirect, bez konieczności toastu lub z opcjonalnym „Sesja wygasła”.

- **Obsługa błędów formularza** — Wspólny wzorzec dla 400: mapowanie `details` z odpowiedzi API na pola formularza (inline); opcjonalnie krótki komunikat u góry formularza.

- **Guard autoryzacji** — Logika w middleware (lub layout): odczyt tokena, weryfikacja; brak tokena → redirect na `/login?returnUrl=...`. Jedna ścieżka logowania i spójne przekierowanie po zalogowaniu.

Te komponenty zapewniają spójne UX, nawigację i obsługę błędów w całej aplikacji oraz zgodność z planem API i decyzjami z sesji planowania.

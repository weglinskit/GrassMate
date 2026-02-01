# Plan implementacji widoku Dashboard

## 1. Przegląd

Dashboard jest głównym widokiem aplikacji GrassMate dostępnym pod ścieżką `/`. Pełni rolę punktu wejścia dla zalogowanego użytkownika: wyświetla nadchodzące zabiegi do wykonania lub — przy braku profilu trawnika — umożliwia utworzenie pierwszego profilu w tym samym widoku. Widok realizuje user stories dotyczące onboardingu, listy zabiegów oraz oznaczania wykonania zabiegów.

## 2. Routing widoku

- **Ścieżka:** `/`
- **Plik strony:** `src/pages/index.astro`
- **Ochrona:** Tylko zalogowani użytkownicy. Niezalogowani przekierowywani na `/login?returnUrl=/` (guard autoryzacji musi zostać wdrożony w middleware).

## 3. Struktura komponentów

```
Layout (header + slot)
└── PageDashboard (index.astro)
    ├── DashboardLoader (skeleton/spinner)
    │   └── [stan ładowania]
    ├── ProfileCreateForm (gdy brak profilu)
    │   └── Pola formularza + przycisk „Utwórz profil”
    └── TreatmentsList (gdy jest profil)
        ├── TreatmentCard (dla każdego zabiegu)
        │   └── Przycisk „Oznacz wykonanie”
        └── CompleteTreatmentDrawer
            ├── DatePicker (data wykonania)
            └── Przycisk „Oznacz jako wykonane”
```

**Hierarchia:**
- **Layout** — globalny layout z headerem (linki: Dashboard, Profil).
- **PageDashboard** — główny kontener widoku, zarządzający stanami (ładowanie, brak profilu, lista zabiegów).
- **DashboardLoader** — komponent skeleton/spinner dla stanów ładowania.
- **ProfileCreateForm** — formularz React do tworzenia profilu trawnika.
- **TreatmentsList** — lista zabiegów (React).
- **TreatmentCard** — pojedyncza karta zabiegu z akcją „Oznacz wykonanie”.
- **CompleteTreatmentDrawer** — drawer (Sheet z Shadcn/ui) z formularzem oznaczenia wykonania.

## 4. Szczegóły komponentów

### Layout z headerem

- **Opis:** Globalny layout obejmujący chronione widoki. Zawiera header z nawigacją (link do Dashboard `/`, link do Profil `/profil`). Może być rozszerzeniem istniejącego `Layout.astro` lub osobnym `ProtectedLayout.astro`.
- **Główne elementy:** `<header>`, `<nav>`, linki, `<main>` z `<slot />`.
- **Obsługiwane interakcje:** Kliknięcie w linki nawigacji.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak specyficznych DTO.
- **Propsy:** `title?: string` (opcjonalnie), `slot` (treść strony).

### DashboardLoader

- **Opis:** Komponent wyświetlający stan ładowania w spójny sposób (skeleton lub spinner). Używany podczas pobierania aktywnego profilu oraz podczas pobierania listy zabiegów.
- **Główne elementy:** Skeleton (Shadcn/ui) lub Spinner, układ symulujący przyszłą treść (np. placeholder dla listy).
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:** Opcjonalnie `variant?: 'profile' | 'treatments'` — różne warianty skeleton w zależności od ładowanego zasobu.

### ProfileCreateForm

- **Opis:** Formularz React do tworzenia profilu trawnika. Pola: nazwa (wymagane), latitude, longitude (wymagane), wielkość_m2, nasłonecznienie, rodzaj_powierzchni (opcjonalne). Wysyła POST `/api/lawn-profiles`.
- **Główne elementy:** `<form>`, Input (nazwa, latitude, longitude, wielkość_m2), Select (nasłonecznienie), Input (rodzaj_powierzchni), Button „Utwórz profil”. Pola z błędami inline (np. Label z aria-describedby, Input aria-invalid, Text opisujący błąd).
- **Obsługiwane interakcje:** `onSubmit` — walidacja po stronie klienta (Zod), wysłanie POST, obsługa odpowiedzi.
- **Obsługiwana walidacja:**
  - nazwa: min 1 znak, max 255 znaków;
  - latitude: -90 ≤ wartość ≤ 90;
  - longitude: -180 ≤ wartość ≤ 180;
  - wielkość_m2: > 0 (domyślnie 100);
  - nasłonecznienie: enum „niskie” | „średnie” | „wysokie” (domyślnie „średnie”);
  - rodzaj_powierzchni: opcjonalny string.
- **Typy:** `CreateLawnProfileCommand`, `LawnProfile` (odpowiedź).
- **Propsy:** `onSuccess?: (profile: LawnProfile) => void` — callback po udanym 201; `onError?: (details: ValidationErrorDetail[]) => void` — opcjonalnie do przekazania błędów wyżej.

### TreatmentsList

- **Opis:** Lista zabiegów pobranych z GET `/api/lawn-profiles/:lawnProfileId/treatments`. Wyświetla TreatmentCard dla każdego zabiegu. Obsługuje stan pusty (komunikat/CTA).
- **Główne elementy:** Lista (ul/ol lub div z role), `TreatmentCard` dla każdego elementu. Stan pusty: komunikat (np. „Brak nadchodzących zabiegów”) + opcjonalnie CTA.
- **Obsługiwane interakcje:** Brak bezpośrednich; deleguje otwarcie drawera do TreatmentCard.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `Treatment[]` lub `TreatmentWithEmbedded[]`.
- **Propsy:** `treatments: Treatment[]`, `onMarkComplete?: (treatment: Treatment) => void`.

### TreatmentCard

- **Opis:** Karta pojedynczego zabiegu. Wyświetla: nazwę/szablon, datę proponowaną, uzasadnienie pogodowe, status. Przycisk/akcja „Oznacz wykonanie” otwiera drawer.
- **Główne elementy:** Karta (Card z Shadcn/ui lub div), tekst z danymi zabiegu, Button „Oznacz wykonanie”.
- **Obsługiwane interakcje:** Kliknięcie „Oznacz wykonanie” → wywołanie callbacku z danymi zabiegu.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `Treatment`, `TreatmentWithEmbedded` (dla nazwy z template.nazwa).
- **Propsy:** `treatment: Treatment | TreatmentWithEmbedded`, `onMarkComplete?: (treatment: Treatment) => void`.

### CompleteTreatmentDrawer

- **Opis:** Drawer (Sheet) z formularzem oznaczenia wykonania zabiegu. Zawiera pole wyboru daty wykonania (domyślnie dziś) oraz przycisk „Oznacz jako wykonane”. Wysyła PATCH `/api/treatments/:id/complete`.
- **Główne elementy:** Sheet (Shadcn/ui), formularz z DatePicker/Input type=date, Button „Oznacz jako wykonane”. Możliwość zamknięcia przez overlay lub przycisk X.
- **Obsługiwane interakcje:** `onOpenChange` — zamknięcie drawera; submit — walidacja daty, wysłanie PATCH, zamknięcie przy sukcesie.
- **Obsługiwana walidacja:** data_wykonania_rzeczywista — format YYYY-MM-DD, opcjonalna (domyślnie dziś).
- **Typy:** `Treatment`, `CompleteTreatmentCommand`, `Treatment` (odpowiedź).
- **Propsy:** `open: boolean`, `onOpenChange: (open: boolean) => void`, `treatment: Treatment | null`, `onSuccess?: () => void`, `onError?: (message: string) => void`.

## 5. Typy

### Istniejące typy (z `src/types.ts`)

- **LawnProfile** — profil trawnika: id, user_id, nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude, is_active, created_at, updated_at.
- **Treatment** — zabieg: id, lawn_profile_id, template_id, data_proponowana, typ_generowania, uzasadnienie_pogodowe, status, expires_at, created_at, updated_at.
- **TreatmentWithEmbedded** — Treatment + opcjonalne template, lawn_profile.
- **TreatmentTemplateSummary** — id, nazwa, typ_zabiegu, minimalny_cooldown_dni.
- **CreateLawnProfileCommand** — nazwa, latitude, longitude (wymagane); wielkość_m2?, nasłonecznienie?, rodzaj_powierzchni?, is_active?.
- **CompleteTreatmentCommand** — data_wykonania_rzeczywista?: string (YYYY-MM-DD).
- **PaginatedResponse\<T\>** — `{ data: T[], total: number }`.

### Nowe typy / ViewModel

- **ValidationErrorDetail** — `{ field: string; message: string }` — format błędów walidacji z API (details jako tablica).
- **ApiErrorResponse** — `{ error: string; details?: ValidationErrorDetail[]; message?: string }` — wspólny kształt odpowiedzi błędu API.
- **DashboardState** — `'loading_profile' | 'no_profile' | 'loading_treatments' | 'treatments_loaded' | 'error'` — stan widoku dashboardu.

## 6. Zarządzanie stanem

Widok Dashboard wymaga zarządzania następującymi stanami:

1. **Stan widoku:** `DashboardState` — określa, który komponent wyświetlić.
2. **Profil:** `LawnProfile | null` — wynik GET active.
3. **Zabiegi:** `Treatment[]` — wynik GET treatments.
4. **Drawer:** `open: boolean`, `selectedTreatment: Treatment | null` — stan drawera „Oznacz wykonanie”.
5. **Błędy globalne:** np. toast message — 403, 404, 429, 500.

**Zalecane podejście:** React Query (TanStack Query) lub SWR do pobierania danych z cache i invalidacji. Stan drawera — `useState` w komponencie nadrzędnym. Błędy — Sonner/Toaster z Shadcn/ui.

**Custom hook (opcjonalnie):** `useDashboard()` — encapsuluje:
- `useQuery` dla GET active,
- `useQuery` dla GET treatments (enabled gdy profil istnieje),
- `useMutation` dla POST lawn-profiles,
- `useMutation` dla PATCH complete,
- logikę przełączania stanów (no_profile → treatments_loaded po sukcesie POST).

Jeśli nie używamy React Query: `useState` + `useEffect` dla fetchów, z ręczną invalidacją (refetch po mutacjach).

## 7. Integracja API

### GET /api/lawn-profiles/active

- **Żądanie:** GET, bez body. Nagłówek `Authorization: Bearer <token>` (gdy auth wdrożony).
- **Odpowiedź 200:** `{ data: LawnProfile | null }`.
- **Błędy:** 401 Unauthorized.
- **Akcja frontendu:** Zapisać `data` w stanie. Gdy `null` → stan `no_profile`. Gdy obiekt → stan `loading_treatments`, następnie fetch treatments.

### POST /api/lawn-profiles

- **Żądanie:** POST, body zgodny z `CreateLawnProfileCommand` (JSON).
- **Odpowiedź 201:** `{ data: LawnProfile }`.
- **Błędy:** 400 Validation error (`details: [{ field, message }]`), 401, 409 (UniqueActiveProfileError).
- **Akcja frontendu:** Przy 201 — invalidacja active, invalidacja treatments (jeśli używamy React Query), przełączenie na listę zabiegów, opcjonalnie toast „Profil utworzony”. Przy 400 — mapowanie details na pola formularza (inline).

### GET /api/lawn-profiles/:lawnProfileId/treatments

- **Żądanie:** GET, query: `status=aktywny`, `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, `page=1`, `limit=20`, `sort=data_proponowana`, `embed=template` (opcjonalnie).
- **Odpowiedź 200:** `{ data: Treatment[] | TreatmentWithEmbedded[], total: number }`.
- **Błędy:** 401, 403, 404.
- **Akcja frontendu:** Zapisać `data` w stanie. Gdy 403/404 — toast. Stan `treatments_loaded`.

### PATCH /api/treatments/:id/complete

- **Żądanie:** PATCH, body: `{ data_wykonania_rzeczywista?: "YYYY-MM-DD" }` (opcjonalne; domyślnie dziś).
- **Odpowiedź 200:** `{ data: Treatment }`.
- **Błędy:** 400 (np. already completed), 401, 403, 404.
- **Akcja frontendu:** Przy 200 — zamknięcie drawera, invalidacja listy zabiegów, toast „Zabieg oznaczony jako wykonany”. Przy błędzie — toast z komunikatem.
- **Uwaga:** Endpoint jest opisany w api-plan.md, lecz obecnie nie jest zaimplementowany. Należy go wdrożyć przed integracją frontendu.

## 8. Interakcje użytkownika

| Interakcja | Oczekiwany wynik |
|------------|------------------|
| Wejście na `/` (zalogowany) | Ładowanie → GET active → formularz lub lista zabiegów. |
| Wypełnienie formularza profilu i kliknięcie „Utwórz profil” | Walidacja client-side → POST → przy 201: refetch, przełączenie na listę, toast. Przy 400: błędy inline. |
| Kliknięcie „Oznacz wykonanie” przy zabiegu | Otwarcie drawera z wybranym zabiegiem. |
| Wybór daty w drawerze i „Oznacz jako wykonane” | PATCH complete → przy 200: zamknięcie drawera, odświeżenie listy, toast. Przy błędzie: toast. |
| Zamknięcie drawera (overlay, X) | Drawer się zamyka, brak zapisu. |
| Kliknięcie linku „Profil” w headerze | Przejście na `/profil`. |

## 9. Warunki i walidacja

| Warunek | Komponent | Wpływ na stan interfejsu |
|---------|-----------|--------------------------|
| Profil nie istnieje (active === null) | PageDashboard | Wyświetlenie ProfileCreateForm. |
| Profil istnieje | PageDashboard | Pobranie treatments, wyświetlenie TreatmentsList. |
| Walidacja pól formularza (nazwa, latitude, longitude) | ProfileCreateForm | Błędy inline przy polach, blokada submit przy błędach. |
| Schemat Zod (createLawnProfileSchema) | ProfileCreateForm | Zgodność z API; reużycie schematu z `src/lib/schemas/lawn-profiles.schema.ts`. |
| Data wykonania (YYYY-MM-DD) | CompleteTreatmentDrawer | Walidacja formatu; domyślnie dziś. |
| status=aktywny w query treatments | TreatmentsList | Filtrowanie tylko aktywnych zabiegów (opcjonalnie: from/to dla zakresu dat). |

## 10. Obsługa błędów

| Kod | Źródło | Obsługa |
|-----|--------|---------|
| 401 | Wszystkie endpointy | Wylogowanie + redirect na `/login?returnUrl=/`. Opcjonalnie toast „Sesja wygasła”. |
| 400 | POST lawn-profiles | Mapowanie `details` na pola formularza; komunikaty inline. |
| 400 | PATCH complete | Toast z komunikatem (np. „Zabieg został już oznaczony jako wykonany”). |
| 403 | GET treatments | Toast „Brak dostępu do profilu”. |
| 404 | GET treatments | Toast „Profil nie został znaleziony”. |
| 409 | POST lawn-profiles | Toast z komunikatem z UniqueActiveProfileError. |
| 429 | Dowolny endpoint | Toast „Zbyt wiele żądań. Spróbuj później.”. |
| 500 | Dowolny endpoint | Toast „Wystąpił błąd serwera.” + opcjonalnie przycisk „Ponów”. |

**Edge cases:**
- Pusta lista zabiegów — komunikat „Brak nadchodzących zabiegów” zamiast pustej listy.
- Błąd sieci przy fetch — toast + stan error, opcjonalnie retry.
- Drawer otwarty podczas błędu PATCH — drawer pozostaje otwarty, toast z błędem; użytkownik może spróbować ponownie lub zamknąć.

## 11. Kroki implementacji

1. **Instalacja zależności:** Dodać React Query (`@tanstack/react-query`) lub SWR oraz komponenty Shadcn/ui: Sheet, Input, Label, Skeleton, Toast/Sonner, Card, Select (jeśli brakują). Wykonać `npx shadcn@latest add sheet input label skeleton sonner card select` (lub odpowiednik).

2. **Implementacja guarda autoryzacji:** Rozszerzyć middleware o sprawdzanie tokena JWT; brak tokena → redirect na `/login?returnUrl=<ścieżka>`. (Uwaga: obecnie auth może być wyłączony — plan zakłada przyszłą implementację.)

3. **Layout z headerem:** Utworzyć lub rozszerzyć layout o header z linkami do `/` i `/profil`. Użyć `ProtectedLayout.astro` dla chronionych tras.

4. **Implementacja PATCH /api/treatments/:id/complete:** Endpoint nie istnieje — należy go wdrożyć w `src/pages/api/treatments/[id]/complete.ts` zgodnie z api-plan.md. Serwis w `src/lib/services/treatments.service.ts` — funkcja `completeTreatment`. Schemat Zod dla body (opcjonalna data_wykonania_rzeczywista).

5. **Komponent DashboardLoader:** Utworzyć `src/components/dashboard/DashboardLoader.tsx` — skeleton lub spinner. Warianty dla profilu i listy zabiegów.

6. **Komponent ProfileCreateForm:** Utworzyć `src/components/dashboard/ProfileCreateForm.tsx`. Pola zgodne z createLawnProfileSchema. Reużyć schemat z `src/lib/schemas/lawn-profiles.schema.ts` dla walidacji client-side. Obsługa błędów 400 z mapowaniem details na pola. Callback `onSuccess`.

7. **Komponent TreatmentCard:** Utworzyć `src/components/dashboard/TreatmentCard.tsx`. Wyświetlanie: nazwa (z template.nazwa jeśli embed), data_proponowana, uzasadnienie_pogodowe. Przycisk „Oznacz wykonanie” wywołuje `onMarkComplete(treatment)`.

8. **Komponent CompleteTreatmentDrawer:** Utworzyć `src/components/dashboard/CompleteTreatmentDrawer.tsx`. Sheet z formularzem: Input type=date (domyślnie dziś), Button „Oznacz jako wykonane”. Props: open, onOpenChange, treatment, onSuccess, onError. Wysyłka PATCH `/api/treatments/${treatment.id}/complete`.

9. **Komponent TreatmentsList:** Utworzyć `src/components/dashboard/TreatmentsList.tsx`. Mapowanie treatments → TreatmentCard. Stan pusty: komunikat. Props: treatments, onMarkComplete.

10. **Główny komponent PageDashboard:** Utworzyć `src/components/dashboard/PageDashboard.tsx` (React). Logika stanów: loading_profile → DashboardLoader; no_profile → ProfileCreateForm; loading_treatments → DashboardLoader; treatments_loaded → TreatmentsList. Stan drawera: selectedTreatment. useQuery dla active; useQuery dla treatments (enabled: !!profile?.id); useMutation dla POST i PATCH. Invalidacja po mutacjach.

11. **Integracja z index.astro:** Zaimportować PageDashboard z `client:load` (lub `client:visible`). Użyć layoutu z headerem. Opcjonalnie: Toaster (Sonner) w layoutzie.

12. **Obsługa błędów API:** W PageDashboard (lub custom hook) obsłużyć 401, 403, 404, 429, 500 — wyświetlanie toastów. Dla 401 — wywołanie wylogowania i redirect (gdy auth wdrożony).

13. **Testy i weryfikacja:** Sprawdzić przepływ: brak profilu → tworzenie → lista; lista → oznaczenie wykonania → odświeżenie. Sprawdzić walidację formularza i mapowanie błędów 400. Sprawdzić responsywność (MVP: desktop).

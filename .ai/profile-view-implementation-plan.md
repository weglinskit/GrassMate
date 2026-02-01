# Plan implementacji widoku Profil trawnika

## 1. Przegląd

Widok **Profil trawnika** umożliwia zalogowanemu użytkownikowi wyświetlenie danych aktywnego profilu trawnika oraz — gdy endpoint PATCH jest dostępny — edycję tych danych w jednym formularzu z jedną akcją „Zapisz” i jednym żądaniem PATCH. Widok realizuje user story: „Jako użytkownik chcę zobaczyć i mieć możliwość edytowania swojego aktywnego profilu trawnika.” Dane są pobierane z `GET /api/lawn-profiles/active`; walidacja jest współdzielona z API (Zod w `src/lib/schemas`). Jeśli endpoint `PATCH /api/lawn-profiles/:id` nie jest wdrożony w MVP, widok działa w trybie tylko do odczytu z wyłączonym przyciskiem „Zapisz”.

## 2. Routing widoku

- **Ścieżka:** `/profil`
- **Plik strony:** `src/pages/profil.astro`
- **Ochrona:** Tylko zalogowani użytkownicy. Niezalogowani przekierowywani na `/login?returnUrl=/profil` (guard autoryzacji w middleware, ten sam co dla dashboardu).

## 3. Struktura komponentów

```
ProtectedLayout (header + slot)
└── profil.astro
    └── PageProfil (React, client:load)
        ├── ProfileLoader (gdy loading) — reużycie DashboardLoader variant="profile"
        ├── EmptyProfileState (gdy brak profilu, brak błędu)
        │   └── Komunikat + link do Dashboard
        ├── ErrorState (gdy błąd API)
        │   └── Komunikat + przycisk „Ponów”
        └── ProfileEditForm (gdy jest profil)
            ├── Pola formularza (nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude)
            └── Przycisk „Zapisz” (aktywny tylko gdy PATCH dostępny)
```

**Hierarchia:**
- **ProtectedLayout** — istniejący layout z headerem (linki: Dashboard, Profil).
- **PageProfil** — główny kontener widoku; zarządza stanami: ładowanie, brak profilu, błąd, załadowany profil (formularz).
- **ProfileLoader** — reużycie komponentu `DashboardLoader` z `variant="profile"`.
- **EmptyProfileState** — komunikat „Brak aktywnego profilu” oraz link do `/` (utworzenie profilu na dashboardzie).
- **ErrorState** — komunikat błędu i przycisk „Ponów” (refetch).
- **ProfileEditForm** — formularz React z polami edytowalnymi i przyciskiem „Zapisz”; obsługa walidacji i błędów 400.

## 4. Szczegóły komponentów

### ProtectedLayout

- **Opis:** Istniejący layout dla chronionych widoków. Zawiera header z nawigacją (Dashboard `/`, Profil `/profil`) oraz `<main>` z `<slot />`. Nie wymaga zmian dla widoku profilu.
- **Główne elementy:** `<header>`, `<nav>`, linki, `<main>` z `<slot />`.
- **Obsługiwane interakcje:** Kliknięcie w linki nawigacji.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak specyficznych DTO.
- **Propsy:** `title?: string`, `slot` (treść strony).

### PageProfil

- **Opis:** Główny komponent widoku profilu (React). Pobiera aktywny profil przez `GET /api/lawn-profiles/active` (np. za pomocą TanStack Query). Przełącza wyświetlaną treść w zależności od stanu: ładowanie → ProfileLoader; brak profilu (data === null) → EmptyProfileState; błąd → ErrorState; profil załadowany → ProfileEditForm. Obsługuje 401 (toast + redirect na login), pozostałe błędy (toast + stan błędu z możliwością ponowienia).
- **Główne elementy:** Warunkowe renderowanie: `DashboardLoader`, `EmptyProfileState`, blok błędu z przyciskiem „Ponów”, `ProfileEditForm`.
- **Obsługiwane interakcje:** Refetch przy „Ponów”; callback `onSuccess` z formularza → invalidacja cache (np. `queryClient.setQueryData`), toast sukcesu; callback `onError` opcjonalnie do przekazania błędów wyżej.
- **Obsługiwana walidacja:** Brak bezpośredniej; walidacja odbywa się w ProfileEditForm.
- **Typy:** `LawnProfile`, `ProfileViewState` (patrz sekcja 5).
- **Propsy:** Brak (komponent strony); wewnętrznie używa `useQuery`, `useQueryClient` oraz opcjonalnie flagi `patchAvailable` (np. z konfiguracji lub feature flag).

### ProfileLoader

- **Opis:** Reużycie istniejącego komponentu `DashboardLoader` z `src/components/dashboard/DashboardLoader.tsx` z `variant="profile"`. Wyświetla skeleton symulujący formularz (etykiety + pola).
- **Główne elementy:** Skeleton (Shadcn/ui), układ placeholderów dla formularza.
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:** `variant="profile"` (już zdefiniowane w DashboardLoader).

### EmptyProfileState

- **Opis:** Wyświetlany, gdy `GET /api/lawn-profiles/active` zwrócił `data: null` (użytkownik nie ma aktywnego profilu). Informuje użytkownika i kieruje go na dashboard, gdzie może utworzyć profil (ProfileCreateForm).
- **Główne elementy:** Tekst (np. „Nie masz aktywnego profilu trawnika.”), link `<a href="/">Przejdź do Dashboard</a>` (lub „Utwórz profil”).
- **Obsługiwane interakcje:** Kliknięcie w link → nawigacja na `/`.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:** Opcjonalnie `className?: string` dla spójności stylów.

### ErrorState

- **Opis:** Wyświetlany przy błędzie pobierania profilu (np. 500, błąd sieci). Pokazuje krótki komunikat i przycisk „Ponów” wywołujący refetch zapytania.
- **Główne elementy:** Paragraf z komunikatem błędu, przycisk „Ponów”.
- **Obsługiwane interakcje:** Kliknięcie „Ponów” → wywołanie callbacku `onRetry`.
- **Obsługiwana walidacja:** Brak.
- **Typy:** Brak.
- **Propsy:** `onRetry: () => void`, opcjonalnie `message?: string`.

### ProfileEditForm

- **Opis:** Formularz React do wyświetlenia i edycji danych aktywnego profilu. Pola: nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude. Wypełniony danymi z `LawnProfile`; użytkownik edytuje pola i klika „Zapisz” → wysłanie `PATCH /api/lawn-profiles/:id` (gdy endpoint dostępny). Wspólna walidacja Zod (schemat update, partial); błędy 400 z API mapowane na `details` i wyświetlane inline przy polach; opcjonalnie krótki komunikat u góry formularza. Gdy PATCH nie jest wdrożony: przycisk „Zapisz” wyłączony (lub ukryty), pola tylko do odczytu lub edytowalne bez zapisu — zgodnie z decyzją produktu (rekomendacja: pola edytowalne, „Zapisz” wyłączony z tooltipem „Edycja będzie dostępna wkrótce”).
- **Główne elementy:** `<form>`, Input (nazwa, latitude, longitude, wielkość_m2, rodzaj_powierzchni), Select (nasłonecznienie), Button „Zapisz”. Pola z błędami inline: Label, Input z `aria-invalid`, tekst błędu (np. `aria-describedby`). Opcjonalnie jeden komunikat zbiorczy u góry przy błędach 400.
- **Obsługiwane interakcje:** `onSubmit` — walidacja po stronie klienta (Zod update schema), wysłanie PATCH, obsługa 200 (onSuccess), 400 (mapowanie details na pola), 401/403/404/500 (toast / onError).
- **Obsługiwana walidacja:**  
  - nazwa: min 1 znak, max 255 znaków;  
  - latitude: -90 ≤ wartość ≤ 90;  
  - longitude: -180 ≤ wartość ≤ 180;  
  - wielkość_m2: > 0;  
  - nasłonecznienie: enum „niskie” | „średnie” | „wysokie”;  
  - rodzaj_powierzchni: opcjonalny string (np. max 500 znaków jeśli API to wymaga).  
  Wszystkie pola w trybie PATCH są opcjonalne (partial); walidacja dotyczy tylko pól obecnych w payloadzie.
- **Typy:** `LawnProfile`, `UpdateLawnProfileCommand`, `ValidationErrorDetail`, `ApiErrorResponse`.
- **Propsy:** `profile: LawnProfile`, `onSuccess?: (profile: LawnProfile) => void`, `onError?: (details: ValidationErrorDetail[]) => void`, `patchAvailable?: boolean` (domyślnie `true`; gdy `false`, przycisk „Zapisz” wyłączony).

## 5. Typy

### Istniejące typy (z `src/types.ts`)

- **LawnProfile** — profil trawnika: id, user_id, nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude, is_active, created_at, updated_at.
- **UpdateLawnProfileCommand** — Partial<Pick<LawnProfile, "nazwa" | "wielkość_m2" | "nasłonecznienie" | "rodzaj_powierzchni" | "latitude" | "longitude" | "is_active">>. Używany jako body żądania PATCH.
- **ValidationErrorDetail** — `{ field: string; message: string }` — format pojedynczego błędu w tablicy `details` odpowiedzi 400.
- **ApiErrorResponse** — `{ error: string; details?: ValidationErrorDetail[]; message?: string }` — wspólny kształt odpowiedzi błędu API.

### Nowe typy / ViewModel

- **ProfileViewState** — `'loading' | 'no_profile' | 'loaded' | 'error'` — stan widoku profilu.  
  - `loading`: trwa pobieranie GET active;  
  - `no_profile`: odpowiedź 200 z `data: null`;  
  - `loaded`: odpowiedź 200 z `data: LawnProfile`;  
  - `error`: błąd zapytania (np. 500, błąd sieci).

### Schemat Zod (rozszerzenie w `src/lib/schemas/lawn-profiles.schema.ts`)

- **updateLawnProfileSchema** — schemat `.partial()` z polami: nazwa (min 1, max 255), latitude (-90..90), longitude (-180..180), wielkość_m2 (positive), nasłonecznienie (enum), rodzaj_powierzchni (string nullable/optional), is_active (boolean). Wszystkie pola opcjonalne; walidacja tylko dla podanych. Typ wywnioskowany: zgodny z `UpdateLawnProfileCommand` dla podzbioru pól.

## 6. Zarządzanie stanem

- **Pobieranie profilu:** TanStack Query (useQuery) z kluczem `['lawn-profiles', 'active']` i funkcją `fetchActiveProfile` (GET `/api/lawn-profiles/active` → `json.data`). Ten sam klucz co na dashboardzie — po utworzeniu profilu na dashboardzie cache jest współdzielony; po zapisie PATCH na profilu — `setQueryData(['lawn-profiles', 'active'], updatedProfile)` lub `invalidateQueries`.
- **Stan widoku:** Wynika z `activeQuery`: `isPending`/`isLoading` → loading; `error` → error; `data === null` → no_profile; `data` obecny → loaded. Nie jest wymagany osobny custom hook do stanu widoku; logika w PageProfil.
- **Formularz:** Stan lokalny w ProfileEditForm: wartości pól (zgodne z LawnProfile), `fieldErrors: Record<string, string>`, `isSubmitting: boolean`. Inicjalizacja pól z `profile` (useState z profile lub useEffect przy zmianie profile). Opcjonalnie custom hook `useProfileEditForm(profile)` zwracający wartości, handlery zmian, błędy i funkcję submit — dla czytelności i ewentualnego reużycia.

## 7. Integracja API

### GET /api/lawn-profiles/active

- **Typ żądania:** Brak body. Nagłówek: autoryzacja (Bearer token gdy auth wdrożone).
- **Typ odpowiedzi 200:** `{ data: LawnProfile | null }`.  
  `LawnProfile`: id, user_id, nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude, is_active, created_at, updated_at.
- **Błędy:** 401 Unauthorized — brak lub nieprawidłowy token; obsługa po stronie frontendu: toast „Sesja wygasła”, redirect na `/login?returnUrl=/profil`. 500 — toast + stan error z przyciskiem „Ponów”.

### PATCH /api/lawn-profiles/:id (gdy wdrożony)

- **Typ żądania:** Body: `UpdateLawnProfileCommand` (partial): nazwa?, wielkość_m2?, nasłonecznienie?, rodzaj_powierzchni?, latitude?, longitude?, is_active?. Content-Type: application/json.
- **Typ odpowiedzi 200:** `{ data: LawnProfile }`.
- **Błędy:** 400 Validation error — body `{ error: "Validation error", details: ValidationErrorDetail[] }` — mapowanie `details` na pola formularza (inline). 401 → redirect na login. 403/404 → toast. 500 → toast, opcjonalnie możliwość ponowienia.

**Uwaga:** Endpoint PATCH jest w planie API (zakomentowany w dokumencie); w MVP może być niedostępny. Frontend musi obsłużyć oba warianty (edycja z zapisem lub tylko odczyt).

## 8. Interakcje użytkownika

- **Wejście na `/profil`:** Wyświetlenie stanu ładowania (skeleton). Po odpowiedzi GET: formularz z danymi profilu, pusty stan (link do dashboardu) lub błąd („Ponów”).
- **Edycja pól w formularzu:** Użytkownik zmienia nazwę, wielkość, nasłonecznienie, rodzaj powierzchni, współrzędne. Walidacja inline po stronie klienta przy submit (Zod).
- **Kliknięcie „Zapisz”:** Walidacja; jeśli OK — PATCH z payloadem zgodnym z UpdateLawnProfileCommand. Sukces: toast „Profil zaktualizowany”, aktualizacja cache (np. setQueryData), formularz pozostaje wypełniony zaktualizowanymi danymi. Błąd 400: komunikaty przy polach; opcjonalnie komunikat u góry. Inne błędy: toast.
- **Brak profilu:** Użytkownik widzi EmptyProfileState i klika link do Dashboard → nawigacja na `/`, gdzie może utworzyć profil.
- **Błąd ładowania:** Użytkownik klika „Ponów” → refetch GET active.

## 9. Warunki i walidacja

- **Autoryzacja:** Middleware (guard) sprawdza token przed renderem `/profil`. Brak tokena → redirect na `/login?returnUrl=/profil`. Nie dotyczy poszczególnych komponentów — cała strona jest chroniona.
- **Obecność profilu:** GET active zwraca `data: null` — nie 404. Widok interpretuje `null` jako stan „no_profile” i wyświetla EmptyProfileState. Nie wywołuje się żadnego innego endpointu dla „pojedynczego profilu po id”.
- **Walidacja formularza (ProfileEditForm):** Po stronie klienta — updateLawnProfileSchema (Zod); tylko pola wysyłane w body są walidowane (partial). Reguły jak w sekcji 4 (nazwa 1–255, latitude/longitude w zakresach, wielkość_m2 > 0, nasłonecznienie enum, rodzaj_powierzchni opcjonalny). Po stronie API — odpowiedź 400 z `details`; frontend mapuje każdy element `details` na pole (`field`) i wyświetla `message` inline. Warunki API (np. „co najwyżej jeden aktywny profil”) są weryfikowane po stronie serwera; 403/409 obsługiwane toastem.

## 10. Obsługa błędów

- **401 Unauthorized:** Toast „Sesja wygasła”, przekierowanie na `/login?returnUrl=/profil`. Spójnie z dashboardem.
- **400 Validation error:** Odpowiedź z `details` (tablica). Mapowanie na `fieldErrors` w ProfileEditForm; wyświetlanie komunikatów przy odpowiednich polach. Opcjonalnie jeden krótki komunikat u góry formularza (np. „Popraw błędy w formularzu”).
- **403 Forbidden / 404 Not Found:** Toast z komunikatem (np. „Brak dostępu”, „Nie znaleziono profilu”). Bez przekierowania; użytkownik może ponowić lub wrócić na dashboard.
- **429 Too Many Requests:** Toast „Zbyt wiele żądań. Spróbuj później.”
- **500 Internal Server Error (GET):** Stan error w PageProfil; komunikat + przycisk „Ponów” (refetch). Toast opcjonalnie.
- **500 przy PATCH:** Toast z komunikatem błędu; `isSubmitting` ustawione na false, użytkownik może poprawić dane i spróbować ponownie.
- **Błąd sieci / timeout:** Traktowany jak 500; możliwość ponowienia (GET — „Ponów”; PATCH — ponowne kliknięcie „Zapisz” po poprawkach).
- **Brak aktywnego profilu (data: null):** Nie jest błędem; wyświetlany EmptyProfileState z linkiem do dashboardu.

## 11. Kroki implementacji

1. **Schemat Zod dla PATCH** — W pliku `src/lib/schemas/lawn-profiles.schema.ts` dodać `updateLawnProfileSchema` jako `.partial()` z tymi samymi regułami co create dla pól: nazwa, latitude, longitude, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, is_active. Wyeksportować typ `UpdateLawnProfileSchema` (z.infer).

2. **Typ ProfileViewState** — W `src/types.ts` (lub w pliku widoku) dodać typ `ProfileViewState = 'loading' | 'no_profile' | 'loaded' | 'error'`.

3. **EmptyProfileState** — Utworzyć komponent React (np. w `src/components/profile/EmptyProfileState.tsx`): komunikat o braku profilu, link do `/` z tekstem np. „Przejdź do Dashboard” lub „Utwórz profil”.

4. **ErrorState** — Utworzyć komponent (np. w `src/components/profile/ErrorState.tsx`): komunikat błędu, przycisk „Ponów” wywołujący `onRetry`. Opcjonalnie przyjmować `message?: string`.

5. **ProfileEditForm** — Utworzyć komponent React (np. w `src/components/profile/ProfileEditForm.tsx`): props `profile`, `onSuccess`, `onError`, `patchAvailable`. Pola formularza: nazwa, wielkość_m2, nasłonecznienie (Select), rodzaj_powierzchni, latitude, longitude. Inicjalizacja stanu z `profile`; przy submit walidacja przez `updateLawnProfileSchema`, następnie PATCH `/api/lawn-profiles/${profile.id}` (gdy `patchAvailable`). Mapowanie odpowiedzi 400 `details` na `fieldErrors`; wyświetlanie błędów inline. Przycisk „Zapisz” wyłączony gdy `patchAvailable === false`. Reużycie komponentów UI: Input, Label, Select, Button (Shadcn/ui).

6. **PageProfil** — Utworzyć komponent React (np. w `src/components/profile/PageProfil.tsx`): useQuery dla `['lawn-profiles', 'active']` z `fetchActiveProfile` (GET `/api/lawn-profiles/active`). Obsługa 401 (toast + redirect jak w PageDashboard). Stany: loading → DashboardLoader variant="profile"; error → ErrorState z onRetry; data === null → EmptyProfileState; data obecny → ProfileEditForm z profile i callbackami. W onSuccess z formularza: setQueryData lub invalidateQueries, toast „Profil zaktualizowany”. Opcjonalnie flaga `patchAvailable` (np. stała `const PATCH_AVAILABLE = false` w MVP do momentu wdrożenia endpointu).

7. **Strona Astro** — Utworzyć `src/pages/profil.astro`: użycie ProtectedLayout, import PageProfil (React) z `client:load`, ewentualnie DashboardWithProviders jeśli QueryClientProvider jest wymagany (spójnie z `index.astro` i dashboardem).

8. **Middleware / guard** — Upewnić się, że ścieżka `/profil` jest chroniona w taki sam sposób jak `/` (sprawdzenie w `src/middleware/index.ts` lub odpowiednim miejscu); brak tokena → redirect na `/login?returnUrl=/profil`.

9. **Testy ręczne** — Wejście na `/profil` jako zalogowany użytkownik z profilem: ładowanie → formularz z danymi. Edycja i „Zapisz” (gdy PATCH włączony): sukces, toast, zaktualizowane dane. Wejście bez profilu (data: null): EmptyProfileState, link do dashboardu. Błąd API: ErrorState, „Ponów”. Tryb tylko do odczytu (patchAvailable false): formularz wypełniony, „Zapisz” wyłączony.

10. **Dostępność i UX** — Pola formularza z etykietami, `aria-invalid` przy błędach, `aria-describedby` wskazującym na komunikaty błędów. Przycisk „Zapisz” z wyraźną etykietą; przy wyłączonym — informacja dla użytkownika (np. aria-disabled lub tooltip).

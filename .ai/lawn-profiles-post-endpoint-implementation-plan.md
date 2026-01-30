# Plan wdrożenia endpointu API: POST /api/lawn-profiles

## 1. Przegląd punktu końcowego

Endpoint **POST /api/lawn-profiles** służy do tworzenia nowego profilu trawnika dla zalogowanego użytkownika. Profil zawiera nazwę, lokalizację (współrzędne), opcjonalnie powierzchnię, nasłonecznienie, rodzaj powierzchni oraz flagę aktywności. Wymagana jest autentykacja (JWT). W odpowiedzi zwracany jest utworzony obiekt `LawnProfile` (201 Created). W przypadku błędu walidacji zwracane jest 400, przy braku autoryzacji – 401.

---

## 2. Szczegóły żądania

- **Metoda HTTP:** POST  
- **Struktura URL:** `/api/lawn-profiles`  
- **Nagłówki:**  
  - `Content-Type: application/json` (zalecane)  
  - `Authorization: Bearer <access_token>` (wymagane – token JWT Supabase)  

**Parametry (Request Body):**

| Pole                | Typ     | Wymagane | Domyślnie   | Opis |
|---------------------|--------|----------|-------------|------|
| `nazwa`             | string | tak      | —           | Nazwa trawnika, 1–255 znaków |
| `latitude`          | number | tak      | —           | Szerokość geograficzna (-90 do 90) |
| `longitude`         | number | tak      | —           | Długość geograficzna (-180 do 180) |
| `wielkość_m2`       | number | nie      | 100         | Powierzchnia w m², > 0 |
| `nasłonecznienie`   | string | nie      | `"średnie"` | `"niskie"` \| `"średnie"` \| `"wysokie"` |
| `rodzaj_powierzchni`| string | nie      | null        | Opcjonalny opis rodzaju powierzchni |
| `is_active`         | boolean| nie      | true        | Czy profil ma być aktywny |

**Request Body (przykład):**

```json
{
  "nazwa": "Trawnik przed domem",
  "latitude": 52.2297,
  "longitude": 21.0122,
  "wielkość_m2": 150,
  "nasłonecznienie": "wysokie"
}
```

---

## 3. Wykorzystywane typy

- **CreateLawnProfileCommand** (`src/types.ts`) – model żądania (request body). Zawiera pola: `nazwa`, `latitude`, `longitude` oraz opcjonalnie `wielkość_m2`, `nasłonecznienie`, `rodzaj_powierzchni`, `is_active`. Nie zawiera `user_id`, `id`, `created_at`, `updated_at` (uzupełniane po stronie serwera).
- **LawnProfile** (`src/types.ts`) – DTO odpowiedzi; mapowanie 1:1 z wierszem tabeli `lawn_profiles` (id, user_id, nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude, is_active, created_at, updated_at).
- **Schemat Zod** – do walidacji body żądania (nowy, np. w `src/lib/schemas/lawn-profiles.schema.ts` lub obok serwisu), zdefiniowany zgodnie z powyższymi regułami i ograniczeniami bazy (długość nazwy, zakresy latitude/longitude, wielkość_m2 > 0, enum nasłonecznienie).

---

## 4. Szczegóły odpowiedzi

- **201 Created**  
  - Body: `{ "data": LawnProfile }`  
  - Zwracany po pomyślnym utworzeniu profilu.  
- **400 Bad Request**  
  - Błąd walidacji (np. brak `nazwa`, nieprawidłowe zakresy `latitude`/`longitude`, `wielkość_m2` ≤ 0, nieprawidłowa wartość `nasłonecznienie`, nazwa pusta lub dłuższa niż 255 znaków).  
  - Zalecany format: `{ "error": "Validation error", "details": [...] }` (szczegóły z Zod).  
- **401 Unauthorized**  
  - Brak nagłówka `Authorization`, nieprawidłowy lub wygasły token JWT.  
  - Zalecany format: `{ "error": "Unauthorized" }`.  
- **409 Conflict** (opcjonalnie)  
  - Użytkownik ma już aktywny profil (`is_active = true`), a żądanie tworzy nowy profil z `is_active = true` – naruszenie unikalności `(user_id)` WHERE `is_active = true`.  
  - Alternatywa: w serwisie przed insertem ustawić istniejące aktywne profile na `is_active = false` (transakcja), wtedy 409 nie jest konieczne – decyzja w zespole.  
- **500 Internal Server Error**  
  - Nieoczekiwany błąd bazy danych lub serwera.  
  - Nie ujawniać szczegółów technicznych w body; ewentualnie logować po stronie serwera.

---

## 5. Przepływ danych

1. **Żądanie** – klient wysyła POST na `/api/lawn-profiles` z ciałem JSON i nagłówkiem `Authorization: Bearer <token>`.
2. **Middleware** – Astro middleware przekazuje `context.locals.supabase` (Supabase client). Endpoint korzysta wyłącznie z `context.locals.supabase` (nie importuje `supabaseClient` bezpośrednio).
3. **Autentykacja** – na podstawie JWT z nagłówka Authorization pobierany jest użytkownik (np. `supabase.auth.getUser(jwt)` lub weryfikacja sesji). Brak użytkownika → odpowiedź 401.
4. **Walidacja** – parsowanie body przez schemat Zod odpowiadający `CreateLawnProfileCommand`. Błąd walidacji → odpowiedź 400 ze szczegółami.
5. **Domyślne wartości** – uzupełnienie brakujących pól: `wielkość_m2 = 100`, `nasłonecznienie = "średnie"`, `is_active = true`. `rodzaj_powierzchni` pozostaje `null`, jeśli nie podano.
6. **Serwis** – logika biznesowa w warstwie serwisu (`src/lib/services/`, np. `lawn-profiles.service.ts`): przyjmuje `SupabaseClient` (z `context.locals`), `user_id` (z sesji) oraz zwalidowany obiekt; buduje wiersz do insertu (`user_id` z argumentu, nigdy z body), wywołuje `supabase.from('lawn_profiles').insert(...).select().single()`.
7. **Unikalność aktywnego profilu** – jeśli baza zwróci błąd naruszenia unikalności (jeden aktywny trawnik na użytkownika), obsłużyć jako 409 (lub wariant z deaktywacją innych w transakcji – wtedy brak 409).
8. **Odpowiedź** – zwrócenie 201 z `{ "data": <LawnProfile> }`. Typ odpowiedzi: `LawnProfile` z `src/types.ts` (zgodny z `lawn_profiles.Row`).

---

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie** – endpoint wymaga poprawnego JWT Supabase w nagłówku `Authorization: Bearer <token>`. Brak lub nieprawidłowy token → 401.
- **Autoryzacja** – `user_id` do insertu pochodzi wyłącznie z tożsamości użytkownika (sesja/JWT), nigdy z request body. Zapobiega to tworzeniu profili w imieniu innych użytkowników.
- **Row Level Security (RLS)** – tabela `lawn_profiles` powinna mieć włączone RLS z politykami zezwalającymi na INSERT tylko dla `auth.uid() = user_id` i SELECT/UPDATE/DELETE tylko dla własnych wierszy. Weryfikacja po stronie aplikacji (user_id z sesji) + RLS daje podwójną ochronę.
- **Walidacja wejścia** – Zod ogranicza typy i zakresy (nazwa 1–255 znaków, latitude/longitude, wielkość_m2 > 0, enum nasłonecznienie), co zmniejsza ryzyko nieprawidłowych danych i potencjalnych nadużyć.
- **Nie logować tokenów** – w logach błędów nie umieszczać JWT ani pełnych nagłówków Authorization.

---

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Działanie |
|------------|----------|------------|
| Brak / nieprawidłowy JWT | 401 | Zwrócić `{ "error": "Unauthorized" }`. |
| Brak `nazwa` lub pusta / za długa | 400 | Walidacja Zod; zwrócić 400 z opisem błędów. |
| Nieprawidłowe `latitude` / `longitude` | 400 | Zod (latitude -90..90, longitude -180..180). |
| `wielkość_m2` ≤ 0 lub nie liczba | 400 | Zod. |
| Nieprawidłowa wartość `nasłonecznienie` | 400 | Zod (enum: niskie, średnie, wysokie). |
| Naruszenie unikalności aktywnego profilu | 409 lub 400 | Zwrócić 409 z czytelnym komunikatem lub obsłużyć w transakcji (deaktywacja innych) i nie zwracać 409. |
| Błąd bazy (np. połączenie, constraint) | 500 | Zwrócić ogólny komunikat błędu; szczegóły tylko w logach serwera. |

W projekcie nie ma dedykowanej tabeli błędów w schemacie bazy – błędy są sygnalizowane kodami HTTP i opcjonalnie logowaniem po stronie serwera (np. `console.error` lub logger w środowisku produkcyjnym).

---

## 8. Rozważania dotyczące wydajności

- **Pojedynczy INSERT** – operacja to jeden insert do `lawn_profiles` z zwróceniem wiersza (`.select().single()`), bez zbędnych zapytań.
- **Indeksy** – istniejące indeksy `(user_id, is_active)` i `(user_id)` wspierają ewentualne sprawdzenie „czy użytkownik ma już aktywny profil” (jeśli zespół zdecyduje się na taką logikę przed insertem) oraz zapytania RLS.
- **Unikalność** – unikalny indeks częściowy `(user_id) WHERE is_active = true` może zwrócić błąd przy równoczesnym tworzeniu drugiego aktywnego profilu; obsługa tego błędu (409 lub transakcja z deaktywacją) powinna być jasno zdefiniowana w serwisie.
- Nie ma potrzeby cachowania odpowiedzi dla POST (tworzenie zasobu).

---

## 9. Etapy wdrożenia

1. **Utworzenie struktury katalogów API**  
   - Dodać katalog `src/pages/api/` (jeśli nie istnieje).  
   - Plik endpointu: `src/pages/api/lawn-profiles.ts` (Astro Server Endpoint).  
   - Na początku pliku dodać `export const prerender = false`.

2. **Schemat Zod dla request body**  
   - Dodać plik ze schematem Zod (np. `src/lib/schemas/lawn-profiles.schema.ts`).  
   - Zdefiniować schemat dla tworzenia profilu: `nazwa` (string, min 1, max 255), `latitude` (-90..90), `longitude` (-180..180), `wielkość_m2` (opcjonalne, number, > 0), `nasłonecznienie` (opcjonalne, enum `'niskie' | 'średnie' | 'wysokie'`), `rodzaj_powierzchni` (opcjonalne, string lub null), `is_active` (opcjonalne, boolean).  
   - Wyeksportować typ TypeScript wywnioskowany ze schematu (np. `z.infer<typeof createLawnProfileSchema>`) i upewnić się, że jest zgodny z `CreateLawnProfileCommand`.

3. **Serwis tworzenia profilu**  
   - Utworzyć plik serwisu (np. `src/lib/services/lawn-profiles.service.ts`).  
   - Zaimplementować funkcję `createLawnProfile(supabase, userId, body)` przyjmującą: `SupabaseClient` (z `src/db/supabase.client.ts`), `userId: string`, oraz zwalidowany obiekt (zgodny z CreateLawnProfileCommand).  
   - W serwisie: zbudować obiekt insertu (user_id z argumentu; domyślne wartości dla brakujących pól: wielkość_m2 100, nasłonecznienie 'średnie', is_active true).  
   - Wywołać `supabase.from('lawn_profiles').insert(payload).select().single()`.  
   - Zwrócić wiersz jako `LawnProfile` lub rzucić błąd (np. przy naruszeniu unikalności – z odpowiednim kodem/komunikatem do mapowania na 409).  
   - Użyć typów z `src/types.ts` i `src/db/database.types.ts` (SupabaseClient z `src/db/supabase.client.ts`).

4. **Pobieranie użytkownika z JWT w API**  
   - W endpoincie (lub w współdzielonej funkcji/middleware) pobrać token z nagłówka `Authorization: Bearer <token>`.  
   - Użyć Supabase do weryfikacji użytkownika (np. `getUser(jwt)` lub odpowiednia metoda z Supabase Auth dla requestu).  
   - Jeśli użytkownik nie istnieje lub token jest nieprawidłowy – zwrócić 401 z `{ "error": "Unauthorized" }`.  
   - Przekazać `user_id` do serwisu; nigdy nie brać `user_id` z body.

5. **Handler POST w endpoincie**  
   - W `src/pages/api/lawn-profiles.ts` zaimplementować `export async function POST({ request, locals })`.  
   - Pobierać klienta Supabase z `locals.supabase`.  
   - Wykonać krok autentykacji (pkt 4); przy braku użytkownika zwrócić 401.  
   - Sparsować body żądania (np. `await request.json()`) i zwalidować schematem Zod. Przy błędzie walidacji zwrócić 400 z czytelnymi szczegółami (np. `error.details` z Zod).  
   - Wywołać serwis `createLawnProfile(locals.supabase, user.id, validated)`.  
   - W bloku try/catch: przy naruszeniu unikalności (kod błędu z Supabase) zwrócić 409 (lub 400 z komunikatem); przy innych błędach DB/serwera zwrócić 500.  
   - Przy sukcesie zwrócić odpowiedź z kodem 201 i body `{ "data": <LawnProfile> }`.  
   - Użyć typów `LawnProfile` i `CreateLawnProfileCommand` z `src/types.ts`.

6. **Spójność z regułami projektu**  
   - Upewnić się, że endpoint używa wyłącznie `context.locals.supabase` (nie bezpośredniego importu `supabaseClient` w handlerze).  
   - Zachować nazewnictwo handlerów w wielkiej literze: `POST`.  
   - Logikę biznesową trzymać w serwisie; endpoint tylko: auth, walidacja, wywołanie serwisu, mapowanie błędów na kody HTTP.


Po realizacji powyższych kroków endpoint POST /api/lawn-profiles będzie zgodny ze specyfikacją API, planem bazy danych, typami z `src/types.ts` oraz regułami backendu i Astro (Zod, serwisy, Supabase z `locals`, poprawne kody stanu HTTP).

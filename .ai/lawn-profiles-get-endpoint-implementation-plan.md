# Plan wdrożenia endpointu API: GET /api/lawn-profiles/active

## 1. Przegląd punktu końcowego

Endpoint **GET /api/lawn-profiles/active** służy do pobrania aktywnego profilu trawnika zalogowanego użytkownika. Zgodnie z modelem domeny użytkownik ma co najwyżej jeden aktywny profil (`is_active = true`). Endpoint zwraca ten profil w formacie `{ "data": LawnProfile | null }` – `null`, gdy użytkownik nie ma jeszcze aktywnego profilu. Wymagana jest autentykacja (JWT). W przypadku braku autoryzacji zwracane jest 401 Unauthorized.

---

## 2. Szczegóły żądania

- **Metoda HTTP:** GET  
- **Struktura URL:** `/api/lawn-profiles/active`  
- **Nagłówki:**  
  - `Authorization: Bearer <access_token>` (wymagane – token JWT Supabase)  

**Parametry:**

- **Wymagane:** brak (ścieżka jest stała).  
- **Opcjonalne:** brak (endpoint nie przyjmuje query params ani body).  

**Request Body:** nie dotyczy (GET bez body).

---

## 3. Wykorzystywane typy

- **LawnProfile** (`src/types.ts`) – DTO odpowiedzi; mapowanie 1:1 z wierszem tabeli `lawn_profiles` (id, user_id, nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude, is_active, created_at, updated_at). Używany jako typ wartości `data` w odpowiedzi (LawnProfile lub null).
- **Typ odpowiedzi:** `{ data: LawnProfile | null }` – zdefiniowany inline lub jako alias w typach, zgodnie z konwencją projektu.

Żądanie nie zawiera body ani parametrów path/query, więc nie są wymagane Command Modele ani schematy Zod dla wejścia.

---

## 4. Szczegóły odpowiedzi

- **200 OK**  
  - Body: `{ "data": LawnProfile | null }`  
  - Gdy użytkownik ma aktywny profil – `data` to obiekt LawnProfile.  
  - Gdy użytkownik nie ma aktywnego profilu – `data` to `null`.  

- **401 Unauthorized**  
  - Brak nagłówka `Authorization`, nieprawidłowy lub wygasły token JWT.  
  - Zalecany format: `{ "error": "Unauthorized" }`.  

- **500 Internal Server Error**  
  - Nieoczekiwany błąd bazy danych lub serwera.  
  - Nie ujawniać szczegółów technicznych w body; ewentualnie logować po stronie serwera.  

---

## 5. Przepływ danych

1. **Żądanie** – klient wysyła GET na `/api/lawn-profiles/active` z nagłówkiem `Authorization: Bearer <token>`.
2. **Middleware** – Astro middleware ustawia `context.locals.supabase`. Endpoint korzysta wyłącznie z `context.locals.supabase` (nie importuje klienta Supabase bezpośrednio w handlerze).
3. **Autentykacja** – na podstawie JWT z nagłówka Authorization pobierany jest użytkownik (np. `supabase.auth.getUser(jwt)` lub weryfikacja sesji). Brak użytkownika lub nieprawidłowy token → odpowiedź 401.
4. **Serwis** – wywołanie funkcji `getActiveLawnProfile(supabase, user.id)` w `src/lib/services/lawn-profiles.service.ts`. Serwis wykonuje zapytanie do tabeli `lawn_profiles` z warunkiem `user_id = userId` oraz `is_active = true`, z użyciem `.maybeSingle()` – zwraca jeden wiersz lub null.
5. **Odpowiedź** – zwrócenie 200 z body `{ "data": <LawnProfile | null> }`. Content-Type: application/json.

---

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie** – endpoint wymaga poprawnego JWT Supabase w nagłówku `Authorization: Bearer <token>`. Brak lub nieprawidłowy token → 401.
- **Autoryzacja** – zapytanie do bazy używa wyłącznie `user_id` pochodzącego z tożsamości użytkownika (sesja/JWT). Użytkownik nie może podać w żądaniu identyfikatora innego użytkownika (brak parametrów wejściowych).
- **Row Level Security (RLS)** – tabela `lawn_profiles` powinna mieć włączone RLS z politykami zezwalającymi na SELECT tylko dla wierszy, gdzie `auth.uid() = user_id`. Zapytanie po `user_id` i `is_active` jest wtedy i tak ograniczone do własnych danych.
- **Brak wrażliwych danych w logach** – w logach błędów nie umieszczać JWT ani pełnych nagłówków Authorization.

---

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Działanie |
|------------|----------|-----------|
| Brak / nieprawidłowy JWT | 401 | Zwrócić `{ "error": "Unauthorized" }`. |
| Użytkownik nie ma aktywnego profilu | 200 | Zwrócić `{ "data": null }` (nie 404 – zgodnie ze specyfikacją). |
| Błąd bazy (połączenie, timeout, inny) | 500 | Zwrócić ogólny komunikat błędu; szczegóły tylko w logach serwera. |
| Brak `locals.supabase` (konfiguracja) | 500 | Zwrócić 500; zalogować błąd. |

W projekcie nie ma dedykowanej tabeli błędów – błędy sygnalizowane są kodami HTTP i opcjonalnie logowaniem po stronie serwera.

---

## 8. Rozważania dotyczące wydajności

- **Pojedyncze zapytanie** – operacja to jeden SELECT do `lawn_profiles` z warunkiem `user_id = ?` AND `is_active = true` z limitem jednego wiersza (`.maybeSingle()`).
- **Indeks** – indeks `idx_lawn_profiles_user_id_is_active` na `(user_id, is_active)` wspiera to zapytanie i zapewnia szybkie wyszukiwanie aktywnego profilu.
- **Brak body/params** – brak parsowania ani walidacji wejścia po stronie aplikacji, co minimalizuje narzut.
- Cachowanie odpowiedzi (np. krótki TTL per user) można rozważyć w przyszłości, jeśli profil aktywny będzie często odczytywany; na etapie początkowym nie jest wymagane.

---

## 9. Etapy wdrożenia

1. **Funkcja serwisu `getActiveLawnProfile`**  
   - W pliku `src/lib/services/lawn-profiles.service.ts` dodać funkcję `getActiveLawnProfile(supabase, userId): Promise<LawnProfile | null>`.  
   - Przyjmuje: `SupabaseClient` (z `src/db/supabase.client.ts`), `userId: string`.  
   - Wywołanie: `supabase.from('lawn_profiles').select().eq('user_id', userId).eq('is_active', true).maybeSingle()`.  
   - Zwrócić `data` jako `LawnProfile` (po rzutowaniu typu, zgodnie z konwencją projektu) lub `null` przy braku wiersza. Obsłużyć błąd zapytania (np. nie PGRST116) – zalogować i rzucić dalej, aby endpoint mógł zwrócić 500.

2. **Plik endpointu GET**  
   - Utworzyć plik `src/pages/api/lawn-profiles/active.ts` (Astro Server Endpoint dla ścieżki `/api/lawn-profiles/active`).  
   - Na początku pliku dodać `export const prerender = false`.

3. **Autentykacja w endpoincie**  
   - W handlerze GET pobrać token z nagłówka `Authorization: Bearer <token>` (lub użyć tej samej strategii co w POST /api/lawn-profiles – np. tymczasowo zahardkodowany `DEV_USER_ID` do momentu wdrożenia JWT, zgodnie z TODO w istniejącym endpoincie).  
   - Po wdrożeniu auth: użyć Supabase do weryfikacji użytkownika (np. `getUser(jwt)`). Przy braku użytkownika zwrócić 401 z `{ "error": "Unauthorized" }`.  
   - Przekazać `user_id` (z sesji / JWT) do serwisu.

4. **Handler GET w endpoincie**  
   - Zaimplementować `export async function GET({ request, locals })`.  
   - Pobierać klienta Supabase z `locals.supabase`; przy braku zwrócić 500.  
   - Wykonać krok autentykacji; przy braku użytkownika zwrócić 401.  
   - Wywołać `getActiveLawnProfile(locals.supabase, user.id)`.  
   - W bloku try/catch: przy błędzie z bazy zwrócić 500 i zalogować błąd; przy sukcesie zwrócić 200 z body `{ "data": <LawnProfile | null> }` i nagłówkiem `Content-Type: application/json`.

5. **Spójność z regułami projektu**  
   - Używać wyłącznie `context.locals.supabase` (nie bezpośredniego importu klienta w handlerze).  
   - Nazwa handlera w wielkiej literze: `GET`.  
   - Logikę odczytu trzymać w serwisie; endpoint: auth, wywołanie serwisu, mapowanie błędów na kody HTTP.  
   - Typy importować z `src/types.ts` oraz `SupabaseClient` z `src/db/supabase.client.ts`.

Po realizacji powyższych kroków endpoint GET /api/lawn-profiles/active będzie zgodny ze specyfikacją API (response 200 z `{ "data": LawnProfile | null }`, błąd 401), planem bazy danych, typami z `src/types.ts` oraz regułami backendu i Astro (serwisy, Supabase z `locals`, poprawne kody stanu HTTP).

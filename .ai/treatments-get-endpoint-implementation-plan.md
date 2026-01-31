# Plan wdrożenia endpointu API: GET /api/lawn-profiles/:lawnProfileId/treatments

## 1. Przegląd punktu końcowego

Endpoint **GET /api/lawn-profiles/:lawnProfileId/treatments** służy do pobierania listy zabiegów (rekomendacji) powiązanych z danym profilem trawnika użytkownika. Zwraca paginowaną listę zabiegów z opcjonalnymi filtrami (status, template_id, zakres dat) oraz sortowaniem. Użytkownik musi być zalogowany i musi być właścicielem profilu trawnika wskazanego przez `lawnProfileId`. Wymagana jest autentykacja (JWT). Brak autoryzacji → 401, brak dostępu do trawnika → 403, nieistniejący profil trawnika → 404.

---

## 2. Szczegóły żądania

- **Metoda HTTP:** GET  
- **Struktura URL:** `/api/lawn-profiles/:lawnProfileId/treatments`  
- **Nagłówki:**  
  - `Authorization: Bearer <access_token>` (wymagane – token JWT Supabase)  

**Parametry ścieżki:**

- **lawnProfileId** (wymagany) – UUID profilu trawnika, którego zabiegi mają zostać zwrócone. Walidacja: format UUID v4.

**Parametry zapytania (query):**

| Parametr     | Typ    | Wymagany | Opis                                                                 |
|-------------|--------|----------|----------------------------------------------------------------------|
| status      | string | nie      | Filtr statusu: `aktywny`, `wykonany`, `odrzucony`, `wygasły`         |
| template_id | string | nie      | UUID szablonu zabiegu – filtry zabiegi po konkretnym szablonie       |
| from        | string | nie      | Data początku zakresu `data_proponowana` w formacie YYYY-MM-DD       |
| to          | string | nie      | Data końca zakresu `data_proponowana` w formacie YYYY-MM-DD          |
| page        | number | nie      | Strona paginacji (1-based). Domyślnie: 1                            |
| limit       | number | nie      | Liczba elementów na stronę (1–100). Domyślnie: 20                   |
| sort        | string | nie      | Sortowanie: `data_proponowana` (domyślnie), kierunek: asc/desc       |
| embed       | string | nie      | Opcjonalne osadzenie: `template` – dołącza podsumowanie szablonu     |

**Request Body:** nie dotyczy (GET bez body).

---

## 3. Wykorzystywane typy

- **Treatment** (`src/types.ts`) – DTO pojedynczego zabiegu; mapowanie 1:1 z wierszem tabeli `treatments` (id, lawn_profile_id, template_id, data_proponowana, typ_generowania, uzasadnienie_pogodowe, status, expires_at, created_at, updated_at).
- **TreatmentWithEmbedded** (`src/types.ts`) – Treatment z opcjonalnym polem `template` (TreatmentTemplateSummary) i/lub `lawn_profile`.
- **TreatmentTemplateSummary** (`src/types.ts`) – Skrócone podsumowanie szablonu: id, nazwa, typ_zabiegu, minimalny_cooldown_dni.
- **PaginatedResponse\<T\>** (`src/types.ts`) – Kształt odpowiedzi: `{ data: T[], total: number }`.
- **PaginationParams** (`src/types.ts`) – page (1-based), limit (domyślnie 20, max 100).

Dla walidacji query params wymagany jest nowy schemat Zod: `getTreatmentsQuerySchema` (lub podobna nazwa).

---

## 4. Szczegóły odpowiedzi

- **200 OK**  
  - Body: `{ "data": Treatment[] | TreatmentWithEmbedded[], "total": number }`  
  - Tablica zabiegów zgodna z filtrami i paginacją. Przy `?embed=template` każdy element zawiera pole `template` (TreatmentTemplateSummary).  
  - `total` – łączna liczba zabiegów pasujących do filtrów (bez limitu paginacji).  

- **400 Bad Request**  
  - Nieprawidłowe parametry zapytania (np. niepoprawny UUID, nieprawidłowy format daty, nieprawidłowa wartość statusu).  
  - Zalecany format: `{ "error": "Validation error", "details": [{ "field": string, "message": string }] }`.  

- **401 Unauthorized**  
  - Brak nagłówka `Authorization`, nieprawidłowy lub wygasły token JWT.  
  - Zalecany format: `{ "error": "Unauthorized" }`.  

- **403 Forbidden**  
  - Użytkownik nie jest właścicielem profilu trawnika o podanym `lawnProfileId`.  
  - Zalecany format: `{ "error": "Forbidden", "message": "Brak dostępu do tego profilu trawnika" }`.  

- **404 Not Found**  
  - Profil trawnika o podanym `lawnProfileId` nie istnieje.  
  - Zalecany format: `{ "error": "Not Found", "message": "Profil trawnika nie został znaleziony" }`.  

- **500 Internal Server Error**  
  - Nieoczekiwany błąd bazy danych lub serwera.  
  - Nie ujawniać szczegółów technicznych w body; logować po stronie serwera.  

---

## 5. Przepływ danych

1. **Żądanie** – klient wysyła GET na `/api/lawn-profiles/:lawnProfileId/treatments` z nagłówkiem `Authorization: Bearer <token>` oraz opcjonalnymi query params.
2. **Middleware** – Astro middleware ustawia `context.locals.supabase`. Endpoint korzysta wyłącznie z `context.locals.supabase` (nie importuje klienta bezpośrednio w handlerze).
3. **Autentykacja** – na podstawie JWT z nagłówka Authorization pobierany jest użytkownik (np. `supabase.auth.getUser(jwt)`). Brak użytkownika lub nieprawidłowy token → 401.
4. **Walidacja path param** – `lawnProfileId` musi być poprawnym UUID. Błąd → 400.
5. **Weryfikacja dostępu** – sprawdzenie, czy profil trawnika o `lawnProfileId` istnieje i czy `user_id` profilu = `auth.uid()`. Brak profilu → 404. Profil istnieje, ale user_id ≠ auth.uid() → 403.
6. **Walidacja query params** – Zod: status (enum), template_id (UUID), from/to (YYYY-MM-DD), page (int ≥ 1), limit (int 1–100), sort (regex/enum), embed (opcjonalnie). Błąd → 400.
7. **Serwis** – wywołanie `getTreatmentsForLawn(supabase, lawnProfileId, parsedQuery)` w `src/lib/services/treatments.service.ts`. Serwis wykonuje zapytanie do tabeli `treatments` z filtrami i paginacją. Opcjonalnie: JOIN z `treatment_templates` przy `embed=template`.
8. **Odpowiedź** – zwrócenie 200 z body `{ data: Treatment[], total: number }` (lub `TreatmentWithEmbedded[]` przy embed). Content-Type: application/json.

**Uwaga:** Projekt używa `SUPABASE_SERVICE_ROLE_KEY` – RLS jest omijany. Weryfikacja własności trawnika musi być wykonana explicite w logice aplikacji (np. SELECT na lawn_profiles sprawdzający user_id).

---

## 6. Względy bezpieczeństwa

- **Uwierzytelnianie** – endpoint wymaga poprawnego JWT Supabase w nagłówku `Authorization: Bearer <token>`. Brak lub nieprawidłowy token → 401.
- **Autoryzacja** – przed zwróceniem zabiegów należy zweryfikować, czy użytkownik jest właścicielem profilu trawnika (`lawn_profiles.user_id = auth.uid()`). W przeciwnym razie → 403.
- **Row Level Security (RLS)** – przy użyciu klienta z kluczem `service_role` RLS jest omijany. Dlatego weryfikacja własności musi być wykonywana w warstwie aplikacji (SELECT lawn_profiles WHERE id = lawnProfileId AND user_id = userId).
- **Walidacja UUID** – `lawnProfileId` i `template_id` muszą być walidowane jako UUID, aby uniknąć SQL injection i błędnych zapytań.
- **Walidacja zakresu dat** – `from` ≤ `to`; daty w formacie ISO 8601 (YYYY-MM-DD).
- **Limit paginacji** – `limit` max 100, aby zapobiec nadmiernemu obciążeniu serwera.
- **Brak wrażliwych danych w logach** – nie logować JWT ani pełnych nagłówków Authorization.

---

## 7. Obsługa błędów

| Scenariusz                             | Kod HTTP | Działanie                                                                 |
|----------------------------------------|----------|----------------------------------------------------------------------------|
| Brak / nieprawidłowy JWT               | 401      | Zwrócić `{ "error": "Unauthorized" }`.                                     |
| Nieprawidłowy format lawnProfileId     | 400      | Zwrócić `{ "error": "Validation error", "details": [...] }`.               |
| Nieprawidłowe query params             | 400      | Zwrócić `{ "error": "Validation error", "details": [...] }`.               |
| Profil trawnika nie istnieje           | 404      | Zwrócić `{ "error": "Not Found", "message": "Profil trawnika nie został znaleziony" }`. |
| Użytkownik nie jest właścicielem       | 403      | Zwrócić `{ "error": "Forbidden", "message": "Brak dostępu do tego profilu trawnika" }`. |
| Błąd bazy (połączenie, timeout, inny)  | 500      | Zwrócić ogólny komunikat błędu; szczegóły tylko w logach serwera.          |
| Brak `locals.supabase` (konfiguracja)  | 500      | Zwrócić 500; zalogować błąd.                                               |

W projekcie nie ma dedykowanej tabeli błędów – błędy sygnalizowane są kodami HTTP i opcjonalnie logowaniem po stronie serwera.

---

## 8. Rozważania dotyczące wydajności

- **Weryfikacja dostępu** – pojedynczy SELECT na `lawn_profiles` po id z warunkiem `user_id = ?` – indeks `idx_lawn_profiles_user_id` wspiera to zapytanie.
- **Główne zapytanie** – SELECT na `treatments` z filtrami: `lawn_profile_id`, `status`, `template_id`, `data_proponowana` (BETWEEN from AND to). Indeksy:
  - `idx_treatments_lawn_profile_status` – (lawn_profile_id, status, expires_at)
  - `idx_treatments_template_id` – (template_id)
  - `idx_treatments_data_proponowana` – (data_proponowana)
- **COUNT dla total** – osobne zapytanie z tymi samymi filtrami, bez ORDER BY i LIMIT. Można rozważyć pojedyncze zapytanie z window function, ale dwa oddzielne SELECT-y są zwykle czytelniejsze i wystarczająco wydajne.
- **Embed template** – przy `embed=template` użyć LEFT JOIN z `treatment_templates` i zwrócić wybrane kolumny (id, nazwa, typ_zabiegu, minimalny_cooldown_dni). Supabase `.select()` obsługuje zagnieżdżone relacje.
- **Limit paginacji** – max 100 elementów na stronę minimalizuje ryzyko przeciążenia.
- **Sortowanie** – domyślnie `data_proponowana ASC`; indeks `idx_treatments_data_proponowana` wspiera sortowanie. Przy sortowaniu DESC również wykorzystywany.

---

## 9. Etapy wdrożenia

### Krok 1: Schemat Zod dla parametrów zapytania

Utworzyć plik `src/lib/schemas/treatments.schema.ts`:

- Schemat `getTreatmentsQuerySchema` z polami:
  - `status` – z.enum(["aktywny", "wykonany", "odrzucony", "wygasły"]).optional()
  - `template_id` – z.string().uuid().optional()
  - `from` – z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  - `to` – z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  - `page` – z.coerce.number().int().min(1).optional().default(1)
  - `limit` – z.coerce.number().int().min(1).max(100).optional().default(20)
  - `sort` – z.enum(["data_proponowana_asc", "data_proponowana_desc"]).optional().default("data_proponowana_asc")
  - `embed` – z.enum(["template"]).optional()
- Refine: jeśli podano `from` i `to`, sprawdzić `from <= to`.
- Mapowanie query param `sort=data_proponowana` (bez _asc/_desc) na domyślny kierunek – specyfikacja mówi o `sort=data_proponowana` z kierunkiem asc/desc; przyjąć format `sort=data_proponowana` + osobny param `order=asc|desc` lub `sort=data_proponowana_asc|data_proponowana_desc`.
- Eksportować typ: `GetTreatmentsQuerySchema = z.infer<typeof getTreatmentsQuerySchema>`.

**Uwaga:** W specyfikacji API `sort=data_proponowana` z kierunkiem asc/desc. Proponowany format query: `?sort=data_proponowana&order=asc` lub `?sort=data_proponowana_asc`. Schemat powinien akceptować oba warianty – np. pojedynczy param `sort` z wartościami `data_proponowana` (domyślnie asc) i `data_proponowana_desc`.

### Krok 2: Serwis zabiegów

Utworzyć plik `src/lib/services/treatments.service.ts`:

- Importować typ `SupabaseClient` z `src/db/supabase.client.ts`, typy `Treatment`, `TreatmentWithEmbedded`, `TreatmentTemplateSummary` z `src/types.ts`, oraz typ schematu query.
- Funkcja `getLawnProfileOwnerId(supabase, lawnProfileId): Promise<string | null>` – zwraca `user_id` profilu trawnika, jeśli istnieje; w przeciwnym razie `null`. SELECT id, user_id FROM lawn_profiles WHERE id = lawnProfileId. Zwraca user_id lub null.
- Funkcja `getTreatmentsForLawn(supabase, lawnProfileId, query): Promise<{ data: Treatment[] | TreatmentWithEmbedded[], total: number }>`:
  - Buduje zapytanie Supabase: `.from("treatments").select(...)` z opcjonalnym `treatment_templates(id, nazwa, typ_zabiegu, minimalny_cooldown_dni)` przy embed=template.
  - Filtry: `.eq("lawn_profile_id", lawnProfileId)`, opcjonalnie `.eq("status", query.status)`, `.eq("template_id", query.template_id)`, `.gte("data_proponowana", query.from)`, `.lte("data_proponowana", query.to)`.
  - Paginacja: `.range((page-1)*limit, page*limit-1)`.
  - Sortowanie: `.order("data_proponowana", { ascending: query.sort !== "data_proponowana_desc" })`.
  - Dla total: osobne zapytanie z `.select("id", { count: "exact", head: true })` z tymi samymi filtrami.
  - Zwrócić `{ data, total }`.

### Krok 3: Plik endpointu GET

Utworzyć plik `src/pages/api/lawn-profiles/[lawnProfileId]/treatments.ts`:

- Na początku: `export const prerender = false`.
- Tymczasowe obejście (do wdrożenia auth): stała `DEV_USER_ID = "00000000-0000-0000-0000-000000000001"` (analogicznie do innych endpointów).
- Handler `GET({ params, request, locals })`:
  - Pobranie `lawnProfileId` z `params.lawnProfileId`. Walidacja UUID (Zod lub prosty regex).
  - Sprawdzenie `locals.supabase` – brak → 500.
  - Parsowanie query params z `request.url` (np. `new URL(request.url).searchParams`) i walidacja przez `getTreatmentsQuerySchema.safeParse()`.
  - Autentykacja: tymczasowo `DEV_USER_ID`; po wdrożeniu auth: `supabase.auth.getUser(jwt)` z nagłówka Authorization.
  - Wywołanie `getLawnProfileOwnerId(supabase, lawnProfileId)`:
    - null → 404 (profil nie istnieje).
    - ownerId ≠ userId → 403 (brak dostępu).
  - Wywołanie `getTreatmentsForLawn(supabase, lawnProfileId, parsedQuery.data)`.
  - Zwrócenie 200 z `{ data, total }` i nagłówkiem `Content-Type: application/json`.
- Obsługa błędów: 400 (walidacja), 401 (brak auth), 403, 404, 500 (try/catch).

### Krok 4: Stałe i nagłówki

- Stała `JSON_HEADERS = { "Content-Type": "application/json" }` – użyć we wszystkich odpowiedziach.
- Schemat UUID dla lawnProfileId: `z.string().uuid()` – w handlerze lub osobnym schemacie path params.

### Krok 5: Mapowanie parametru sort

Specyfikacja API: `?sort=data_proponowana` (asc/desc). Propozycja:

- `sort=data_proponowana` lub `sort=data_proponowana_asc` → ascending.
- `sort=data_proponowana_desc` → descending.
- Schemat Zod: `z.enum(["data_proponowana", "data_proponowana_asc", "data_proponowana_desc"]).optional().default("data_proponowana")`.

### Krok 6: Spójność z regułami projektu

- Używać wyłącznie `context.locals.supabase` (nie bezpośredniego importu klienta w handlerze).
- Nazwa handlera w wielkiej literze: `GET`.
- Logikę odczytu trzymać w serwisie; endpoint: auth, walidacja, wywołanie serwisu, mapowanie błędów na kody HTTP.
- Typy importować z `src/types.ts`, `SupabaseClient` z `src/db/supabase.client.ts`.
- Zgodnie z regułami: early returns, guard clauses, brak zbędnych else.

---

Po realizacji powyższych kroków endpoint GET /api/lawn-profiles/:lawnProfileId/treatments będzie zgodny ze specyfikacją API (response 200 z `{ data, total }`, błędy 400, 401, 403, 404, 500), planem bazy danych, typami z `src/types.ts` oraz regułami backendu i Astro.

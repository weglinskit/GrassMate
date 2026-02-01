# Sugestie testów jednostkowych – GrassMate

Które elementy projektu warto przetestować z wykorzystaniem unit testów i dlaczego.

---

## 1. Schematy Zod (`src/lib/schemas/`)

**Pliki:** `auth.schema.ts`, `lawn-profiles.schema.ts`, `complete-treatment.schema.ts`, `treatments.schema.ts`

**Dlaczego:**
- **Czysta logika** – tylko walidacja, zero I/O.
- **Wiele ścieżek** – puste pola, zły email, za krótkie hasło, `refine` (np. zgodność haseł), zakresy liczb (latitude/longitude), regex daty.
- **Bezpieczeństwo i spójność danych** – od nich zależy, co trafia do bazy i do Supabase Auth.
- **Łatwe testy** – `schema.parse()` / `schema.safeParse()` i asercje na wynikach i komunikatach błędów.

**Przykład:** W `auth.schema.ts` warto mieć testy: poprawny login, brak emaila, niepoprawny email, za krótkie hasło, niezgodne hasła w rejestracji/resetcie.

---

## 2. Mapowanie błędów auth (`src/lib/auth.errors.ts`)

**Funkcja:** `mapAuthErrorToMessage(error, context)`

**Dlaczego:**
- **Czysta funkcja** – wejście (obiekt błędu + kontekst), wyjście (string).
- **Wiele gałęzi** – invalid credentials, email not confirmed, already registered, rate limit, network, fallback dla `login` vs `register`.
- **UX i bezpieczeństwo** – zapobiega wyciekowi wewnętrznych komunikatów Supabase.
- **Proste testy** – przekazujesz różne `error.message` i sprawdzasz zwrócony komunikat.

---

## 3. Funkcja `cn` (`src/lib/utils.ts`) – już jest test

Masz już testy dla `cn`; warto je utrzymywać przy zmianach w `utils.ts`.

---

## 4. Logika serwisów przy zwracanych błędach (opcjonalnie, z mockami)

**Pliki:** `lawn-profiles.service.ts`, `treatments.service.ts`

**Co ma sens testować jednostkowo (z mockowanym Supabase):**
- **Mapowanie błędów** – np. `error.code === "23505"` → `UniqueActiveProfileError` w `createLawnProfile` i `updateLawnProfile`.
- **Guardy** – `getLawnProfileById` zwraca `null` → `updateLawnProfile` rzuca `LawnProfileNotFoundError`; `existing.user_id !== userId` → `LawnProfileForbiddenError`.
- **Budowanie payloadu** – np. w `createLawnProfile` że `body` jest poprawnie mapowane na obiekt do `insert` (w tym domyślne wartości).

**Dlaczego:** To logika biznesowa i obsługa błędów; testy z mockami nie wymagają bazy i dają szybki feedback. Pełny flow lepiej pokryć testami integracyjnymi/E2E.

---

## 5. `mapRowWithTemplate` w `treatments.service.ts`

**Dlaczego:** Czysta funkcja: obiekt z `treatment_templates` → `TreatmentWithEmbedded`. Łatwo przetestować różne warianty (z/bez `treatment_templates`). Obecnie jest nieeksportowana – albo wyeksportować i testować wprost, albo testować przez `getTreatmentsForLawn` z mockiem Supabase.

---

## 6. Komponenty React (formularze, logika w komponentach)

**Przykłady:** `LoginForm`, `RegisterForm`, `ProfileCreateForm`, `ProfileEditForm`, `CompleteTreatmentDrawer`.

**Dlaczego rozważyć:**
- Używają tych samych schematów Zod – testy komponentów mogą potwierdzić, że błędy walidacji są wyświetlane.
- `mapAuthErrorToMessage` jest używane przy błędach z Supabase – testy komponentu mogą sprawdzić, że wyświetlany jest „przyjazny” komunikat.

**Uwaga:** Wymaga `jsdom` i np. React Testing Library; sensowne głównie dla krytycznych formularzy i tam, gdzie w komponencie jest nietrywialna logika (nie tylko „wywołaj API”).

---

## Podsumowanie – priorytety

| Priorytet   | Element                                                                 | Powód                                                                 |
|------------|-------------------------------------------------------------------------|-----------------------------------------------------------------------|
| **Wysoki** | Schematy Zod (auth, lawn-profiles, complete-treatment, treatments)     | Czysta logika, dużo przypadków brzegowych, wpływ na bezpieczeństwo i dane. |
| **Wysoki** | `mapAuthErrorToMessage`                                                 | Czysta funkcja, wiele gałęzi, ważna dla UX i bezpieczeństwa.          |
| **Średni** | Obsługa błędów i guardy w serwisach (z mockami Supabase)               | Stabilna logika biznesowa bez uruchamiania bazy.                      |
| **Średni** | `mapRowWithTemplate` (po ewentualnym wyeksportowaniu)                    | Czysta funkcja, proste testy.                                         |
| **Niższy** | Komponenty formularzy (Testing Library)                                 | Warto tam, gdzie jest złożona logika lub krytyczne ścieżki UX.        |

Raczej **nie** warto inwestować w unit testy dla:
- **Endpointów API** (lepiej testy integracyjne lub E2E),
- **Layoutów Astro** (głównie markup),
- **Prostych komponentów UI** (np. przyciski z shadcn) – chyba że pojawia się w nich logika.

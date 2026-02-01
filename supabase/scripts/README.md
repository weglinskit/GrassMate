# Skrypty Supabase

## Użytkownik deweloperski (dev@grassmate.local)

Jeśli logowanie z użytkownikiem wstawionym w migracji zwraca „Database error querying schema”, możesz utworzyć użytkownika przez Auth Admin API – wtedy GoTrue sam uzupełni wszystkie kolumny w `auth.users`.

### 1. Pobierz klucz service_role

W katalogu projektu uruchom:

```bash
supabase status
```

Skopiuj **service_role key** (nie anon key).

### 2. Uruchom skrypt

```bash
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<wklej-klucz> ./supabase/scripts/seed-dev-user.sh
```

Albo ustaw zmienne w `.env` i załaduj je przed skryptem.

### 3. Zaloguj się

- E-mail: **dev@grassmate.local**
- Hasło: **dev-password**

---

## Logi Auth (diagnostyka błędu „Database error querying schema”)

W Supabase CLI nie ma komendy `logs` – logi Auth są w kontenerze Docker. Żeby zobaczyć **dokładny błąd** z GoTrue przy logowaniu:

1. Sprawdź nazwę kontenera Auth: `docker ps | grep auth` (np. `supabase_auth_GrassMate`)
2. W jednym terminalu uruchom (podmień nazwę, jeśli inna):
   ```bash
   docker logs -f supabase_auth_GrassMate
   ```
3. W przeglądarce lub przez curl spróbuj się zalogować (dev@grassmate.local / dev-password)
4. W terminalu z logami zobaczysz stack trace / komunikat z bazy (np. brakująca kolumna, NULL w tokenie itd.)

Dzięki temu możesz sprawdzić, czy problem to NULL w kolumnach tokenów, brakująca kolumna `confirmed_at`, czy coś innego (np. uprawnienia, trigger).

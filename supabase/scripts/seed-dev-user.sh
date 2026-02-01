#!/usr/bin/env bash
# Tworzy użytkownika deweloperskiego przez Auth Admin API (bezpieczna alternatywa dla INSERT do auth.users).
# Użycie: SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=... ./supabase/scripts/seed-dev-user.sh
# Klucz service_role: uruchom `supabase status` w katalogu projektu i skopiuj "service_role key".

set -e

URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$KEY" ]; then
  echo "Ustaw SUPABASE_SERVICE_ROLE_KEY (np. z 'supabase status')."
  exit 1
fi

echo "Tworzenie użytkownika dev@grassmate.local przez Auth Admin API..."
resp=$(curl -s -w "\n%{http_code}" -X POST "$URL/auth/v1/admin/users" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@grassmate.local",
    "password": "dev-password",
    "email_confirm": true
  }')

body=$(echo "$resp" | head -n -1)
code=$(echo "$resp" | tail -n 1)

if [ "$code" = "200" ] || [ "$code" = "201" ]; then
  echo "Użytkownik utworzony (lub już istnieje). Możesz się zalogować: dev@grassmate.local / dev-password"
  exit 0
fi

if echo "$body" | grep -q "already been registered"; then
  echo "Użytkownik dev@grassmate.local już istnieje. Możesz się zalogować: dev@grassmate.local / dev-password"
  exit 0
fi

echo "Błąd ($code): $body"
exit 1

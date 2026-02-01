-- ============================================================================
-- migracja: fix_auth_users_null_tokens
-- opis: naprawia błąd "Database error querying schema" przy logowaniu.
--       Backend Auth (Go) skanuje kolumny tokenów do string; NULL powoduje błąd.
--       Ustawiamy: tokeny na '', confirmed_at na now() tam, gdzie NULL.
-- ============================================================================

-- Tokeny/tekstowe – NULL nie może być skanowany do string w Go (Scan error: converting NULL to string)
update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  recovery_token = coalesce(recovery_token, '')
where confirmation_token is null
   or email_change is null
   or email_change_token_new is null
   or recovery_token is null;

-- confirmed_at jest kolumną wygenerowaną (GENERATED) w auth.users – nie można jej aktualizować ręcznie.

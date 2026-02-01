-- ============================================================================
-- migracja: seed_dev_user
-- opis: wstawia użytkownika deweloperskiego do auth.users, żeby FK z lawn_profiles.user_id działał.
--       id użytkownika: 00000000-0000-0000-0000-000000000001 (zgodny z DEV_USER_ID w API).
--       logowanie: dev@grassmate.local / dev-password
-- ============================================================================

-- pgcrypto jest standardowo dostępne w Supabase (haszowanie hasła)
create extension if not exists pgcrypto;

-- Wstaw użytkownika tylko gdy jeszcze nie istnieje (bezpieczne przy ponownym uruchomieniu migracji).
-- Kolumny tokenów muszą być '' zamiast NULL – backend Auth skanuje je do string i NULL powoduje
-- błąd "Database error querying schema" przy logowaniu.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dev@grassmate.local',
  crypt('dev-password', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

-- Wpis w auth.identities jest wymagany, żeby logowanie (email/hasło) działało.
-- Stały id identity, żeby ON CONFLICT (id) było idempotentne przy ponownym uruchomieniu migracji.
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "dev@grassmate.local"}'::jsonb,
  'email',
  now(),
  now()
)
on conflict (id) do nothing;

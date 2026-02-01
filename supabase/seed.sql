-- ============================================================================
-- seed: użytkownik deweloperski (tylko lokalnie)
-- Uruchamiane przy `supabase db reset`. NIE jest uruchamiane przy `supabase db push`.
-- id: 00000000-0000-0000-0000-000000000001 | logowanie: dev@grassmate.local / dev-password
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

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
  extensions.crypt('dev-password', extensions.gen_salt('bf')),
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

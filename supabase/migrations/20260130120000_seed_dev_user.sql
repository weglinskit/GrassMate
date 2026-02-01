-- ============================================================================
-- migracja: seed_dev_user (no-op na Cloud)
-- opis: Użytkownik deweloperski (dev@grassmate.local) nie jest wstawiany w migracjach,
--       żeby nie trafiał na Cloud. Jest w supabase/seed.sql i uruchamiany tylko
--       lokalnie przy `supabase db reset` (seed nie jest wykonywany przy `db push`).
-- ============================================================================
select 1;

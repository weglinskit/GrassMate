import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

/** Typ klienta Supabase – używaj zamiast importu z @supabase/supabase-js */
export type SupabaseClient = import('@supabase/supabase-js').SupabaseClient<Database>;

const supabaseUrl = import.meta.env.SUPABASE_URL;
/** Klucz service_role omija RLS – umożliwia API tworzenie wierszy (np. lawn_profiles) bez JWT. Tylko na serwerze. */
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  serviceRoleKey ?? anonKey
);

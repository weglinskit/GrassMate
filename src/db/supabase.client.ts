import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

/** Typ klienta Supabase – używaj zamiast importu z @supabase/supabase-js */
export type SupabaseClient = import('@supabase/supabase-js').SupabaseClient<Database>;

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

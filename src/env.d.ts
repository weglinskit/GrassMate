/// <reference types="astro/client" />

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db/database.types';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  /** Tylko na serwerze (API). Omija RLS – umożliwia tworzenie lawn_profiles bez JWT. */
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly OPENROUTER_API_KEY: string;
  /** Gdy 'true' – guard autoryzacji przekierowuje niezalogowanych na /login. Domyślnie false. */
  readonly PUBLIC_AUTH_GUARD_ENABLED?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  /** Klucz anon Supabase – używany na serwerze (middleware, API) i w przeglądarce. */
  readonly SUPABASE_KEY: string;
  /** Tylko na serwerze (API). Omija RLS – opcjonalnie do operacji administracyjnych. */
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  /** URL Supabase – eksponowany do przeglądarki (klient auth, JWT w localStorage). */
  readonly PUBLIC_SUPABASE_URL: string;
  /** Klucz anon Supabase – eksponowany do przeglądarki (ten sam co SUPABASE_KEY). */
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  /** Gdy 'true' – guard autoryzacji (client-side) przekierowuje niezalogowanych na /login. Domyślnie false. */
  readonly PUBLIC_AUTH_GUARD_ENABLED?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

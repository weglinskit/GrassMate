/**
 * Klient Supabase dla kodu uruchamianego w przeglądarce (React, client:load).
 * Używa createBrowserClient z @supabase/ssr – sesja jest w cookies, więc
 * middleware i serwer widzą tę samą sesję po zalogowaniu.
 */

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY. " +
      "Ustaw zmienne w .env (np. PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY).",
  );
}

export const supabaseBrowser = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import type { Database } from "../src/db/database.types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function log(msg: string): void {
  process.stderr.write(`[e2e teardown] ${msg}\n`);
}

/**
 * Global teardown Playwright – czyści tabelę lawn_profiles dla użytkownika testowego (E2E).
 * Uruchamiane po zakończeniu wszystkich testów E2E.
 * Używa klucza publicznego (PUBLIC_SUPABASE_ANON_KEY) i logowania jako użytkownik testowy (RLS).
 * Wymaga w .env: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY oraz E2E_SEED_USER_EMAIL, E2E_SEED_USER_PASSWORD.
 */
export default async function globalTeardown(): Promise<void> {
  log("Start teardown.");

  dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

  const url = process.env.PUBLIC_SUPABASE_URL;
  const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.E2E_SEED_USER_EMAIL ?? "dev@grassmate.local";
  const password = process.env.E2E_SEED_USER_PASSWORD ?? "dev-password";

  if (!url || !anonKey) {
    log(
      "Pominięto czyszczenie lawn_profiles: brak PUBLIC_SUPABASE_URL lub PUBLIC_SUPABASE_ANON_KEY w .env"
    );
    return;
  }

  const supabase = createClient<Database>(url, anonKey);

  const { data: sessionData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    log(`Nie zalogowano użytkownika E2E, pominięto czyszczenie: ${signInError.message}`);
    return;
  }

  const userId = sessionData.user?.id;
  if (!userId) {
    log("Brak user.id w sesji, pominięto czyszczenie.");
    return;
  }

  const { data: deleted, error } = await supabase
    .from("lawn_profiles")
    .delete()
    .eq("user_id", userId)
    .select("id");

  if (error) {
    log(`Błąd usuwania lawn_profiles: ${error.message}`);
    return;
  }

  const count = deleted?.length ?? 0;
  log(`Zakończono. Usunięto ${count} wpisów lawn_profiles dla użytkownika E2E.`);
}

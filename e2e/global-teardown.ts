import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";

/**
 * Global teardown Playwright – czyści tabelę lawn_profiles dla użytkownika testowego (E2E).
 * Uruchamiane po zakończeniu wszystkich testów E2E.
 * Wymaga w .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, opcjonalnie E2E_SEED_USER_ID.
 */
export default async function globalTeardown(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId =
    process.env.E2E_SEED_USER_ID ?? "00000000-0000-0000-0000-000000000001";

  if (!url || !serviceRoleKey) {
    console.warn(
      "[e2e teardown] Pominięto czyszczenie lawn_profiles: brak SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env"
    );
    return;
  }

  const supabase = createClient<Database>(url, serviceRoleKey);

  const { error } = await supabase
    .from("lawn_profiles")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.warn("[e2e teardown] Błąd usuwania lawn_profiles:", error.message);
    return;
  }

  console.log("[e2e teardown] Usunięto wpisy lawn_profiles dla użytkownika E2E.");
}

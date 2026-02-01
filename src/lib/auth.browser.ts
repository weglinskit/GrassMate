/**
 * Pomocniki autentykacji po stronie przeglądarki (React).
 * Sesja (JWT) jest w localStorage; do requestów API dołączaj Authorization: Bearer <token>.
 */

import { supabaseBrowser } from "@/db/supabase.browser";

/**
 * Zwraca aktualny access_token z sesji Supabase lub null.
 * Używaj do nagłówka Authorization w wywołaniach API.
 */
export async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();
  return session?.access_token ?? null;
}

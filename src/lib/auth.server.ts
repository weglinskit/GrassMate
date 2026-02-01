/**
 * Pomocniki autentykacji po stronie serwera (API, middleware).
 * Użytkownik jest weryfikowany przez JWT z nagłówka Authorization: Bearer <access_token>.
 */

import type { SupabaseClient } from "@/db/supabase.client";

const BEARER_PREFIX = "Bearer ";

/**
 * Pobiera identyfikator użytkownika z JWT w nagłówku Authorization.
 * Zwraca userId lub null, gdy brak nagłówka, nieprawidłowy token lub błąd weryfikacji.
 */
export async function getUserIdFromRequest(
  request: Request,
  supabase: SupabaseClient,
): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const accessToken = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!accessToken) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user?.id) {
    return null;
  }

  return user.id;
}

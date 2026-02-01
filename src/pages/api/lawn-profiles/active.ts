/**
 * Endpoint API: GET /api/lawn-profiles/active
 * Zwraca aktywny profil trawnika użytkownika (is_active = true) lub null.
 * Wymagana autentykacja: Authorization: Bearer <JWT>. Brak/wygasły token → 401.
 */

import { getUserIdFromRequest } from "../../../lib/auth.server";
import { getActiveLawnProfile } from "../../../lib/services/lawn-profiles.service";
import type { LawnProfile } from "../../../types";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * GET – pobranie aktywnego profilu trawnika użytkownika.
 * Zwraca 200 z { data: LawnProfile | null }. Brak aktywnego profilu → data: null (nie 404).
 * Brak locals.supabase → 500. Błąd bazy → 500 i log po stronie serwera.
 */
export async function GET({
  request,
  locals,
}: {
  request: Request;
  locals: App.Locals;
}) {
  const supabase = locals.supabase;
  if (!supabase) {
    // eslint-disable-next-line no-console -- log API errors for debugging
    console.error("GET /api/lawn-profiles/active: brak locals.supabase");
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const userId = await getUserIdFromRequest(request, supabase);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  try {
    const data: LawnProfile | null = await getActiveLawnProfile(
      supabase,
      userId,
    );
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (e) {
    // eslint-disable-next-line no-console -- log API errors for debugging
    console.error("GET /api/lawn-profiles/active error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

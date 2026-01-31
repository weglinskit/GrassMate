/**
 * Endpoint API: GET /api/lawn-profiles/active
 * Zwraca aktywny profil trawnika użytkownika (is_active = true) lub null.
 *
 * Tymczasowe obejście (bez JWT): używamy DEV_USER_ID – ten sam co w POST /api/lawn-profiles.
 * Po wdrożeniu auth: pobierać userId z JWT (supabase.auth.getUser(jwt)).
 */

import { getActiveLawnProfile } from "../../../lib/services/lawn-profiles.service";
import type { LawnProfile } from "../../../types";

export const prerender = false;

/** Tymczasowe obejście – ten sam zahardkodowany user_id co w POST /api/lawn-profiles. */
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * GET – pobranie aktywnego profilu trawnika użytkownika.
 * Zwraca 200 z { data: LawnProfile | null }. Brak aktywnego profilu → data: null (nie 404).
 * Brak locals.supabase → 500. Błąd bazy → 500 i log po stronie serwera.
 */
export async function GET({
  locals,
}: {
  request: Request;
  locals: App.Locals;
}) {
  const supabase = locals.supabase;
  if (!supabase) {
    console.error("GET /api/lawn-profiles/active: brak locals.supabase");
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  try {
    const data: LawnProfile | null = await getActiveLawnProfile(
      supabase,
      DEV_USER_ID
    );
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (e) {
    console.error("GET /api/lawn-profiles/active error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

/**
 * Endpoint API: GET /api/lawn-profiles/active
 * Zwraca aktywny profil trawnika zalogowanego użytkownika (is_active = true) lub null.
 * Na tym etapie user_id jest zahardkodowany; moduł auth (JWT) zostanie wdrożony później.
 *
 * Zgodność z regułami: tylko context.locals.supabase (bez importu klienta), typy z src/types.ts,
 * logika odczytu w serwisie; w logach nie umieszczamy JWT ani nagłówków Authorization.
 */

import { getActiveLawnProfile } from "../../../lib/services/lawn-profiles.service";
import type { LawnProfile } from "../../../types";

export const prerender = false;

/**
 * Tymczasowo zahardkodowany user_id – spójnie z POST /api/lawn-profiles.
 * Po wdrożeniu JWT: pobierać user z supabase.auth.getUser(jwt).
 */
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

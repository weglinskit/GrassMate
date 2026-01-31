/**
 * Endpoint API: POST /api/lawn-profiles
 * Tworzy nowy profil trawnika dla użytkownika.
 *
 * Tymczasowe obejście (bez JWT): nie wymagamy nagłówka Authorization. Wszystkie nowe
 * profile są przypisywane do DEV_USER_ID. Backend używa klucza SUPABASE_SERVICE_ROLE_KEY,
 * więc RLS jest omijany i insert działa bez zalogowanego użytkownika.
 *
 * Po wdrożeniu auth: pobierać userId z JWT (Authorization: Bearer <token> →
 * supabase.auth.getUser(jwt)), przy braku użytkownika zwracać 401.
 */

import { createLawnProfile, UniqueActiveProfileError } from "../../lib/services/lawn-profiles.service";
import { createLawnProfileSchema } from "../../lib/schemas/lawn-profiles.schema";
import type { LawnProfile } from "../../types";

export const prerender = false;

/**
 * Tymczasowe obejście – zahardkodowany user_id dopóki auth (JWT) nie jest wdrożony.
 * Wszystkie tworzone lawn_profiles są powiązane z tym użytkownikiem.
 * Użytkownik z seeda: supabase/migrations/20260130120000_seed_dev_user.sql.
 * Logowanie (gdy włączysz auth): dev@grassmate.local / dev-password
 */
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * POST – tworzenie nowego profilu trawnika.
 * Waliduje body (Zod), zapisuje do bazy przez serwis, zwraca 201 z utworzonym LawnProfile.
 */
export async function POST({
  request,
  locals,
}: {
  request: Request;
  locals: App.Locals;
}) {
  const supabase = locals.supabase;
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details: [{ message: "Nieprawidłowy JSON w body" }],
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const parsed = createLawnProfileSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    const detailList = Object.entries(details).flatMap(([field, messages]) =>
      (messages ?? []).map((msg) => ({ field, message: msg }))
    );
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details: detailList.length > 0 ? detailList : [{ message: parsed.error.message }],
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  try {
    const lawnProfile: LawnProfile = await createLawnProfile(
      supabase,
      DEV_USER_ID,
      parsed.data
    );
    return new Response(JSON.stringify({ data: lawnProfile }), {
      status: 201,
      headers: JSON_HEADERS,
    });
  } catch (e) {
    if (e instanceof UniqueActiveProfileError) {
      return new Response(
        JSON.stringify({ error: e.message }),
        { status: 409, headers: JSON_HEADERS }
      );
    }
    console.error("POST /api/lawn-profiles error:", e);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
}

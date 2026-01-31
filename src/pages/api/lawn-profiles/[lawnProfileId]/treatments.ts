/**
 * Endpoint API: GET /api/lawn-profiles/:lawnProfileId/treatments
 * Zwraca paginowaną listę zabiegów powiązanych z danym profilem trawnika.
 *
 * Wymagana autentykacja (JWT): brak/wygasły token → 401.
 * Weryfikacja dostępu: profil musi istnieć (404) i user_id profilu = auth.uid() (403).
 *
 * Tymczasowe obejście (bez JWT): używamy DEV_USER_ID – ten sam co w POST /api/lawn-profiles.
 * Po wdrożeniu auth: pobierać userId z JWT (supabase.auth.getUser(jwt) z nagłówka Authorization).
 */

import { getLawnProfileOwnerId, getTreatmentsForLawn } from "../../../../lib/services/treatments.service";
import { getTreatmentsQuerySchema } from "../../../../lib/schemas/treatments.schema";
import { z } from "zod";

export const prerender = false;

/** Tymczasowe obejście – zahardkodowany user_id dopóki auth (JWT) nie jest wdrożony. */
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

const JSON_HEADERS = { "Content-Type": "application/json" };

/** Schemat walidacji path param lawnProfileId (UUID v4). */
const lawnProfileIdSchema = z.object({
  lawnProfileId: z.string().uuid("Nieprawidłowy format UUID profilu trawnika"),
});

/**
 * Buduje obiekt parametrów zapytania z URL searchParams do walidacji Zod.
 * Wartości są przekazywane jako stringi – schemat używa coerce dla page/limit.
 */
function queryParamsFromRequest(request: Request): Record<string, string> {
  const url = request.url ? new URL(request.url) : null;
  if (!url) return {};
  return Object.fromEntries(url.searchParams.entries());
}

/**
 * GET – pobranie listy zabiegów dla profilu trawnika.
 * Waliduje lawnProfileId (path), query params (Zod), weryfikuje dostęp (404/403), zwraca 200 z { data, total }.
 */
export async function GET({
  params,
  request,
  locals,
}: {
  params: Record<string, string | undefined>;
  request: Request;
  locals: App.Locals;
}) {
  const supabase = locals.supabase;
  if (!supabase) {
    console.error(
      "GET /api/lawn-profiles/[lawnProfileId]/treatments: brak locals.supabase"
    );
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  const pathResult = lawnProfileIdSchema.safeParse(params);
  if (!pathResult.success) {
    const details = pathResult.error.flatten().fieldErrors;
    const detailList = Object.entries(details).flatMap(([field, messages]) =>
      (messages ?? []).map((message) => ({ field, message }))
    );
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details:
          detailList.length > 0 ? detailList : [{ message: pathResult.error.message }],
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const { lawnProfileId } = pathResult.data;

  const queryParams = queryParamsFromRequest(request);
  const queryResult = getTreatmentsQuerySchema.safeParse(queryParams);
  if (!queryResult.success) {
    const details = queryResult.error.flatten().fieldErrors;
    const detailList = Object.entries(details).flatMap(([field, messages]) =>
      (messages ?? []).map((message) => ({ field, message }))
    );
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details:
          detailList.length > 0
            ? detailList
            : [{ field: "query", message: queryResult.error.message }],
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const userId = DEV_USER_ID;

  const ownerId = await getLawnProfileOwnerId(supabase, lawnProfileId);
  if (ownerId === null) {
    return new Response(
      JSON.stringify({
        error: "Not Found",
        message: "Profil trawnika nie został znaleziony",
      }),
      { status: 404, headers: JSON_HEADERS }
    );
  }

  if (ownerId !== userId) {
    return new Response(
      JSON.stringify({
        error: "Forbidden",
        message: "Brak dostępu do tego profilu trawnika",
      }),
      { status: 403, headers: JSON_HEADERS }
    );
  }

  try {
    const { data, total } = await getTreatmentsForLawn(
      supabase,
      lawnProfileId,
      queryResult.data
    );
    return new Response(JSON.stringify({ data, total }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (e) {
    console.error(
      "GET /api/lawn-profiles/[lawnProfileId]/treatments error:",
      e
    );
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

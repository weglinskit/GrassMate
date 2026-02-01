/**
 * Endpoint API: POST /api/lawn-profiles
 * Tworzy nowy profil trawnika dla użytkownika.
 * Wymagana autentykacja: Authorization: Bearer <JWT>. Brak/wygasły token → 401.
 */

import { getUserIdFromRequest } from "../../lib/auth.server";
import {
  createLawnProfile,
  UniqueActiveProfileError,
} from "../../lib/services/lawn-profiles.service";
import { createLawnProfileSchema } from "../../lib/schemas/lawn-profiles.schema";
import type { LawnProfile } from "../../types";

export const prerender = false;

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details: [{ message: "Nieprawidłowy JSON w body" }],
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const parsed = createLawnProfileSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    const detailList = Object.entries(details).flatMap(([field, messages]) =>
      (messages ?? []).map((msg) => ({ field, message: msg })),
    );
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details:
          detailList.length > 0
            ? detailList
            : [{ message: parsed.error.message }],
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  try {
    const lawnProfile: LawnProfile = await createLawnProfile(
      supabase,
      userId,
      parsed.data,
    );
    return new Response(JSON.stringify({ data: lawnProfile }), {
      status: 201,
      headers: JSON_HEADERS,
    });
  } catch (e) {
    if (e instanceof UniqueActiveProfileError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 409,
        headers: JSON_HEADERS,
      });
    }
    console.error("POST /api/lawn-profiles error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

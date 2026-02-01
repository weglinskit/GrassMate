/**
 * Endpoint API: PATCH /api/lawn-profiles/:lawnProfileId
 * Aktualizuje profil trawnika (częściowa aktualizacja).
 * Wymagana autentykacja: Authorization: Bearer <JWT>. Brak/wygasły token → 401.
 */

import { getUserIdFromRequest } from "../../../../lib/auth.server";
import {
  updateLawnProfile,
  UniqueActiveProfileError,
  LawnProfileNotFoundError,
  LawnProfileForbiddenError,
} from "../../../../lib/services/lawn-profiles.service";
import { updateLawnProfileSchema } from "../../../../lib/schemas/lawn-profiles.schema";
import type { LawnProfile } from "../../../../types";
import { z } from "zod";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };

const lawnProfileIdSchema = z.object({
  lawnProfileId: z.string().uuid("Nieprawidłowy format UUID profilu trawnika"),
});

export async function PATCH({
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

  const pathResult = lawnProfileIdSchema.safeParse(params);
  if (!pathResult.success) {
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details: [
          { field: "id", message: "Nieprawidłowy identyfikator profilu" },
        ],
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const { lawnProfileId } = pathResult.data;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details: [{ field: "_form", message: "Nieprawidłowy JSON w body" }],
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const parsed = updateLawnProfileSchema.safeParse(body);
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
    const lawnProfile: LawnProfile = await updateLawnProfile(
      supabase,
      userId,
      lawnProfileId,
      parsed.data,
    );
    return new Response(JSON.stringify({ data: lawnProfile }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (e) {
    if (e instanceof UniqueActiveProfileError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 409,
        headers: JSON_HEADERS,
      });
    }

    if (e instanceof LawnProfileNotFoundError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }
    if (e instanceof LawnProfileForbiddenError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 403,
        headers: JSON_HEADERS,
      });
    }

    console.error("PATCH /api/lawn-profiles/:id error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

/**
 * Endpoint API: PATCH /api/treatments/:id/complete
 * Oznacza zabieg jako wykonany.
 * Wymagana autentykacja: Authorization: Bearer <JWT>. Brak/wygasły token → 401.
 */

import { getUserIdFromRequest } from "../../../../lib/auth.server";
import { completeTreatment } from "../../../../lib/services/treatments.service";
import { completeTreatmentSchema } from "../../../../lib/schemas/complete-treatment.schema";
import { z } from "zod";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };

const idSchema = z.object({
  id: z.string().uuid("Nieprawidłowy format UUID zabiegu"),
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

  const pathResult = idSchema.safeParse(params);
  if (!pathResult.success) {
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details: [{ message: pathResult.error.message }],
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const { id: treatmentId } = pathResult.data;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return new Response(
      JSON.stringify({
        error: "Validation error",
        details: [{ message: "Nieprawidłowy JSON w body" }],
      }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const parsed = completeTreatmentSchema.safeParse(body);
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

  const dataWykonania = parsed.data.data_wykonania_rzeczywista;

  try {
    const treatment = await completeTreatment(
      supabase,
      treatmentId,
      userId,
      dataWykonania,
    );
    return new Response(JSON.stringify({ data: treatment }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (e) {
    const err = e as Error & { status?: number; code?: string };
    if (err.status === 400) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }
    if (err.status === 403 || err.code === "PGRST116") {
      return new Response(
        JSON.stringify({ error: "Brak dostępu do zabiegu" }),
        { status: 403, headers: JSON_HEADERS },
      );
    }
    // eslint-disable-next-line no-console -- log API errors for debugging
    console.error("PATCH /api/treatments/[id]/complete error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

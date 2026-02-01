/**
 * Serwis zabiegów (treatments).
 * Logika biznesowa dla endpointów API: weryfikacja dostępu do profilu, listowanie zabiegów z filtrami i paginacją.
 */

/** Domyślna liczba dni okna „nadchodzących zabiegów” (od dziś włącznie). */
export const UPCOMING_TREATMENTS_DEFAULT_DAYS = 10;

/** Liczba dni do przodu, na którą generowane są zabiegi z szablonów (przy tworzeniu profilu / uzupełnianiu pustej listy). */
export const GENERATE_TREATMENTS_WINDOW_DAYS = 60;

/**
 * Zwraca przedział dat dla nadchodzących zabiegów w formacie YYYY-MM-DD (UTC).
 * from = dziś (północ UTC), to = dziś + windowDays dni (włącznie).
 *
 * @param windowDays – liczba dni okna (np. 10 → od dziś do dziś+10 włącznie)
 * @returns { from, to } – daty w ISO YYYY-MM-DD
 */
export function getUpcomingDateRange(windowDays: number): {
  from: string;
  to: string;
} {
  const fromDate = new Date();
  fromDate.setUTCHours(0, 0, 0, 0);
  const toDate = new Date(fromDate);
  toDate.setUTCDate(toDate.getUTCDate() + windowDays);
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

/** Okres wykonywania z szablonu: start/end w formacie MM-DD. */
interface OkresWykonywania {
  start: string;
  end: string;
}

function isDateInPeriods(dateStr: string, periods: OkresWykonywania[]): boolean {
  const mmdd = dateStr.slice(5, 10);
  for (const p of periods) {
    if (mmdd >= p.start && mmdd <= p.end) return true;
  }
  return false;
}

function parseOkresy(okresy: unknown): OkresWykonywania[] {
  if (!Array.isArray(okresy)) return [];
  return okresy.filter(
    (x): x is OkresWykonywania =>
      typeof x === "object" &&
      x !== null &&
      typeof (x as OkresWykonywania).start === "string" &&
      typeof (x as OkresWykonywania).end === "string",
  );
}

/**
 * Generuje zabiegi (rekomendacje) dla profilu trawnika na podstawie szablonów treatment_templates.
 * Dla każdego szablonu wstawia wiersze do treatments w oknie [from, to] z uwzględnieniem
 * okresów wykonywania i minimalnego cooldownu. Nie duplikuje istniejących (template_id, data_proponowana).
 *
 * @param supabase – klient Supabase z context.locals
 * @param lawnProfileId – UUID profilu trawnika
 * @param options – opcjonalnie windowDays (domyślnie GENERATE_TREATMENTS_WINDOW_DAYS)
 * @throws błąd Supabase przy błędzie zapytania
 */
export async function generateTreatmentsFromTemplates(
  supabase: SupabaseClient,
  lawnProfileId: string,
  options?: { windowDays?: number },
): Promise<void> {
  const windowDays = options?.windowDays ?? GENERATE_TREATMENTS_WINDOW_DAYS;
  const { from, to } = getUpcomingDateRange(windowDays);

  const { data: templates, error: templatesError } = await supabase
    .from("treatment_templates")
    .select("id, minimalny_cooldown_dni, okresy_wykonywania");

  if (templatesError) {
    // eslint-disable-next-line no-console -- log errors for debugging
    console.error(
      "generateTreatmentsFromTemplates templates error:",
      templatesError.code,
      templatesError.message,
    );
    throw templatesError;
  }

  if (!templates?.length) return;

  const { data: existing, error: existingError } = await supabase
    .from("treatments")
    .select("template_id, data_proponowana")
    .eq("lawn_profile_id", lawnProfileId)
    .gte("data_proponowana", from)
    .lte("data_proponowana", to);

  if (existingError) {
    // eslint-disable-next-line no-console -- log errors for debugging
    console.error(
      "generateTreatmentsFromTemplates existing error:",
      existingError.code,
      existingError.message,
    );
    throw existingError;
  }

  const existingKeys = new Set(
    (existing ?? []).map((r) => `${r.template_id}:${r.data_proponowana}`),
  );

  const fromDate = new Date(from + "T00:00:00Z");
  const toDate = new Date(to + "T00:00:00Z");
  const toTime = toDate.getTime();

  const inserts: {
    lawn_profile_id: string;
    template_id: string;
    data_proponowana: string;
    typ_generowania: "statyczny";
  }[] = [];

  for (const template of templates) {
    const cooldown = Math.max(0, template.minimalny_cooldown_dni ?? 0);
    const periods = parseOkresy(template.okresy_wykonywania);
    if (periods.length === 0) continue;

    let lastScheduled: string | null = null;
    for (let t = fromDate.getTime(); t <= toTime; t += 86400 * 1000) {
      const d = new Date(t);
      const dateStr = d.toISOString().slice(0, 10);
      if (!isDateInPeriods(dateStr, periods)) continue;
      if (
        lastScheduled !== null &&
        (d.getTime() - new Date(lastScheduled + "T00:00:00Z").getTime()) /
          (86400 * 1000) <
          cooldown
      ) {
        continue;
      }
      const key = `${template.id}:${dateStr}`;
      if (existingKeys.has(key)) continue;
      inserts.push({
        lawn_profile_id: lawnProfileId,
        template_id: template.id,
        data_proponowana: dateStr,
        typ_generowania: "statyczny",
      });
      existingKeys.add(key);
      lastScheduled = dateStr;
    }
  }

  if (inserts.length === 0) return;

  const { error: insertError } = await supabase
    .from("treatments")
    .insert(inserts);

  if (insertError) {
    // eslint-disable-next-line no-console -- log errors for debugging
    console.error(
      "generateTreatmentsFromTemplates insert error:",
      insertError.code,
      insertError.message,
    );
    throw insertError;
  }
}

import type { SupabaseClient } from "../../db/supabase.client";
import type {
  Treatment,
  TreatmentTemplateSummary,
  TreatmentWithEmbedded,
} from "../../types";
import type { GetTreatmentsQuerySchema } from "../schemas/treatments.schema";

/**
 * Pobiera identyfikator właściciela profilu trawnika (user_id).
 * Używane do weryfikacji dostępu przed listowaniem zabiegów (404 gdy brak profilu, 403 gdy user_id ≠ auth.uid()).
 *
 * @param supabase – klient Supabase z context.locals
 * @param lawnProfileId – UUID profilu trawnika
 * @returns user_id właściciela profilu lub null, gdy profil nie istnieje
 * @throws błąd Supabase przy błędzie zapytania – endpoint zwróci 500
 */
export async function getLawnProfileOwnerId(
  supabase: SupabaseClient,
  lawnProfileId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("lawn_profiles")
    .select("user_id")
    .eq("id", lawnProfileId)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console -- log errors for debugging
    console.error("getLawnProfileOwnerId error:", error.code, error.message);
    throw error;
  }

  return data?.user_id ?? null;
}

/**
 * Mapuje wiersz z zagnieżdżonym treatment_templates na TreatmentWithEmbedded (pole template).
 * Supabase zwraca relację pod kluczem nazwy tabeli – mapujemy na "template" zgodnie z API.
 */
function mapRowWithTemplate(
  row: Treatment & { treatment_templates?: TreatmentTemplateSummary | null },
): TreatmentWithEmbedded {
  const { treatment_templates, ...treatment } = row;
  return {
    ...treatment,
    ...(treatment_templates && { template: treatment_templates }),
  };
}

/**
 * Pobiera listę zabiegów dla danego profilu trawnika z filtrami, paginacją i opcjonalnym embed szablonu.
 * Używane przez GET /api/lawn-profiles/:lawnProfileId/treatments.
 * Zakres dat: query.from / query.to (data_proponowana). Nadchodzące zabiegi: getUpcomingTreatments lub query z from, to, status=aktywny, embed=template.
 *
 * @param supabase – klient Supabase z context.locals
 * @param lawnProfileId – UUID profilu trawnika
 * @param query – zwalidowane parametry zapytania (status, template_id, from, to, page, limit, sort, embed)
 * @returns { data, total } – tablica zabiegów (Treatment[] lub TreatmentWithEmbedded[] przy embed=template) oraz łączna liczba pasujących wierszy
 * @throws błąd Supabase przy błędzie zapytania – endpoint zwróci 500
 */
export async function getTreatmentsForLawn(
  supabase: SupabaseClient,
  lawnProfileId: string,
  query: GetTreatmentsQuerySchema,
): Promise<{ data: Treatment[] | TreatmentWithEmbedded[]; total: number }> {
  const { page, limit, sort, embed } = query;
  const fromIndex = (page - 1) * limit;
  const toIndex = page * limit - 1;
  const ascending = sort !== "data_proponowana_desc";

  const selectBase =
    embed === "template"
      ? "*, treatment_templates(id, nazwa, typ_zabiegu, minimalny_cooldown_dni)"
      : "*";

  let listQuery = supabase
    .from("treatments")
    .select(selectBase)
    .eq("lawn_profile_id", lawnProfileId);

  if (query.status) {
    listQuery = listQuery.eq("status", query.status);
  }
  if (query.template_id) {
    listQuery = listQuery.eq("template_id", query.template_id);
  }
  if (query.from) {
    listQuery = listQuery.gte("data_proponowana", query.from);
  }
  if (query.to) {
    listQuery = listQuery.lte("data_proponowana", query.to);
  }

  const { data: rows, error } = await listQuery
    .order("data_proponowana", { ascending })
    .range(fromIndex, toIndex);

  if (error) {
    // eslint-disable-next-line no-console -- log errors for debugging
    console.error("getTreatmentsForLawn error:", error.code, error.message);
    throw error;
  }

  let countQuery = supabase
    .from("treatments")
    .select("id", { count: "exact", head: true })
    .eq("lawn_profile_id", lawnProfileId);
  if (query.status) {
    countQuery = countQuery.eq("status", query.status);
  }
  if (query.template_id) {
    countQuery = countQuery.eq("template_id", query.template_id);
  }
  if (query.from) {
    countQuery = countQuery.gte("data_proponowana", query.from);
  }
  if (query.to) {
    countQuery = countQuery.lte("data_proponowana", query.to);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    // eslint-disable-next-line no-console -- log errors for debugging
    console.error(
      "getTreatmentsForLawn count error:",
      countError.code,
      countError.message,
    );
    throw countError;
  }

  const total = count ?? 0;

  const data =
    embed === "template" && Array.isArray(rows)
      ? rows.map((row) =>
          mapRowWithTemplate(
            row as unknown as Treatment & {
              treatment_templates?: TreatmentTemplateSummary | null;
            },
          ),
        )
      : ((rows ?? []) as unknown as Treatment[]);

  return { data, total };
}

/**
 * Pobiera nadchodzące zabiegi (status=aktywny, data_proponowana w przedziale [dziś, dziś + windowDays] włącznie, UTC)
 * z osadzonym szablonem (embed=template). Używane przez dashboard i GET treatments z parametrem upcoming=1.
 *
 * @param supabase – klient Supabase z context.locals
 * @param lawnProfileId – UUID profilu trawnika
 * @param windowDays – liczba dni okna (domyślnie UPCOMING_TREATMENTS_DEFAULT_DAYS)
 * @returns { data, total } – tablica TreatmentWithEmbedded oraz łączna liczba pasujących wierszy
 * @throws błąd Supabase przy błędzie zapytania – endpoint zwróci 500
 */
export async function getUpcomingTreatments(
  supabase: SupabaseClient,
  lawnProfileId: string,
  windowDays: number = UPCOMING_TREATMENTS_DEFAULT_DAYS,
): Promise<{ data: TreatmentWithEmbedded[]; total: number }> {
  const { from, to } = getUpcomingDateRange(windowDays);
  const query: GetTreatmentsQuerySchema = {
    status: "aktywny",
    from,
    to,
    embed: "template",
    page: 1,
    limit: 100,
    sort: "data_proponowana",
    upcoming: false,
  };
  const result = await getTreatmentsForLawn(supabase, lawnProfileId, query);
  return {
    data: result.data as unknown as TreatmentWithEmbedded[],
    total: result.total,
  };
}

/**
 * Oznacza zabieg jako wykonany.
 * Wymaga statusu "aktywny". Ustawia status na "wykonany".
 * Trigger log_treatment_status_change zapisuje wpis do treatment_history
 * (obecnie używa data_proponowana jako data_wykonania_rzeczywista).
 *
 * @param supabase – klient Supabase
 * @param treatmentId – UUID zabiegu
 * @param userId – UUID użytkownika (weryfikacja własności)
 * @param dataWykonaniaRzeczywista – opcjonalna data wykonania (YYYY-MM-DD), domyślnie dziś
 * @returns zaktualizowany Treatment
 * @throws błąd gdy zabieg nie istnieje, nie należy do użytkownika lub status ≠ aktywny
 */
export async function completeTreatment(
  supabase: SupabaseClient,
  treatmentId: string,
  userId: string,
  dataWykonaniaRzeczywista?: string,
): Promise<Treatment> {
  const { data: treatment, error: fetchError } = await supabase
    .from("treatments")
    .select("id, lawn_profile_id, status")
    .eq("id", treatmentId)
    .single();

  if (fetchError || !treatment) {
    const err = fetchError ?? new Error("Zabieg nie znaleziony");
    // eslint-disable-next-line no-console -- log errors for debugging
    console.error("completeTreatment fetch error:", err);
    throw err;
  }

  const ownerId = await getLawnProfileOwnerId(
    supabase,
    treatment.lawn_profile_id,
  );
  if (!ownerId || ownerId !== userId) {
    const err = new Error("Brak dostępu do zabiegu");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }

  if (treatment.status !== "aktywny") {
    const err = new Error(
      "Zabieg został już oznaczony jako wykonany lub odrzucony",
    );
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const { data: updated, error: updateError } = await supabase
    .from("treatments")
    .update({
      status: "wykonany" as const,
      updated_at: new Date().toISOString(),
    })
    .eq("id", treatmentId)
    .select()
    .single();

  if (updateError) {
    // eslint-disable-next-line no-console -- log errors for debugging
    console.error("completeTreatment update error:", updateError);
    throw updateError;
  }

  if (!updated) {
    throw new Error("Aktualizacja zabiegu nie powiodła się");
  }

  void dataWykonaniaRzeczywista; // TODO: migracja triggera – użycie custom daty w treatment_history
  return updated as Treatment;
}

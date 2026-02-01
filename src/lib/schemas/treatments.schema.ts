/**
 * Schematy Zod dla endpointów API zabiegów (treatments).
 * Używane do walidacji query params: GET /api/lawn-profiles/:lawnProfileId/treatments.
 */

import { z } from "zod";

/** Dozwolone wartości statusu zabiegu (enum z bazy). */
const statusZabieguEnum = z.enum([
  "aktywny",
  "wykonany",
  "odrzucony",
  "wygasły",
]);

/** Regex dla daty w formacie YYYY-MM-DD (ISO 8601). */
const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Schemat walidacji parametrów zapytania dla listy zabiegów (GET treatments).
 * Zgodny ze specyfikacją: status, template_id, from, to, page, limit, sort, embed.
 * sort przyjmuje wartości: data_proponowana (domyślnie asc), data_proponowana_asc, data_proponowana_desc.
 */
export const getTreatmentsQuerySchema = z
  .object({
    status: statusZabieguEnum.optional(),
    template_id: z
      .string()
      .uuid("Nieprawidłowy format UUID template_id")
      .optional(),
    from: z
      .string()
      .regex(dateStringRegex, "Data from musi być w formacie YYYY-MM-DD")
      .optional(),
    to: z
      .string()
      .regex(dateStringRegex, "Data to musi być w formacie YYYY-MM-DD")
      .optional(),
    page: z.coerce
      .number()
      .int()
      .min(1, "Strona musi być >= 1")
      .optional()
      .default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit musi być >= 1")
      .max(100, "Limit może wynosić co najwyżej 100")
      .optional()
      .default(20),
    sort: z
      .enum([
        "data_proponowana",
        "data_proponowana_asc",
        "data_proponowana_desc",
      ])
      .optional()
      .default("data_proponowana"),
    embed: z.enum(["template"]).optional(),
    /** Gdy true: nadpisuje from/to oknem 10 dni od dziś, wymusza status=aktywny i embed=template (alias „nadchodzące zabiegi”). */
    upcoming: z.coerce.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      message: "Data from musi być wcześniejsza lub równa dacie to",
      path: ["from"],
    },
  );

/** Typ wywnioskowany ze schematu query – używany w serwisie i endpoincie. */
export type GetTreatmentsQuerySchema = z.infer<typeof getTreatmentsQuerySchema>;

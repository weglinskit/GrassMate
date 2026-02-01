/**
 * Schemat Zod dla PATCH /api/treatments/:id/complete.
 * Waliduje body żądania.
 */

import { z } from "zod";

const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

export const completeTreatmentSchema = z.object({
  data_wykonania_rzeczywista: z
    .string()
    .regex(dateStringRegex, "Data musi być w formacie YYYY-MM-DD")
    .optional(),
});

export type CompleteTreatmentSchema = z.infer<typeof completeTreatmentSchema>;

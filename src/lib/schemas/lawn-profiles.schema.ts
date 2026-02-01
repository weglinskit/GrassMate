/**
 * Schematy Zod dla endpointów API profili trawnika (lawn_profiles).
 * Używane do walidacji request body: POST /api/lawn-profiles, PATCH /api/lawn-profiles/:id.
 */

import { z } from "zod";

/** Dozwolone wartości nasłonecznienia (enum z bazy). */
const nasłonecznienieEnum = z.enum(["niskie", "średnie", "wysokie"]);

/**
 * Schemat walidacji body dla tworzenia profilu trawnika (POST /api/lawn-profiles).
 * Zgodny z CreateLawnProfileCommand: wymagane nazwa, latitude, longitude;
 * opcjonalne z domyślnymi wartościami: wielkość_m2 100, nasłonecznienie "średnie", is_active true.
 */
export const createLawnProfileSchema = z.object({
  nazwa: z
    .string()
    .min(1, "Nazwa jest wymagana")
    .max(255, "Nazwa może mieć co najwyżej 255 znaków"),
  latitude: z
    .number()
    .min(-90, "Szerokość geograficzna musi być od -90 do 90")
    .max(90, "Szerokość geograficzna musi być od -90 do 90"),
  longitude: z
    .number()
    .min(-180, "Długość geograficzna musi być od -180 do 180")
    .max(180, "Długość geograficzna musi być od -180 do 180"),
  wielkość_m2: z
    .number()
    .positive("Powierzchnia musi być większa od 0")
    .optional()
    .default(100),
  nasłonecznienie: nasłonecznienieEnum.optional().default("średnie"),
  rodzaj_powierzchni: z.string().nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

/** Typ wywnioskowany ze schematu tworzenia profilu – zgodny z CreateLawnProfileCommand. */
export type CreateLawnProfileSchema = z.infer<typeof createLawnProfileSchema>;

/**
 * Schemat walidacji body dla aktualizacji profilu trawnika (PATCH /api/lawn-profiles/:id).
 * Wszystkie pola opcjonalne (partial); walidacja dotyczy tylko pól obecnych w payloadzie.
 * Zgodny z UpdateLawnProfileCommand.
 */
export const updateLawnProfileSchema = z
  .object({
    nazwa: z
      .string()
      .min(1, "Nazwa jest wymagana")
      .max(255, "Nazwa może mieć co najwyżej 255 znaków"),
    latitude: z
      .number()
      .min(-90, "Szerokość geograficzna musi być od -90 do 90")
      .max(90, "Szerokość geograficzna musi być od -90 do 90"),
    longitude: z
      .number()
      .min(-180, "Długość geograficzna musi być od -180 do 180")
      .max(180, "Długość geograficzna musi być od -180 do 180"),
    wielkość_m2: z
      .number()
      .positive("Powierzchnia musi być większa od 0"),
    nasłonecznienie: nasłonecznienieEnum,
    rodzaj_powierzchni: z
      .string()
      .max(500, "Opis może mieć co najwyżej 500 znaków")
      .nullable()
      .optional(),
    is_active: z.boolean(),
  })
  .partial();

/** Typ wywnioskowany ze schematu aktualizacji profilu – zgodny z UpdateLawnProfileCommand. */
export type UpdateLawnProfileSchema = z.infer<typeof updateLawnProfileSchema>;

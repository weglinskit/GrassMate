/**
 * Serwis profili trawnika (lawn_profiles).
 * Logika biznesowa dla endpointów API: tworzenie, aktualizacja, odczyt.
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type { LawnProfile } from "../../types";
import type { CreateLawnProfileSchema } from "../schemas/lawn-profiles.schema";

/** Błąd rzucany przy naruszeniu unikalności aktywnego profilu (jeden aktywny na użytkownika). */
export class UniqueActiveProfileError extends Error {
  constructor() {
    super("Użytkownik ma już aktywny profil trawnika");
    this.name = "UniqueActiveProfileError";
  }
}

/**
 * Tworzy nowy profil trawnika dla użytkownika.
 * user_id pochodzi wyłącznie z argumentu (nigdy z body). Domyślne wartości
 * (wielkość_m2, nasłonecznienie, is_active) powinny być już ustawione w body (po walidacji Zod).
 *
 * @param supabase – klient Supabase z context.locals
 * @param userId – identyfikator użytkownika z sesji/JWT
 * @param body – zwalidowany request body (CreateLawnProfileSchema)
 * @returns utworzony wiersz jako LawnProfile
 * @throws UniqueActiveProfileError przy naruszeniu unikalności (user_id, is_active = true)
 * @throws błąd Supabase przy innych błędach bazy
 */
export async function createLawnProfile(
  supabase: SupabaseClient,
  userId: string,
  body: CreateLawnProfileSchema
): Promise<LawnProfile> {
  const payload = {
    user_id: userId,
    nazwa: body.nazwa,
    latitude: body.latitude,
    longitude: body.longitude,
    wielkość_m2: body.wielkość_m2 ?? 100,
    nasłonecznienie: body.nasłonecznienie ?? "średnie",
    rodzaj_powierzchni: body.rodzaj_powierzchni ?? null,
    is_active: body.is_active ?? true,
  };

  const { data, error } = await supabase
    .from("lawn_profiles")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new UniqueActiveProfileError();
    }
    throw error;
  }

  return data as LawnProfile;
}

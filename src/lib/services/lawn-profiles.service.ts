/**
 * Serwis profili trawnika (lawn_profiles).
 * Logika biznesowa dla endpointów API: tworzenie, aktualizacja, odczyt.
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type { LawnProfile } from "../../types";
import type {
  CreateLawnProfileSchema,
  UpdateLawnProfileSchema,
} from "../schemas/lawn-profiles.schema";

/** Błąd rzucany przy naruszeniu unikalności aktywnego profilu (jeden aktywny na użytkownika). */
export class UniqueActiveProfileError extends Error {
  constructor() {
    super("Użytkownik ma już aktywny profil trawnika");
    this.name = "UniqueActiveProfileError";
  }
}

/** Błąd gdy profil nie istnieje (404). */
export class LawnProfileNotFoundError extends Error {
  constructor() {
    super("Profil nie został znaleziony");
    this.name = "LawnProfileNotFoundError";
  }
}

/** Błąd gdy użytkownik nie ma dostępu do profilu (403). */
export class LawnProfileForbiddenError extends Error {
  constructor() {
    super("Brak dostępu do profilu");
    this.name = "LawnProfileForbiddenError";
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

/**
 * Pobiera aktywny profil trawnika użytkownika (co najwyżej jeden: is_active = true).
 * Używane przez GET /api/lawn-profiles/active.
 *
 * @param supabase – klient Supabase z context.locals
 * @param userId – identyfikator użytkownika z sesji/JWT
 * @returns LawnProfile gdy użytkownik ma aktywny profil, null w przeciwnym razie
 * @throws błąd Supabase przy błędzie zapytania (np. połączenie, timeout) – endpoint zwróci 500
 */
export async function getActiveLawnProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<LawnProfile | null> {
  const { data, error } = await supabase
    .from("lawn_profiles")
    .select()
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    // PGRST116 = brak wierszy dla .single(); .maybeSingle() przy 0 wierszach zwraca data: null, error: null
    // Każdy inny błąd (połączenie, timeout, RLS itd.) – logujemy i przekazujemy do endpointu (500)
    console.error("getActiveLawnProfile error:", error.code, error.message);
    throw error;
  }

  return data as LawnProfile | null;
}

/**
 * Pobiera profil trawnika po ID.
 * Używane do weryfikacji istnienia i własności przed PATCH.
 *
 * @param supabase – klient Supabase z context.locals
 * @param lawnProfileId – identyfikator profilu
 * @returns LawnProfile gdy profil istnieje, null w przeciwnym razie
 */
export async function getLawnProfileById(
  supabase: SupabaseClient,
  lawnProfileId: string
): Promise<LawnProfile | null> {
  const { data, error } = await supabase
    .from("lawn_profiles")
    .select()
    .eq("id", lawnProfileId)
    .maybeSingle();

  if (error) {
    console.error("getLawnProfileById error:", error.code, error.message);
    throw error;
  }

  return data as LawnProfile | null;
}

/**
 * Aktualizuje profil trawnika (PATCH).
 * Weryfikuje, że profil istnieje i należy do użytkownika.
 *
 * @param supabase – klient Supabase z context.locals
 * @param userId – identyfikator użytkownika z sesji/JWT
 * @param lawnProfileId – identyfikator profilu do aktualizacji
 * @param body – częściowy payload (UpdateLawnProfileSchema)
 * @returns zaktualizowany LawnProfile
 * @throws błąd gdy profil nie istnieje (404) lub użytkownik nie jest właścicielem (403)
 */
export async function updateLawnProfile(
  supabase: SupabaseClient,
  userId: string,
  lawnProfileId: string,
  body: UpdateLawnProfileSchema
): Promise<LawnProfile> {
  const existing = await getLawnProfileById(supabase, lawnProfileId);
  if (!existing) {
    throw new LawnProfileNotFoundError();
  }
  if (existing.user_id !== userId) {
    throw new LawnProfileForbiddenError();
  }

  const payload: Record<string, unknown> = { ...body };
  if (Object.keys(payload).length === 0) {
    return existing;
  }

  const { data, error } = await supabase
    .from("lawn_profiles")
    .update(payload)
    .eq("id", lawnProfileId)
    .eq("user_id", userId)
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

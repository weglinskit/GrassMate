/**
 * Wspólne typy DTO (Data Transfer Object) i Command Model dla API oraz frontendu.
 * Wszystkie DTO i Commands są wyprowadzone z definicji encji bazy danych (src/db/database.types.ts).
 */

import type {
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
} from "./db/database.types";

// =============================================================================
// Re-eksport enumów z bazy danych (dla wygody i spójności nazewnictwa w API)
// =============================================================================

/** Enum nasłonecznienia trawnika (lawn_profiles.nasłonecznienie) */
export type Nasłonecznienie = Enums<"nasłonecznienie">;

/** Status zabiegu (treatments.status, treatment_history.status_old/status_new) */
export type StatusZabiegu = Enums<"status_zabiegu">;

/** Typ generowania rekomendacji (treatments.typ_generowania) */
export type TypGenerowania = Enums<"typ_generowania">;

/** Typ zabiegu w szablonie (treatment_templates.typ_zabiegu) */
export type TypZabiegu = Enums<"typ_zabiegu">;

/** Typ zdarzenia analitycznego (analytics_events.event_type) */
export type EventType = Enums<"event_type">;

/** Typ powiadomienia (notification_log.typ_powiadomienia) */
export type TypPowiadomienia = Enums<"typ_powiadomienia">;

// =============================================================================
// Encje bazy danych (aliasy Row – używane jako podstawy DTO)
// =============================================================================

/** Encja: lawn_profiles – profil trawnika użytkownika */
type LawnProfileRow = Tables<"lawn_profiles">;

/** Encja: treatment_templates – globalny szablon zabiegu */
type TreatmentTemplateRow = Tables<"treatment_templates">;

/** Encja: treatments – rekomendacja zabiegu dla trawnika */
type TreatmentRow = Tables<"treatments">;

/** Encja: treatment_history – wpis historii zmiany statusu zabiegu */
type TreatmentHistoryRow = Tables<"treatment_history">;

/** Encja: weather_cache – wpis cache pogody (lokacja + data) */
type WeatherCacheRow = Tables<"weather_cache">;

/** Encja: analytics_events – zdarzenie analityczne */
type AnalyticsEventRow = Tables<"analytics_events">;

// =============================================================================
// DTO – Data Transfer Objects (odpowiedzi API, mapowane 1:1 z encjami)
// =============================================================================

/**
 * DTO: Profil trawnika.
 * Odpowiedź GET /api/lawn-profiles, GET /api/lawn-profiles/active, GET /api/lawn-profiles/:id,
 * POST /api/lawn-profiles (201), PATCH /api/lawn-profiles/:id (200).
 * Źródło: lawn_profiles.Row.
 */
export type LawnProfile = LawnProfileRow;

/**
 * DTO: Szablon zabiegu (tylko do odczytu).
 * Odpowiedź GET /api/treatment-templates, GET /api/treatment-templates/:id.
 * Źródło: treatment_templates.Row.
 */
export type TreatmentTemplate = TreatmentTemplateRow;

/**
 * DTO: Zabieg (rekomendacja) dla trawnika.
 * Odpowiedź list/upcoming/one treatments, complete, reject, create.
 * Źródło: treatments.Row.
 * W odpowiedziach API można opcjonalnie osadzić template (template summary) – użyj TreatmentWithEmbedded.
 */
export type Treatment = TreatmentRow;

/**
 * Skrócone podsumowanie szablonu zabiegu (do osadzenia w Treatment).
 * Używane gdy endpoint zwraca Treatment z polem template (np. GET treatments z embed).
 */
export type TreatmentTemplateSummary = Pick<
  TreatmentTemplate,
  "id" | "nazwa" | "typ_zabiegu" | "minimalny_cooldown_dni"
>;

/**
 * Zabieg z opcjonalnie osadzonym szablonem i/lub podsumowaniem profilu.
 * Odpowiedź GET z embed: template, lawn_profile.
 */
export type TreatmentWithEmbedded = Treatment & {
  template?: TreatmentTemplateSummary;
  lawn_profile?: Pick<LawnProfile, "id" | "nazwa" | "latitude" | "longitude">;
};

/**
 * DTO: Wpis historii zabiegu.
 * Odpowiedź GET /api/lawn-profiles/:lawnProfileId/treatment-history, GET /api/treatments/:id/history.
 * Źródło: treatment_history.Row.
 */
export type TreatmentHistoryEntry = TreatmentHistoryRow;

/**
 * DTO: Wpis cache pogody.
 * Odpowiedź GET /api/weather.
 * Źródło: weather_cache.Row.
 */
export type WeatherCacheEntry = WeatherCacheRow;

/**
 * Jedna data w prognozie pogody (GET /api/weather/forecast).
 * Agregat z weather_cache / Open-Meteo – nie bezpośrednio encja.
 */
export type WeatherForecastDay = {
  temp_max?: number;
  opady?: number;
};

/**
 * DTO: Odpowiedź prognozy pogody.
 * GET /api/weather/forecast – by_date: { "YYYY-MM-DD": WeatherForecastDay }, fetched_at.
 */
export type WeatherForecastResponse = {
  by_date: Record<string, WeatherForecastDay>;
  fetched_at: string;
};

/**
 * DTO: Odpowiedź endpointu rekomendacji.
 * GET /api/lawn-profiles/:lawnProfileId/recommendations.
 * Łączy zabiegi (Treatment[]) z opcjonalnym weather_summary.
 */
export type RecommendationsResponse = {
  treatments: Treatment[];
  weather_summary?: Record<string, unknown>;
};

/**
 * DTO: Odpowiedź po utworzeniu zdarzenia analitycznego.
 * POST /api/analytics/events (202) – { data: { id: string } }.
 */
export type AnalyticsEventCreated = {
  id: string;
};

/**
 * DTO: Odpowiedź po wywołaniu odświeżenia rekomendacji.
 * POST /api/lawn-profiles/:lawnProfileId/recommendations/refresh (202).
 */
export type RefreshRecommendationsResponse = {
  message: string;
};

// =============================================================================
// Command Model – modele żądań API (request body)
// =============================================================================

/** Pola Insert dla lawn_profiles (bez pól uzupełnianych po stronie serwera) */
type LawnProfileInsert = TablesInsert<"lawn_profiles">;

/**
 * Command: Utworzenie profilu trawnika.
 * Request body: POST /api/lawn-profiles.
 * Wymagane: nazwa, latitude, longitude. Opcjonalne: wielkość_m2, nasłonecznienie, rodzaj_powierzchni, is_active.
 * user_id, id, created_at, updated_at uzupełnia serwer.
 */
export type CreateLawnProfileCommand = Omit<
  LawnProfileInsert,
  "user_id" | "id" | "created_at" | "updated_at"
>;

/**
 * Pola edytowalne profilu trawnika (PATCH /api/lawn-profiles/:id).
 * Zgodnie z planem API: tylko te pola mogą być wysłane w aktualizacji.
 */
export type UpdateLawnProfileCommand = Partial<
  Pick<
    LawnProfile,
    | "nazwa"
    | "wielkość_m2"
    | "nasłonecznienie"
    | "rodzaj_powierzchni"
    | "latitude"
    | "longitude"
    | "is_active"
  >
>;

/** Pola Insert dla treatments (lawn_profile_id pochodzi z URL) */
type TreatmentInsert = TablesInsert<"treatments">;

/**
 * Command: Utworzenie zabiegu dla trawnika.
 * Request body: POST /api/lawn-profiles/:lawnProfileId/treatments.
 * lawn_profile_id z path; id, created_at, updated_at, status uzupełnia serwer.
 */
export type CreateTreatmentCommand = Omit<
  TreatmentInsert,
  "id" | "lawn_profile_id" | "created_at" | "updated_at" | "status"
>;

/**
 * Command: Częściowa aktualizacja zabiegu.
 * Request body: PATCH /api/treatments/:id.
 * Zgodnie z planem: preferowane są dedykowane endpointy complete/reject dla zmiany statusu;
 * tu głównie uzasadnienie_pogodowe i ewentualnie status (gdy dozwolone przez reguły biznesowe).
 */
export type UpdateTreatmentCommand = Partial<
  Pick<Treatment, "uzasadnienie_pogodowe" | "status">
>;

/**
 * Command: Oznaczenie zabiegu jako wykonany.
 * Request body: PATCH /api/treatments/:id/complete.
 * data_wykonania_rzeczywista opcjonalne (domyślnie dziś).
 */
export type CompleteTreatmentCommand = {
  data_wykonania_rzeczywista?: string;
};

/**
 * Command: Odrzucenie zabiegu.
 * Request body: PATCH /api/treatments/:id/reject.
 * powód_odrzucenia opcjonalne, max 500 znaków (walidacja po stronie serwera).
 */
export type RejectTreatmentCommand = {
  powód_odrzucenia?: string;
};

/** Pola Insert dla analytics_events (user_id z JWT) */
type AnalyticsEventInsert = TablesInsert<"analytics_events">;

/**
 * Command: Wysłanie zdarzenia analitycznego.
 * Request body: POST /api/analytics/events.
 * user_id, id, created_at uzupełnia serwer. event_type wymagane.
 */
export type AnalyticsEventCommand = Omit<
  AnalyticsEventInsert,
  "user_id" | "id" | "created_at"
>;

// =============================================================================
// Paginacja i wspólne kształty odpowiedzi list
// =============================================================================

/**
 * Odpowiedź listująca z paginacją (total).
 * Używane w GET /api/lawn-profiles, treatment-templates, treatments, treatment-history.
 */
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
};

/**
 * Opcjonalna paginacja w zapytaniach list (query params).
 * page 1-based, limit domyślnie 20, max 100.
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
};

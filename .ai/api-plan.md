# REST API Plan

## 1. Resources

| Resource | Database table(s) | Description |
|----------|-------------------|-------------|
| **Lawn profiles** | `lawn_profiles` | User's lawn profiles (one active per user). |
| **Treatment templates** | `treatment_templates` | Global read-only templates for treatment types (mowing, fertilizing, etc.). |
| **Treatments** | `treatments` | Treatment recommendations (static and dynamic) for a lawn. |
| **Treatment history** | `treatment_history` | Append-only log of treatment status changes. |
| **Weather** | `weather_cache` | Cached weather data by location and date (shared, TTL 24h). |
| **Push subscriptions** | `push_subscriptions` | Web Push subscriptions per user (per device). |
| **Notifications** | `notification_log` | Log of sent Web Push notifications (read, optional update for click). |
| **Analytics** | `analytics_events` | Analytics events (append-only, write from client/backend). |

**Note:** `auth.users` is managed by Supabase Auth; no custom REST resource. Auth flows use Supabase Auth API (sign up, sign in, sign out, session refresh).

---

## 2. Endpoints

Base path: `/api` (e.g. `/api/lawn-profiles`). All endpoints require authentication unless stated otherwise. Use `Authorization: Bearer <access_token>` (Supabase JWT).

---

### 2.1. Lawn profiles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lawn-profiles` | List current user's lawn profiles. |
| GET | `/api/lawn-profiles/active` | Get current user's active lawn profile (single). |
| GET | `/api/lawn-profiles/:id` | Get one lawn profile by id (must belong to user). |
| POST | `/api/lawn-profiles` | Create a lawn profile. |
| PATCH | `/api/lawn-profiles/:id` | Update a lawn profile (including set as active). |
| DELETE | `/api/lawn-profiles/:id` | Delete a lawn profile. |

**GET /api/lawn-profiles**

- **Query:** `?page=1&limit=20` (optional pagination).
- **Response 200:**  
  `{ "data": LawnProfile[], "total": number }`  
  `LawnProfile`: id, user_id, nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude, is_active, created_at, updated_at.
- **Errors:** 401 Unauthorized.

**GET /api/lawn-profiles/active**

- **Response 200:** `{ "data": LawnProfile | null }`.
- **Errors:** 401 Unauthorized.

**GET /api/lawn-profiles/:id**

- **Response 200:** `{ "data": LawnProfile }`.
- **Errors:** 401 Unauthorized, 403 Forbidden (not owner), 404 Not Found.

**POST /api/lawn-profiles**

- **Request body:**  
  `{ "nazwa": string, "wielkość_m2"?: number, "nasłonecznienie"?: "niskie"|"średnie"|"wysokie", "rodzaj_powierzchni"?: string, "latitude": number, "longitude": number, "is_active"?: boolean }`  
  Required: nazwa, latitude, longitude. Defaults: wielkość_m2=100, nasłonecznienie="średnie", is_active=true.
- **Response 201:** `{ "data": LawnProfile }`.
- **Errors:** 400 Validation error, 401 Unauthorized.

**PATCH /api/lawn-profiles/:id**

- **Request body:** Partial of LawnProfile (only editable fields: nazwa, wielkość_m2, nasłonecznienie, rodzaj_powierzchni, latitude, longitude, is_active).
- **Response 200:** `{ "data": LawnProfile }`.
- **Errors:** 400 Validation error, 401 Unauthorized, 403 Forbidden, 404 Not Found.

**DELETE /api/lawn-profiles/:id**

- **Response 204:** No content.
- **Errors:** 401 Unauthorized, 403 Forbidden, 404 Not Found.

---

### 2.2. Treatment templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/treatment-templates` | List treatment templates (filterable, for schedule/reference). |
| GET | `/api/treatment-templates/:id` | Get one template by id. |

**GET /api/treatment-templates**

- **Query:** `?typ_zabiegu=koszenie|nawożenie|podlewanie|aeracja|wertykulacja` (optional), `?page=1&limit=50`.
- **Response 200:**  
  `{ "data": TreatmentTemplate[], "total": number }`  
  `TreatmentTemplate`: id, nazwa, opis, priorytet, minimalny_cooldown_dni, okresy_wykonywania, typ_zabiegu, created_at, updated_at.
- **Errors:** 401 Unauthorized.

**GET /api/treatment-templates/:id**

- **Response 200:** `{ "data": TreatmentTemplate }`.
- **Errors:** 401 Unauthorized, 404 Not Found.

---

### 2.3. Treatments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lawn-profiles/:lawnProfileId/treatments` | List treatments for a lawn (with filters). |
| GET | `/api/lawn-profiles/:lawnProfileId/treatments/upcoming` | Upcoming treatments (active, not expired, optional date range). |
| GET | `/api/treatments/:id` | Get one treatment (must belong to user's lawn). |
| POST | `/api/lawn-profiles/:lawnProfileId/treatments` | Create treatment (e.g. manual or from backend job; validate cooldown). |
| PATCH | `/api/treatments/:id` | Update treatment (e.g. status, uzasadnienie_pogodowe). |
| PATCH | `/api/treatments/:id/complete` | Mark treatment as completed (business logic). |
| PATCH | `/api/treatments/:id/reject` | Mark treatment as rejected (business logic). |
| DELETE | `/api/treatments/:id` | Delete treatment (soft or hard per policy; MVP: allow delete only if appropriate). |

**GET /api/lawn-profiles/:lawnProfileId/treatments**

- **Query:** `?status=aktywny|wykonany|odrzucony|wygasły`, `?template_id=uuid`, `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`, `?page=1&limit=20`, `?sort=data_proponowana` (asc/desc).
- **Response 200:**  
  `{ "data": Treatment[], "total": number }`  
  `Treatment`: id, lawn_profile_id, template_id, data_proponowana, typ_generowania, uzasadnienie_pogodowe, status, expires_at, created_at, updated_at; optionally embed `template` (template summary).
- **Errors:** 401 Unauthorized, 403 Forbidden (lawn not owned), 404 Not Found.

**GET /api/lawn-profiles/:lawnProfileId/treatments/upcoming**

- **Query:** `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`, `?limit=30`. Default: from=today, limit=30.
- **Response 200:**  
  `{ "data": Treatment[] }`  
  Same shape as treatment list; only active, not expired, data_proponowana in range. Sorted by data_proponowana asc.
- **Errors:** 401, 403, 404.

**GET /api/treatments/:id**

- **Response 200:** `{ "data": Treatment }` (optionally with template and lawn_profile summary).
- **Errors:** 401, 403, 404.

**POST /api/lawn-profiles/:lawnProfileId/treatments**

- **Request body:**  
  `{ "template_id": string, "data_proponowana": "YYYY-MM-DD", "typ_generowania": "statyczny"|"dynamiczny", "uzasadnienie_pogodowe"?: string, "expires_at"?: string (ISO) }`  
  Server should validate cooldown (e.g. call `check_treatment_cooldown`) and return 400 if not satisfied.
- **Response 201:** `{ "data": Treatment }`.
- **Errors:** 400 Validation / cooldown, 401, 403, 404.

**PATCH /api/treatments/:id**

- **Request body:** Partial of Treatment (e.g. uzasadnienie_pogodowe, status only if allowed by business rules; prefer dedicated complete/reject endpoints for status).
- **Response 200:** `{ "data": Treatment }`.
- **Errors:** 400, 401, 403, 404.

**PATCH /api/treatments/:id/complete**

- **Request body:** `{ "data_wykonania_rzeczywista": "YYYY-MM-DD" }` (optional; default today).
- **Response 200:** `{ "data": Treatment }`. Server sets status to `wykonany`, writes `treatment_history` (via trigger or explicit insert).
- **Errors:** 400 (e.g. already completed), 401, 403, 404.

**PATCH /api/treatments/:id/reject**

- **Request body:** `{ "powód_odrzucenia": string }` (optional but recommended; max 500 chars).
- **Response 200:** `{ "data": Treatment }`. Server sets status to `odrzucony`, writes `treatment_history`.
- **Errors:** 400, 401, 403, 404.

**DELETE /api/treatments/:id**

- **Response 204.**  
  Use only when business rules allow (e.g. cancel a future recommendation). RLS ensures user can delete only own lawn's treatments.
- **Errors:** 401, 403, 404.

---

### 2.4. Treatment history

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lawn-profiles/:lawnProfileId/treatment-history` | List history entries for a lawn. |
| GET | `/api/treatments/:id/history` | List history entries for one treatment. |

**GET /api/lawn-profiles/:lawnProfileId/treatment-history**

- **Query:** `?page=1&limit=20`, `?status_new=wykonany|odrzucony|wygasły`, `?from=ISO`, `?to=ISO`.
- **Response 200:**  
  `{ "data": TreatmentHistoryEntry[], "total": number }`  
  Fields: id, treatment_id, lawn_profile_id, status_old, status_new, data_wykonania_rzeczywista, powód_odrzucenia, created_at.
- **Errors:** 401, 403, 404.

**GET /api/treatments/:id/history**

- **Query:** `?page=1&limit=20`.
- **Response 200:** `{ "data": TreatmentHistoryEntry[] }`.
- **Errors:** 401, 403, 404.

---

### 2.5. Weather

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/weather` | Get weather for a location and date (from cache or fetch then cache). |
| GET | `/api/weather/forecast` | Get short-term forecast for a location (uses cache / Open-Meteo). |

**GET /api/weather**

- **Query:** `latitude`, `longitude`, `date=YYYY-MM-DD` (required).
- **Response 200:**  
  `{ "data": WeatherCacheEntry }`  
  Fields: id, latitude, longitude, date, temperatura_max, opady_24h, opady_72h_sum, dni_bez_opadów, prognoza_3d, fetched_at.  
  If not in cache, backend fetches from Open-Meteo, upserts into `weather_cache`, returns. Apply TTL 24h (read from cache if fresh; otherwise refresh).
- **Errors:** 400 Missing/invalid lat/long/date, 401 Unauthorized, 429 Too Many Requests (rate limit for external fetch).

**GET /api/weather/forecast**

- **Query:** `latitude`, `longitude` (required). Optional: `days=3`.
- **Response 200:**  
  `{ "data": { "by_date": { "YYYY-MM-DD": { "temp_max", "opady" } }, "fetched_at": string } }`  
  Backend can aggregate from `weather_cache` or Open-Meteo and cache.
- **Errors:** 400, 401, 429.

---

### 2.6. Analytics

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analytics/events` | Ingest one analytics event (task_completed, task_skipped, task_expired, weather_recommendation_created, survey_answer). |

**POST /api/analytics/events**

- **Request body:**  
  `{ "event_type": EventType, "metadata"?: object, "treatment_id"?: string }`  
  EventType: task_completed | task_skipped | task_expired | weather_recommendation_created | survey_answer. For survey_answer, metadata may include rating 1–5.
- **Response 202:** Accepted. `{ "data": { "id": string } }` or 204.
- **Errors:** 400 Invalid event_type or payload, 401.

---

### 2.7. Recommendations (business logic)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lawn-profiles/:lawnProfileId/recommendations` | Get current recommendations (upcoming + dynamic) for the lawn. |
| POST | `/api/lawn-profiles/:lawnProfileId/recommendations/refresh` | Trigger refresh of dynamic recommendations (rate-limited; may enqueue job). |

**GET /api/lawn-profiles/:lawnProfileId/recommendations**

- **Query:** `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`, `?include_expired=false`.
- **Response 200:**  
  `{ "data": { "treatments": Treatment[], "weather_summary"?: object } }`  
  Combines static schedule and dynamic weather-based recommendations; optionally includes short weather summary for context.
- **Errors:** 401, 403, 404.

**POST /api/lawn-profiles/:lawnProfileId/recommendations/refresh**

- **Request body:** none or `{}`.
- **Response 202:** Accepted. `{ "data": { "message": "Refresh queued" } }`  
  Backend may run cooldown/weather logic and upsert treatments; or enqueue job. Rate limit (e.g. 1 per user per hour).
- **Errors:** 401, 403, 404, 429 Too Many Requests.

---

## 3. Authentication and authorization

- **Mechanism:** Supabase Auth (JWT). Users sign up/sign in via Supabase (e-mail + password). Access token is a JWT; send it in `Authorization: Bearer <access_token>`.
- **Implementation:**
  - In Astro API routes (`src/pages/api/**/*.ts`), read the Bearer token from the request, verify it with Supabase (e.g. `supabase.auth.getUser(access_token)` or set the client with the token and call `getUser()`), and enforce that the user is authenticated for all protected routes.
  - Use Supabase RLS so that even direct DB access (e.g. from server-side Supabase client) only returns rows the user is allowed to see. API layer should use the same `user_id` (from JWT) for ownership checks.
- **Authorization rules:**
  - Lawn profiles, treatments, treatment history, push subscriptions, notification log, analytics: only the owning user (by `user_id` or via `lawn_profile_id` → `user_id`).
  - Treatment templates, weather cache: read-only for any authenticated user; writes to weather cache only by backend with optional rate limiting.
- **Public endpoints:** None for MVP; auth is required for all API routes above. Sign up / sign in are handled by Supabase Auth endpoints (not custom REST).

---

## 4. Validation and business logic

### 4.1. Lawn profiles

- **nazwa:** Required, length 1–255.
- **wielkość_m2:** Required (default 100), must be > 0.
- **nasłonecznienie:** One of: niskie, średnie, wysokie (default średnie).
- **latitude:** Required, -90 ≤ value ≤ 90.
- **longitude:** Required, -180 ≤ value ≤ 180.
- **rodzaj_powierzchni:** Optional, no length limit in DB; cap at 500 for API if desired.
- **is_active:** Boolean; at most one active lawn per user (enforced by DB unique partial index and/or trigger; API should not allow violating it).

Changing the active lawn or profile data can trigger “rebuild future recommendations” in product wording; implement via cron or on-demand refresh (e.g. recommendations/refresh).

### 4.2. Treatment templates

- Read-only in API; no create/update/delete from client. Validation applies to seed/admin: priorytet 1–10, minimalny_cooldown_dni ≥ 0, nazwa 1–255, opis ≤ 2000, okresy_wykonywania valid JSONB structure.

### 4.3. Treatments

- **lawn_profile_id:** Required, must belong to current user.
- **template_id:** Required, must exist.
- **data_proponowana:** Required, valid date.
- **typ_generowania:** Required, enum statyczny | dynamiczny.
- **uzasadnienie_pogodowe:** Optional, length ≤ 1000.
- **status:** Enum; transitions enforced in API (e.g. only aktywny → wykonany | odrzucony | wygasły; wygasły by cron).
- **expires_at:** If set, must be > created_at (DB constraint); API can set for dynamic recommendations.
- **Cooldown:** Before creating a treatment (or when generating recommendations), call DB function `check_treatment_cooldown(lawn_profile_id, template_id, data_proponowana)`; if false, return 400 with a clear message.
- **Complete:** Require status = aktywny; set status = wykonany; send data_wykonania_rzeczywista to history; trigger logs treatment_history.
- **Reject:** Require status = aktywny; set status = odrzucony; powód_odrzucenia length ≤ 500; trigger logs treatment_history.

### 4.4. Treatment history

- Append-only; no create/update/delete from API (only via trigger on treatments or server-side). GET only. Validation in DB: status_new ≠ status_old; if status_new = wykonany then data_wykonania_rzeczywista required; if status_new = odrzucony then powód_odrzucenia required; powód_odrzucenia ≤ 500.

### 4.5. Weather cache

- **latitude / longitude / date:** Valid ranges; UNIQUE(latitude, longitude, date). temperatura_max -50–60, opady ≥ 0, dni_bez_opadów ≥ 0. TTL 24h: when reading, if fetched_at older than 24h, refresh from Open-Meteo and upsert. Rate limit external calls per user or per location to avoid abuse.

### 4.7. Analytics events

- **event_type:** Required, one of the enum values. **treatment_id:** Optional, must exist if provided. **metadata:** Optional JSON; no strict schema for MVP. Append-only; no update/delete from API.

### 4.8. Recommendations refresh

- Ensure cooldown and weather rules from PRD (e.g. 72h rainfall, days without rain, forecast, temperature, minimal cooldown). Use Open-Meteo and `weather_cache`; create/update treatments with typ_generowania = dynamiczny and optional expires_at. Rate limit refresh per user (e.g. 1/hour).

---

## 5. Pagination, filtering, sorting

- **Pagination:** For list endpoints, use `page` (1-based) and `limit` (default 20, max 100). Response shape: `{ "data": T[], "total": number }` or `{ "data": T[], "next_page": number | null }`.
- **Filtering:** Document query parameters per resource (e.g. status, template_id, date range, event_type). Validate and sanitize before passing to DB.
- **Sorting:** Optional `sort` and `order` (e.g. `sort=data_proponowana&order=asc`). Whitelist sortable fields per endpoint to avoid injection.

---

## 6. Error responses

- **400 Bad Request:** Validation error; body: `{ "error": "Validation error", "details": { "field": "message" } }`.
- **401 Unauthorized:** Missing or invalid token; `{ "error": "Unauthorized" }`.
- **403 Forbidden:** Valid token but not allowed to access resource; `{ "error": "Forbidden" }`.
- **404 Not Found:** Resource not found; `{ "error": "Not found", "resource": "lawn_profile" }`.
- **409 Conflict:** e.g. duplicate push subscription; `{ "error": "Conflict", "message": "..." }`.
- **429 Too Many Requests:** Rate limit; `{ "error": "Too many requests", "retry_after": number }`.
- **500 Internal Server Error:** Generic server error; do not expose internal details.

---

## 7. Assumptions

- Auth is entirely Supabase Auth (e-mail + password); no custom login/register REST endpoints.
- API runs in Astro under `src/pages/api/`; each route can use `context.locals.supabase` and validate JWT to get the current user.
- Dynamic recommendation generation can be implemented in a cron job (e.g. Supabase Edge or external scheduler) that calls internal logic or DB; the “refresh” endpoint may only enqueue a job or run synchronously with strict rate limits.
- Treatment “delete” is a hard delete; if product requires soft delete, add `deleted_at` and adjust RLS and endpoints in a future iteration.
- All API request/response bodies use camelCase or match DB snake_case consistently; this plan uses snake_case for DB-aligned fields (nazwa, wielkość_m2, etc.); frontend can map to camelCase if desired.

-- ============================================================================
-- migracja: initial_schema
-- data: 2026-01-22
-- opis: utworzenie pełnego schematu bazy danych dla aplikacji grassmate mvp
-- 
-- dotknięte tabele:
--   - lawn_profiles (profile trawników użytkowników)
--   - treatment_templates (globalne szablony zabiegów)
--   - treatments (rekomendacje zabiegów)
--   - treatment_history (historia zmian statusu zabiegów)
--   - weather_cache (cache danych pogodowych)
--   - push_subscriptions (subskrypcje web push)
--   - notification_log (log wysłanych powiadomień)
--   - analytics_events (zdarzenia analityczne)
--
-- uwagi:
--   - wszystkie tabele mają włączony row level security (rls)
--   - polityki rls są granularne (osobno dla anon i authenticated)
--   - utworzone są funkcje pomocnicze dla rls
--   - utworzone są wyzwalacze dla automatycznej aktualizacji updated_at
--   - utworzone są wyzwalacze dla logowania zmian statusu zabiegów
-- ============================================================================

-- ============================================================================
-- 1. utworzenie typów enum
-- ============================================================================

-- enum dla poziomu nasłonecznienia trawnika
create type nasłonecznienie as enum (
  'niskie',
  'średnie',
  'wysokie'
);

comment on type nasłonecznienie is 'poziom nasłonecznienia trawnika: niskie, średnie, wysokie';

-- enum dla typu zabiegu
create type typ_zabiegu as enum (
  'koszenie',
  'nawożenie',
  'podlewanie',
  'aeracja',
  'wertykulacja'
);

comment on type typ_zabiegu is 'typ zabiegu pielęgnacyjnego: koszenie, nawożenie, podlewanie, aeracja, wertykulacja';

-- enum dla sposobu generowania rekomendacji
create type typ_generowania as enum (
  'statyczny',
  'dynamiczny'
);

comment on type typ_generowania is 'sposób wygenerowania rekomendacji: statyczny (z harmonogramu) lub dynamiczny (na podstawie pogody)';

-- enum dla statusu rekomendacji zabiegu
create type status_zabiegu as enum (
  'aktywny',
  'wykonany',
  'odrzucony',
  'wygasły'
);

comment on type status_zabiegu is 'status rekomendacji zabiegu: aktywny, wykonany, odrzucony, wygasły';

-- enum dla typu powiadomienia
create type typ_powiadomienia as enum (
  'zabieg_planowy',
  'rekomendacja_pogodowa'
);

comment on type typ_powiadomienia is 'typ powiadomienia: zabieg_planowy, rekomendacja_pogodowa';

-- enum dla typu zdarzenia analitycznego
create type event_type as enum (
  'reminder_sent',
  'reminder_clicked',
  'task_completed',
  'task_skipped',
  'task_expired',
  'weather_recommendation_created',
  'survey_answer'
);

comment on type event_type is 'typ zdarzenia analitycznego: reminder_sent, reminder_clicked, task_completed, task_skipped, task_expired, weather_recommendation_created, survey_answer';

-- ============================================================================
-- 2. utworzenie tabel
-- ============================================================================

-- tabela: lawn_profiles
-- opis: profile trawników powiązane z użytkownikami. jeden aktywny trawnik na użytkownika.
create table lawn_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nazwa text not null,
  wielkość_m2 numeric(10,2) not null default 100.0,
  nasłonecznienie nasłonecznienie not null default 'średnie',
  rodzaj_powierzchni text,
  latitude numeric(10,7) not null,
  longitude numeric(11,7) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- ograniczenia
  constraint lawn_profiles_latitude_check check (latitude >= -90 and latitude <= 90),
  constraint lawn_profiles_longitude_check check (longitude >= -180 and longitude <= 180),
  constraint lawn_profiles_wielkość_m2_check check (wielkość_m2 > 0),
  constraint lawn_profiles_nazwa_check check (
    nazwa is not null 
    and length(nazwa) > 0 
    and length(nazwa) <= 255
  )
);
create unique index lawn_profiles_unique_active_per_user
  on lawn_profiles (user_id)
  where is_active = true;

comment on table lawn_profiles is 'profile trawników powiązane z użytkownikami. jeden aktywny trawnik na użytkownika.';
comment on column lawn_profiles.id is 'identyfikator profilu trawnika';
comment on column lawn_profiles.user_id is 'identyfikator użytkownika (fk do auth.users)';
comment on column lawn_profiles.nazwa is 'nazwa trawnika (np. "trawnik przed domem")';
comment on column lawn_profiles.wielkość_m2 is 'powierzchnia trawnika w metrach kwadratowych';
comment on column lawn_profiles.nasłonecznienie is 'poziom nasłonecznienia trawnika';
comment on column lawn_profiles.rodzaj_powierzchni is 'opcjonalny opis rodzaju powierzchni';
comment on column lawn_profiles.latitude is 'szerokość geograficzna (-90 do 90)';
comment on column lawn_profiles.longitude is 'długość geograficzna (-180 do 180)';
comment on column lawn_profiles.is_active is 'czy trawnik jest aktywny (tylko jeden aktywny na użytkownika)';
comment on column lawn_profiles.created_at is 'data utworzenia profilu';
comment on column lawn_profiles.updated_at is 'data ostatniej aktualizacji profilu';

-- indeksy dla lawn_profiles
create index idx_lawn_profiles_user_id_is_active on lawn_profiles(user_id, is_active);
comment on index idx_lawn_profiles_user_id_is_active is 'indeks dla szybkiego wyszukiwania aktywnego trawnika użytkownika';

create index idx_lawn_profiles_user_id on lawn_profiles(user_id);
comment on index idx_lawn_profiles_user_id is 'indeks dla listy wszystkich trawników użytkownika';

-- włączenie row level security dla lawn_profiles
alter table lawn_profiles enable row level security;

-- tabela: treatment_templates
-- opis: globalne szablony zabiegów współdzielone między użytkownikami. definiują reguły i parametry zabiegów.
create table treatment_templates (
  id uuid primary key default gen_random_uuid(),
  nazwa text not null,
  opis text,
  priorytet integer not null default 5,
  minimalny_cooldown_dni integer not null default 7,
  okresy_wykonywania jsonb not null default '[]'::jsonb,
  typ_zabiegu typ_zabiegu not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- ograniczenia
  constraint treatment_templates_priorytet_check check (priorytet >= 1 and priorytet <= 10),
  constraint treatment_templates_minimalny_cooldown_dni_check check (minimalny_cooldown_dni >= 0),
  constraint treatment_templates_nazwa_check check (
    length(nazwa) > 0 
    and length(nazwa) <= 255
  ),
  constraint treatment_templates_opis_check check (
    opis is null 
    or length(opis) <= 2000
  )
);

comment on table treatment_templates is 'globalne szablony zabiegów współdzielone między użytkownikami. definiują reguły i parametry zabiegów.';
comment on column treatment_templates.id is 'identyfikator szablonu zabiegu';
comment on column treatment_templates.nazwa is 'nazwa zabiegu (np. "koszenie trawnika")';
comment on column treatment_templates.opis is 'szczegółowy opis zabiegu';
comment on column treatment_templates.priorytet is 'priorytet zabiegu (1-10, wyższy = ważniejszy)';
comment on column treatment_templates.minimalny_cooldown_dni is 'minimalny odstęp między zabiegami w dniach';
comment on column treatment_templates.okresy_wykonywania is 'okresy w roku, w których zabieg jest wykonywany (format: [{"start": "03-01", "end": "10-31"}, ...])';
comment on column treatment_templates.typ_zabiegu is 'typ zabiegu (koszenie, nawożenie, podlewanie, aeracja, wertykulacja)';
comment on column treatment_templates.created_at is 'data utworzenia szablonu';
comment on column treatment_templates.updated_at is 'data ostatniej aktualizacji szablonu';

-- indeksy dla treatment_templates
create index idx_treatment_templates_typ_zabiegu on treatment_templates(typ_zabiegu);
comment on index idx_treatment_templates_typ_zabiegu is 'indeks dla filtrowania szablonów po typie zabiegu';

create index idx_treatment_templates_priorytet on treatment_templates(priorytet desc);
comment on index idx_treatment_templates_priorytet is 'indeks dla sortowania szablonów po priorytecie';

-- włączenie row level security dla treatment_templates
alter table treatment_templates enable row level security;

-- tabela: treatments
-- opis: rekomendacje zabiegów (statyczne i dynamiczne) dla konkretnych trawników.
create table treatments (
  id uuid primary key default gen_random_uuid(),
  lawn_profile_id uuid not null references lawn_profiles(id) on delete cascade,
  template_id uuid not null references treatment_templates(id) on delete restrict,
  data_proponowana date not null,
  typ_generowania typ_generowania not null,
  uzasadnienie_pogodowe text,
  status status_zabiegu not null default 'aktywny',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- ograniczenia
  constraint treatments_uzasadnienie_pogodowe_check check (
    uzasadnienie_pogodowe is null 
    or length(uzasadnienie_pogodowe) <= 1000
  ),
  constraint treatments_expires_at_check check (
    expires_at is null 
    or expires_at > created_at
  )
);

comment on table treatments is 'rekomendacje zabiegów (statyczne i dynamiczne) dla konkretnych trawników.';
comment on column treatments.id is 'identyfikator rekomendacji zabiegu';
comment on column treatments.lawn_profile_id is 'identyfikator profilu trawnika (fk do lawn_profiles)';
comment on column treatments.template_id is 'identyfikator szablonu zabiegu (fk do treatment_templates)';
comment on column treatments.data_proponowana is 'proponowana data wykonania zabiegu';
comment on column treatments.typ_generowania is 'sposób wygenerowania rekomendacji: statyczny (z harmonogramu) lub dynamiczny (na podstawie pogody)';
comment on column treatments.uzasadnienie_pogodowe is 'uzasadnienie dla dynamicznych rekomendacji';
comment on column treatments.status is 'status rekomendacji: aktywny, wykonany, odrzucony, wygasły';
comment on column treatments.expires_at is 'data wygaśnięcia rekomendacji (dla dynamicznych)';
comment on column treatments.created_at is 'data utworzenia rekomendacji';
comment on column treatments.updated_at is 'data ostatniej aktualizacji rekomendacji';

-- indeksy dla treatments
create index idx_treatments_lawn_profile_status on treatments(lawn_profile_id, status, expires_at);
comment on index idx_treatments_lawn_profile_status is 'indeks dla listy aktywnych zabiegów dla trawnika';

create index idx_treatments_data_proponowana on treatments(data_proponowana);
comment on index idx_treatments_data_proponowana is 'indeks dla sortowania zabiegów po dacie';

create index idx_treatments_template_id on treatments(template_id);
comment on index idx_treatments_template_id is 'indeks dla filtrowania zabiegów po szablonie';

create index idx_treatments_expires_at on treatments(expires_at);
comment on index idx_treatments_expires_at is 'indeks dla joba wygaszającego zabiegi (co godzinę)';

-- włączenie row level security dla treatments
alter table treatments enable row level security;

-- tabela: treatment_history
-- opis: append-only log zmian statusu zabiegów. przechowuje historię wszystkich zmian statusu wraz z dodatkowymi danymi.
create table treatment_history (
  id uuid primary key default gen_random_uuid(),
  treatment_id uuid not null references treatments(id) on delete cascade,
  lawn_profile_id uuid not null references lawn_profiles(id) on delete cascade,
  status_old status_zabiegu,
  status_new status_zabiegu not null,
  data_wykonania_rzeczywista date,
  powód_odrzucenia text,
  created_at timestamptz not null default now(),
  
  -- ograniczenia
  constraint treatment_history_powód_odrzucenia_check check (
    powód_odrzucenia is null 
    or length(powód_odrzucenia) <= 500
  ),
  constraint treatment_history_status_change_check check (status_new != status_old),
  constraint treatment_history_data_wykonania_check check (
    (status_new = 'wykonany' and data_wykonania_rzeczywista is not null) 
    or (status_new != 'wykonany')
  ),
  constraint treatment_history_powód_odrzucenia_required_check check (
    (status_new = 'odrzucony' and powód_odrzucenia is not null) 
    or (status_new != 'odrzucony')
  )
);

comment on table treatment_history is 'append-only log zmian statusu zabiegów. przechowuje historię wszystkich zmian statusu wraz z dodatkowymi danymi.';
comment on column treatment_history.id is 'identyfikator wpisu w historii';
comment on column treatment_history.treatment_id is 'identyfikator rekomendacji zabiegu (fk do treatments)';
comment on column treatment_history.lawn_profile_id is 'identyfikator profilu trawnika (fk do lawn_profiles) - denormalizacja dla wydajności';
comment on column treatment_history.status_old is 'poprzedni status rekomendacji';
comment on column treatment_history.status_new is 'nowy status rekomendacji';
comment on column treatment_history.data_wykonania_rzeczywista is 'rzeczywista data wykonania (jeśli status = wykonany)';
comment on column treatment_history.powód_odrzucenia is 'powód odrzucenia (jeśli status = odrzucony)';
comment on column treatment_history.created_at is 'moment zmiany statusu';

-- indeksy dla treatment_history
create index idx_treatment_history_lawn_profile_status on treatment_history(lawn_profile_id, status_new, created_at);
comment on index idx_treatment_history_lawn_profile_status is 'indeks dla historii zmian statusu dla trawnika';

create index idx_treatment_history_treatment_id on treatment_history(treatment_id, created_at);
comment on index idx_treatment_history_treatment_id is 'indeks dla historii konkretnego zabiegu';

-- włączenie row level security dla treatment_history
alter table treatment_history enable row level security;

-- tabela: weather_cache
-- opis: cache danych pogodowych współdzielony między użytkownikami w tej samej lokalizacji. ttl 24h.
create table weather_cache (
  id uuid primary key default gen_random_uuid(),
  latitude numeric(10,7) not null,
  longitude numeric(11,7) not null,
  date date not null,
  temperatura_max numeric(5,2),
  opady_24h numeric(6,2),
  opady_72h_sum numeric(6,2),
  dni_bez_opadów integer,
  prognoza_3d jsonb default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  
  -- ograniczenia
  constraint weather_cache_location_date_unique unique (latitude, longitude, date),
  constraint weather_cache_latitude_check check (latitude >= -90 and latitude <= 90),
  constraint weather_cache_longitude_check check (longitude >= -180 and longitude <= 180),
  constraint weather_cache_temperatura_max_check check (
    temperatura_max is null 
    or (temperatura_max >= -50 and temperatura_max <= 60)
  ),
  constraint weather_cache_opady_24h_check check (
    opady_24h is null 
    or opady_24h >= 0
  ),
  constraint weather_cache_opady_72h_sum_check check (
    opady_72h_sum is null 
    or opady_72h_sum >= 0
  ),
  constraint weather_cache_dni_bez_opadów_check check (
    dni_bez_opadów is null 
    or dni_bez_opadów >= 0
  )
);

comment on table weather_cache is 'cache danych pogodowych współdzielony między użytkownikami w tej samej lokalizacji. ttl 24h.';
comment on column weather_cache.id is 'identyfikator wpisu w cache';
comment on column weather_cache.latitude is 'szerokość geograficzna';
comment on column weather_cache.longitude is 'długość geograficzna';
comment on column weather_cache.date is 'data danych pogodowych';
comment on column weather_cache.temperatura_max is 'maksymalna temperatura w °c';
comment on column weather_cache.opady_24h is 'opady w ostatnich 24h w mm';
comment on column weather_cache.opady_72h_sum is 'suma opadów z ostatnich 72h w mm';
comment on column weather_cache.dni_bez_opadów is 'liczba dni bez opadów';
comment on column weather_cache.prognoza_3d is 'prognoza na 3 dni do przodu (format: {"2024-03-15": {"temp_max": 15, "opady": 5}, ...})';
comment on column weather_cache.fetched_at is 'moment pobrania danych';

-- indeksy dla weather_cache
-- uwaga: unique constraint automatycznie tworzy indeks na (latitude, longitude, date)
create index idx_weather_cache_fetched_at on weather_cache(fetched_at);
comment on index idx_weather_cache_fetched_at is 'indeks dla joba czyszczącego cache (ttl 24h)';

-- włączenie row level security dla weather_cache
alter table weather_cache enable row level security;

-- tabela: push_subscriptions
-- opis: subskrypcje web push dla użytkowników. wiele subskrypcji na użytkownika (różne urządzenia).
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  
  -- ograniczenia
  constraint push_subscriptions_endpoint_check check (
    endpoint is not null 
    and length(endpoint) > 0
  ),
  constraint push_subscriptions_keys_check check (
    keys ? 'p256dh' 
    and keys ? 'auth'
  )
);

comment on table push_subscriptions is 'subskrypcje web push dla użytkowników. wiele subskrypcji na użytkownika (różne urządzenia).';
comment on column push_subscriptions.id is 'identyfikator subskrypcji';
comment on column push_subscriptions.user_id is 'identyfikator użytkownika (fk do auth.users)';
comment on column push_subscriptions.endpoint is 'endpoint web push (unikalny)';
comment on column push_subscriptions.keys is 'klucze web push (format: {"p256dh": "...", "auth": "..."})';
comment on column push_subscriptions.created_at is 'data utworzenia subskrypcji';
comment on column push_subscriptions.last_used_at is 'ostatnie użycie subskrypcji';

-- indeksy dla push_subscriptions
create index idx_push_subscriptions_user_id on push_subscriptions(user_id);
comment on index idx_push_subscriptions_user_id is 'indeks dla listy subskrypcji użytkownika';

create index idx_push_subscriptions_last_used_at on push_subscriptions(last_used_at);
comment on index idx_push_subscriptions_last_used_at is 'indeks dla czyszczenia nieaktywnych subskrypcji';

-- włączenie row level security dla push_subscriptions
alter table push_subscriptions enable row level security;

-- tabela: notification_log
-- opis: log wysłanych powiadomień web push. śledzenie wysyłek i kliknięć.
create table notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lawn_profile_id uuid not null references lawn_profiles(id) on delete cascade,
  treatment_id uuid references treatments(id) on delete set null,
  typ_powiadomienia typ_powiadomienia not null,
  template_użyty text not null,
  wysłane_at timestamptz not null default now(),
  kliknięte_at timestamptz,
  
  -- ograniczenia
  constraint notification_log_template_użyty_check check (
    length(template_użyty) > 0 
    and length(template_użyty) <= 500
  ),
  constraint notification_log_kliknięte_at_check check (
    kliknięte_at is null 
    or kliknięte_at >= wysłane_at
  )
);

comment on table notification_log is 'log wysłanych powiadomień web push. śledzenie wysyłek i kliknięć.';
comment on column notification_log.id is 'identyfikator wpisu w logu';
comment on column notification_log.user_id is 'identyfikator użytkownika (fk do auth.users)';
comment on column notification_log.lawn_profile_id is 'identyfikator profilu trawnika (fk do lawn_profiles)';
comment on column notification_log.treatment_id is 'identyfikator rekomendacji zabiegu (fk do treatments, może być null dla powiadomień ogólnych)';
comment on column notification_log.typ_powiadomienia is 'typ powiadomienia: zabieg_planowy, rekomendacja_pogodowa';
comment on column notification_log.template_użyty is 'użyty szablon treści powiadomienia';
comment on column notification_log.wysłane_at is 'moment wysłania powiadomienia';
comment on column notification_log.kliknięte_at is 'moment kliknięcia (jeśli użytkownik kliknął)';

-- indeksy dla notification_log
create index idx_notification_log_user_id on notification_log(user_id, wysłane_at desc);
comment on index idx_notification_log_user_id is 'indeks dla historii powiadomień użytkownika';

create index idx_notification_log_treatment_id on notification_log(treatment_id);
comment on index idx_notification_log_treatment_id is 'indeks dla powiązania powiadomienia z zabiegiem';

create index idx_notification_log_clicked on notification_log(kliknięte_at);
comment on index idx_notification_log_clicked is 'indeks dla analityki kliknięć';

-- włączenie row level security dla notification_log
alter table notification_log enable row level security;

-- tabela: analytics_events
-- opis: zdarzenia analityczne zbierane z aplikacji. partycjonowane według miesięcy dla skalowalności.
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type event_type not null,
  metadata jsonb default '{}'::jsonb,
  treatment_id uuid references treatments(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table analytics_events is 'zdarzenia analityczne zbierane z aplikacji. partycjonowane według miesięcy dla skalowalności.';
comment on column analytics_events.id is 'identyfikator zdarzenia';
comment on column analytics_events.user_id is 'identyfikator użytkownika (fk do auth.users)';
comment on column analytics_events.event_type is 'typ zdarzenia analitycznego';
comment on column analytics_events.metadata is 'dodatkowe dane zdarzenia (jsonb)';
comment on column analytics_events.treatment_id is 'powiązane z zabiegiem (jeśli dotyczy, fk do treatments)';
comment on column analytics_events.created_at is 'moment zdarzenia';

-- indeksy dla analytics_events
create index idx_analytics_events_user_id_created on analytics_events(user_id, created_at desc);
comment on index idx_analytics_events_user_id_created is 'indeks dla historii zdarzeń użytkownika';

create index idx_analytics_events_event_type on analytics_events(event_type, created_at desc);
comment on index idx_analytics_events_event_type is 'indeks dla analityki typów zdarzeń';

create index idx_analytics_events_treatment_id on analytics_events(treatment_id);
comment on index idx_analytics_events_treatment_id is 'indeks dla analityki zabiegów';

create index idx_analytics_events_created_at on analytics_events(created_at);
comment on index idx_analytics_events_created_at is 'indeks dla partycjonowania według daty';

-- włączenie row level security dla analytics_events
alter table analytics_events enable row level security;

-- ============================================================================
-- 3. funkcje pomocnicze dla row level security
-- ============================================================================

-- funkcja: is_lawn_owner
-- opis: sprawdza, czy użytkownik jest właścicielem trawnika
create or replace function is_lawn_owner(lawn_profile_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 
    from lawn_profiles
    where id = lawn_profile_id
    and user_id = auth.uid()
  );
$$;

comment on function is_lawn_owner(uuid) is 'sprawdza, czy zalogowany użytkownik jest właścicielem trawnika o podanym id';

-- funkcja: is_authenticated
-- opis: sprawdza, czy użytkownik jest zarejestrowany
create or replace function is_authenticated()
returns boolean
language sql
security definer
stable
as $$
  select auth.uid() is not null;
$$;

comment on function is_authenticated() is 'sprawdza, czy użytkownik jest zalogowany (auth.uid() is not null)';

-- ============================================================================
-- 4. polityki row level security
-- ============================================================================

-- polityki rls dla lawn_profiles
-- select: użytkownik widzi tylko swoje profile trawników
create policy lawn_profiles_select_anon on lawn_profiles
  for select
  to anon
  using (false);

comment on policy lawn_profiles_select_anon on lawn_profiles is 'anon nie może czytać profili trawników';

create policy lawn_profiles_select_authenticated on lawn_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

comment on policy lawn_profiles_select_authenticated on lawn_profiles is 'authenticated użytkownik widzi tylko swoje profile trawników';

-- insert: użytkownik może tworzyć tylko swoje profile
create policy lawn_profiles_insert_anon on lawn_profiles
  for insert
  to anon
  with check (false);

comment on policy lawn_profiles_insert_anon on lawn_profiles is 'anon nie może tworzyć profili trawników';

create policy lawn_profiles_insert_authenticated on lawn_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

comment on policy lawn_profiles_insert_authenticated on lawn_profiles is 'authenticated użytkownik może tworzyć tylko swoje profile trawników';

-- update: użytkownik może aktualizować tylko swoje profile
create policy lawn_profiles_update_anon on lawn_profiles
  for update
  to anon
  using (false);

comment on policy lawn_profiles_update_anon on lawn_profiles is 'anon nie może aktualizować profili trawników';

create policy lawn_profiles_update_authenticated on lawn_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on policy lawn_profiles_update_authenticated on lawn_profiles is 'authenticated użytkownik może aktualizować tylko swoje profile trawników';

-- delete: użytkownik może usuwać tylko swoje profile
create policy lawn_profiles_delete_anon on lawn_profiles
  for delete
  to anon
  using (false);

comment on policy lawn_profiles_delete_anon on lawn_profiles is 'anon nie może usuwać profili trawników';

create policy lawn_profiles_delete_authenticated on lawn_profiles
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on policy lawn_profiles_delete_authenticated on lawn_profiles is 'authenticated użytkownik może usuwać tylko swoje profile trawników';

-- polityki rls dla treatment_templates
-- select: publiczne (wszyscy zarejestrowani użytkownicy mogą czytać)
create policy treatment_templates_select_anon on treatment_templates
  for select
  to anon
  using (false);

comment on policy treatment_templates_select_anon on treatment_templates is 'anon nie może czytać szablonów zabiegów';

create policy treatment_templates_select_authenticated on treatment_templates
  for select
  to authenticated
  using (true);

comment on policy treatment_templates_select_authenticated on treatment_templates is 'authenticated użytkownicy mogą czytać wszystkie szablony zabiegów (publiczne)';

-- insert: tylko administratorzy/backend (seed data)
create policy treatment_templates_insert_anon on treatment_templates
  for insert
  to anon
  with check (false);

comment on policy treatment_templates_insert_anon on treatment_templates is 'anon nie może tworzyć szablonów zabiegów';

create policy treatment_templates_insert_authenticated on treatment_templates
  for insert
  to authenticated
  with check (false);

comment on policy treatment_templates_insert_authenticated on treatment_templates is 'authenticated użytkownicy nie mogą tworzyć szablonów zabiegów (tylko backend/administratorzy)';

-- update: tylko administratorzy/backend
create policy treatment_templates_update_anon on treatment_templates
  for update
  to anon
  using (false);

comment on policy treatment_templates_update_anon on treatment_templates is 'anon nie może aktualizować szablonów zabiegów';

create policy treatment_templates_update_authenticated on treatment_templates
  for update
  to authenticated
  using (false)
  with check (false);

comment on policy treatment_templates_update_authenticated on treatment_templates is 'authenticated użytkownicy nie mogą aktualizować szablonów zabiegów (tylko backend/administratorzy)';

-- delete: restrict (nie można usuwać szablonów w użyciu)
create policy treatment_templates_delete_anon on treatment_templates
  for delete
  to anon
  using (false);

comment on policy treatment_templates_delete_anon on treatment_templates is 'anon nie może usuwać szablonów zabiegów';

create policy treatment_templates_delete_authenticated on treatment_templates
  for delete
  to authenticated
  using (false);

comment on policy treatment_templates_delete_authenticated on treatment_templates is 'authenticated użytkownicy nie mogą usuwać szablonów zabiegów (restrict - szablony w użyciu nie mogą być usunięte)';

-- polityki rls dla treatments
-- select: użytkownik widzi tylko zabiegi powiązane ze swoimi trawnikami
create policy treatments_select_anon on treatments
  for select
  to anon
  using (false);

comment on policy treatments_select_anon on treatments is 'anon nie może czytać rekomendacji zabiegów';

create policy treatments_select_authenticated on treatments
  for select
  to authenticated
  using (
    exists (
      select 1 
      from lawn_profiles 
      where lawn_profiles.id = treatments.lawn_profile_id 
      and lawn_profiles.user_id = auth.uid()
    )
  );

comment on policy treatments_select_authenticated on treatments is 'authenticated użytkownik widzi tylko zabiegi powiązane ze swoimi trawnikami';

-- insert: użytkownik może tworzyć zabiegi tylko dla swoich trawników
create policy treatments_insert_anon on treatments
  for insert
  to anon
  with check (false);

comment on policy treatments_insert_anon on treatments is 'anon nie może tworzyć rekomendacji zabiegów';

create policy treatments_insert_authenticated on treatments
  for insert
  to authenticated
  with check (
    exists (
      select 1 
      from lawn_profiles 
      where lawn_profiles.id = treatments.lawn_profile_id 
      and lawn_profiles.user_id = auth.uid()
    )
  );

comment on policy treatments_insert_authenticated on treatments is 'authenticated użytkownik może tworzyć zabiegi tylko dla swoich trawników (poprzez lawn_profile_id)';

-- update: użytkownik może aktualizować tylko zabiegi powiązane ze swoimi trawnikami
create policy treatments_update_anon on treatments
  for update
  to anon
  using (false);

comment on policy treatments_update_anon on treatments is 'anon nie może aktualizować rekomendacji zabiegów';

create policy treatments_update_authenticated on treatments
  for update
  to authenticated
  using (
    exists (
      select 1 
      from lawn_profiles 
      where lawn_profiles.id = treatments.lawn_profile_id 
      and lawn_profiles.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 
      from lawn_profiles 
      where lawn_profiles.id = treatments.lawn_profile_id 
      and lawn_profiles.user_id = auth.uid()
    )
  );

comment on policy treatments_update_authenticated on treatments is 'authenticated użytkownik może aktualizować tylko zabiegi powiązane ze swoimi trawnikami';

-- delete: użytkownik może usuwać tylko zabiegi powiązane ze swoimi trawnikami
create policy treatments_delete_anon on treatments
  for delete
  to anon
  using (false);

comment on policy treatments_delete_anon on treatments is 'anon nie może usuwać rekomendacji zabiegów';

create policy treatments_delete_authenticated on treatments
  for delete
  to authenticated
  using (
    exists (
      select 1 
      from lawn_profiles 
      where lawn_profiles.id = treatments.lawn_profile_id 
      and lawn_profiles.user_id = auth.uid()
    )
  );

comment on policy treatments_delete_authenticated on treatments is 'authenticated użytkownik może usuwać tylko zabiegi powiązane ze swoimi trawnikami';

-- polityki rls dla treatment_history
-- select: użytkownik widzi tylko historię ze swoich trawników
create policy treatment_history_select_anon on treatment_history
  for select
  to anon
  using (false);

comment on policy treatment_history_select_anon on treatment_history is 'anon nie może czytać historii zabiegów';

create policy treatment_history_select_authenticated on treatment_history
  for select
  to authenticated
  using (
    exists (
      select 1 
      from lawn_profiles 
      where lawn_profiles.id = treatment_history.lawn_profile_id 
      and lawn_profiles.user_id = auth.uid()
    )
  );

comment on policy treatment_history_select_authenticated on treatment_history is 'authenticated użytkownik widzi tylko historię ze swoich trawników';

-- insert: użytkownik może tworzyć wpisy w historii tylko dla swoich trawników
create policy treatment_history_insert_anon on treatment_history
  for insert
  to anon
  with check (false);

comment on policy treatment_history_insert_anon on treatment_history is 'anon nie może tworzyć wpisów w historii zabiegów';

create policy treatment_history_insert_authenticated on treatment_history
  for insert
  to authenticated
  with check (
    exists (
      select 1 
      from lawn_profiles 
      where lawn_profiles.id = treatment_history.lawn_profile_id 
      and lawn_profiles.user_id = auth.uid()
    )
  );

comment on policy treatment_history_insert_authenticated on treatment_history is 'authenticated użytkownik może tworzyć wpisy w historii tylko dla swoich trawników';

-- update: niedozwolone (append-only log)
create policy treatment_history_update_anon on treatment_history
  for update
  to anon
  using (false);

comment on policy treatment_history_update_anon on treatment_history is 'anon nie może aktualizować historii zabiegów (append-only log)';

create policy treatment_history_update_authenticated on treatment_history
  for update
  to authenticated
  using (false);

comment on policy treatment_history_update_authenticated on treatment_history is 'authenticated użytkownicy nie mogą aktualizować historii zabiegów (append-only log)';

-- delete: niedozwolone (append-only log)
create policy treatment_history_delete_anon on treatment_history
  for delete
  to anon
  using (false);

comment on policy treatment_history_delete_anon on treatment_history is 'anon nie może usuwać historii zabiegów (append-only log)';

create policy treatment_history_delete_authenticated on treatment_history
  for delete
  to authenticated
  using (false);

comment on policy treatment_history_delete_authenticated on treatment_history is 'authenticated użytkownicy nie mogą usuwać historii zabiegów (append-only log)';

-- polityki rls dla weather_cache
-- select: publiczne (wszyscy zarejestrowani użytkownicy mogą czytać)
create policy weather_cache_select_anon on weather_cache
  for select
  to anon
  using (false);

comment on policy weather_cache_select_anon on weather_cache is 'anon nie może czytać cache pogodowego';

create policy weather_cache_select_authenticated on weather_cache
  for select
  to authenticated
  using (true);

comment on policy weather_cache_select_authenticated on weather_cache is 'authenticated użytkownicy mogą czytać wszystkie wpisy w cache pogodowym (publiczne)';

-- insert: publiczne z limitem częstotliwości (zapobieganie spamowaniu)
create policy weather_cache_insert_anon on weather_cache
  for insert
  to anon
  with check (false);

comment on policy weather_cache_insert_anon on weather_cache is 'anon nie może tworzyć wpisów w cache pogodowym';

create policy weather_cache_insert_authenticated on weather_cache
  for insert
  to authenticated
  with check (true);

comment on policy weather_cache_insert_authenticated on weather_cache is 'authenticated użytkownicy mogą tworzyć wpisy w cache pogodowym (publiczne z limitem częstotliwości - implementacja w aplikacji)';

-- update: publiczne z limitem częstotliwości
create policy weather_cache_update_anon on weather_cache
  for update
  to anon
  using (false);

comment on policy weather_cache_update_anon on weather_cache is 'anon nie może aktualizować cache pogodowego';

create policy weather_cache_update_authenticated on weather_cache
  for update
  to authenticated
  using (true)
  with check (true);

comment on policy weather_cache_update_authenticated on weather_cache is 'authenticated użytkownicy mogą aktualizować wpisy w cache pogodowym (publiczne z limitem częstotliwości - implementacja w aplikacji)';

-- delete: tylko job cron (czyszczenie ttl)
create policy weather_cache_delete_anon on weather_cache
  for delete
  to anon
  using (false);

comment on policy weather_cache_delete_anon on weather_cache is 'anon nie może usuwać wpisów z cache pogodowego';

create policy weather_cache_delete_authenticated on weather_cache
  for delete
  to authenticated
  using (false);

comment on policy weather_cache_delete_authenticated on weather_cache is 'authenticated użytkownicy nie mogą usuwać wpisów z cache pogodowego (tylko job cron)';

-- polityki rls dla push_subscriptions
-- select: użytkownik widzi tylko swoje subskrypcje
create policy push_subscriptions_select_anon on push_subscriptions
  for select
  to anon
  using (false);

comment on policy push_subscriptions_select_anon on push_subscriptions is 'anon nie może czytać subskrypcji web push';

create policy push_subscriptions_select_authenticated on push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

comment on policy push_subscriptions_select_authenticated on push_subscriptions is 'authenticated użytkownik widzi tylko swoje subskrypcje web push';

-- insert: użytkownik może tworzyć tylko swoje subskrypcje
create policy push_subscriptions_insert_anon on push_subscriptions
  for insert
  to anon
  with check (false);

comment on policy push_subscriptions_insert_anon on push_subscriptions is 'anon nie może tworzyć subskrypcji web push';

create policy push_subscriptions_insert_authenticated on push_subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

comment on policy push_subscriptions_insert_authenticated on push_subscriptions is 'authenticated użytkownik może tworzyć tylko swoje subskrypcje web push';

-- update: użytkownik może aktualizować tylko swoje subskrypcje
create policy push_subscriptions_update_anon on push_subscriptions
  for update
  to anon
  using (false);

comment on policy push_subscriptions_update_anon on push_subscriptions is 'anon nie może aktualizować subskrypcji web push';

create policy push_subscriptions_update_authenticated on push_subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on policy push_subscriptions_update_authenticated on push_subscriptions is 'authenticated użytkownik może aktualizować tylko swoje subskrypcje web push';

-- delete: użytkownik może usuwać tylko swoje subskrypcje
create policy push_subscriptions_delete_anon on push_subscriptions
  for delete
  to anon
  using (false);

comment on policy push_subscriptions_delete_anon on push_subscriptions is 'anon nie może usuwać subskrypcji web push';

create policy push_subscriptions_delete_authenticated on push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on policy push_subscriptions_delete_authenticated on push_subscriptions is 'authenticated użytkownik może usuwać tylko swoje subskrypcje web push';

-- polityki rls dla notification_log
-- select: użytkownik widzi tylko swoje powiadomienia
create policy notification_log_select_anon on notification_log
  for select
  to anon
  using (false);

comment on policy notification_log_select_anon on notification_log is 'anon nie może czytać logu powiadomień';

create policy notification_log_select_authenticated on notification_log
  for select
  to authenticated
  using (user_id = auth.uid());

comment on policy notification_log_select_authenticated on notification_log is 'authenticated użytkownik widzi tylko swoje powiadomienia';

-- insert: użytkownik może tworzyć wpisy tylko dla siebie (zazwyczaj przez backend/service)
create policy notification_log_insert_anon on notification_log
  for insert
  to anon
  with check (false);

comment on policy notification_log_insert_anon on notification_log is 'anon nie może tworzyć wpisów w logu powiadomień';

create policy notification_log_insert_authenticated on notification_log
  for insert
  to authenticated
  with check (user_id = auth.uid());

comment on policy notification_log_insert_authenticated on notification_log is 'authenticated użytkownik może tworzyć wpisy w logu powiadomień tylko dla siebie (zazwyczaj przez backend/service)';

-- update: użytkownik może aktualizować tylko swoje powiadomienia (np. kliknięcie)
create policy notification_log_update_anon on notification_log
  for update
  to anon
  using (false);

comment on policy notification_log_update_anon on notification_log is 'anon nie może aktualizować logu powiadomień';

create policy notification_log_update_authenticated on notification_log
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on policy notification_log_update_authenticated on notification_log is 'authenticated użytkownik może aktualizować tylko swoje powiadomienia (np. kliknięcie)';

-- delete: niedozwolone (log tylko do odczytu)
create policy notification_log_delete_anon on notification_log
  for delete
  to anon
  using (false);

comment on policy notification_log_delete_anon on notification_log is 'anon nie może usuwać wpisów z logu powiadomień (log tylko do odczytu)';

create policy notification_log_delete_authenticated on notification_log
  for delete
  to authenticated
  using (false);

comment on policy notification_log_delete_authenticated on notification_log is 'authenticated użytkownicy nie mogą usuwać wpisów z logu powiadomień (log tylko do odczytu)';

-- polityki rls dla analytics_events
-- select: użytkownik widzi tylko swoje zdarzenia
create policy analytics_events_select_anon on analytics_events
  for select
  to anon
  using (false);

comment on policy analytics_events_select_anon on analytics_events is 'anon nie może czytać zdarzeń analitycznych';

create policy analytics_events_select_authenticated on analytics_events
  for select
  to authenticated
  using (user_id = auth.uid());

comment on policy analytics_events_select_authenticated on analytics_events is 'authenticated użytkownik widzi tylko swoje zdarzenia analityczne';

-- insert: użytkownik może tworzyć tylko swoje zdarzenia (zazwyczaj przez backend/service)
create policy analytics_events_insert_anon on analytics_events
  for insert
  to anon
  with check (false);

comment on policy analytics_events_insert_anon on analytics_events is 'anon nie może tworzyć zdarzeń analitycznych';

create policy analytics_events_insert_authenticated on analytics_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

comment on policy analytics_events_insert_authenticated on analytics_events is 'authenticated użytkownik może tworzyć zdarzenia analityczne tylko dla siebie (zazwyczaj przez backend/service)';

-- update: niedozwolone (append-only log)
create policy analytics_events_update_anon on analytics_events
  for update
  to anon
  using (false);

comment on policy analytics_events_update_anon on analytics_events is 'anon nie może aktualizować zdarzeń analitycznych (append-only log)';

create policy analytics_events_update_authenticated on analytics_events
  for update
  to authenticated
  using (false);

comment on policy analytics_events_update_authenticated on analytics_events is 'authenticated użytkownicy nie mogą aktualizować zdarzeń analitycznych (append-only log)';

-- delete: niedozwolone (append-only log)
create policy analytics_events_delete_anon on analytics_events
  for delete
  to anon
  using (false);

comment on policy analytics_events_delete_anon on analytics_events is 'anon nie może usuwać zdarzeń analitycznych (append-only log)';

create policy analytics_events_delete_authenticated on analytics_events
  for delete
  to authenticated
  using (false);

comment on policy analytics_events_delete_authenticated on analytics_events is 'authenticated użytkownicy nie mogą usuwać zdarzeń analitycznych (append-only log)';

-- ============================================================================
-- 5. wyzwalacze (triggers)
-- ============================================================================

-- funkcja: update_updated_at_column
-- opis: automatyczna aktualizacja kolumny updated_at
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function update_updated_at_column() is 'automatyczna aktualizacja kolumny updated_at przed aktualizacją wiersza';

-- wyzwalacze dla automatycznej aktualizacji updated_at
create trigger update_lawn_profiles_updated_at
  before update on lawn_profiles
  for each row
  execute function update_updated_at_column();

create trigger update_treatment_templates_updated_at
  before update on treatment_templates
  for each row
  execute function update_updated_at_column();

create trigger update_treatments_updated_at
  before update on treatments
  for each row
  execute function update_updated_at_column();

-- funkcja: update_push_subscription_last_used
-- opis: automatyczna aktualizacja last_used_at dla push_subscriptions
create or replace function update_push_subscription_last_used()
returns trigger
language plpgsql
as $$
begin
  new.last_used_at = now();
  return new;
end;
$$;

comment on function update_push_subscription_last_used() is 'automatyczna aktualizacja kolumny last_used_at przed aktualizacją subskrypcji web push';

create trigger update_push_subscriptions_last_used
  before update on push_subscriptions
  for each row
  execute function update_push_subscription_last_used();

-- funkcja: ensure_single_active_lawn
-- opis: zapewnia, że tylko jeden trawnik użytkownika jest aktywny
create or replace function ensure_single_active_lawn()
returns trigger
language plpgsql
as $$
begin
  if new.is_active = true then
    -- deaktywuj inne aktywne trawniki użytkownika
    update lawn_profiles
    set is_active = false
    where user_id = new.user_id
    and id != new.id
    and is_active = true;
  end if;
  return new;
end;
$$;

comment on function ensure_single_active_lawn() is 'zapewnia, że tylko jeden trawnik użytkownika jest aktywny (deaktywuje inne przy ustawieniu nowego jako aktywnego)';

create trigger ensure_single_active_lawn_trigger
  before insert or update on lawn_profiles
  for each row
  execute function ensure_single_active_lawn();

-- funkcja: log_treatment_status_change
-- opis: automatyczne dodawanie wpisu do treatment_history przy zmianie statusu
create or replace function log_treatment_status_change()
returns trigger
language plpgsql
as $$
begin
  if old.status is distinct from new.status then
    insert into treatment_history (
      treatment_id,
      lawn_profile_id,
      status_old,
      status_new,
      data_wykonania_rzeczywista,
      powód_odrzucenia
    ) values (
      new.id,
      new.lawn_profile_id,
      old.status,
      new.status,
      case when new.status = 'wykonany' then new.data_proponowana else null end,
      case when new.status = 'odrzucony' then 'użytkownik odrzucił' else null end
    );
  end if;
  return new;
end;
$$;

comment on function log_treatment_status_change() is 'automatyczne dodawanie wpisu do treatment_history przy zmianie statusu rekomendacji zabiegu';

create trigger log_treatment_status_change_trigger
  after update on treatments
  for each row
  execute function log_treatment_status_change();

-- ============================================================================
-- koniec migracji
-- ============================================================================

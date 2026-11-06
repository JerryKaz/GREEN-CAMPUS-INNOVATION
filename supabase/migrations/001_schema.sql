-- =============================================================================
-- Green Campus Innovation · VVU WaterWatch
-- 001_schema.sql — tables, constraints, indexes, timestamps
-- Run in order: 001 → 005, then seed.sql (optional, demo data only).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- TABLE 7: profiles  (one row per Supabase Auth user)
-- role: admin  = full access incl. settings, budget and user roles
--       staff  = manage reports, locations, readings, actions, gallery
--       viewer = read-only access to the admin area
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  role        text not null default 'viewer' check (role in ('admin','staff','viewer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a viewer profile when someone is added in Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- TABLE 1: campus_locations
-- Only Group 5 / Estates add locations. Coordinates are optional and must be
-- verified on site before is_verified is set to true.
-- ---------------------------------------------------------------------------
create table if not exists public.campus_locations (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 2 and 120),
  description      text not null default '' check (char_length(description) <= 1000),
  location_details text not null default '' check (char_length(location_details) <= 500),
  latitude         numeric(9,6) check (latitude between -90 and 90),
  longitude        numeric(9,6) check (longitude between -180 and 180),
  location_type    text not null default 'other' check (location_type in
                     ('hostel','academic','washroom','kitchen','tank','outdoor','office','other')),
  is_verified      boolean not null default false,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint campus_locations_coords_pair check ((latitude is null) = (longitude is null)),
  constraint campus_locations_name_unique unique (name)
);
create trigger trg_locations_updated before update on public.campus_locations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE 2: water_reports
-- Public submissions arrive ONLY through public.submit_water_report() (003).
-- ---------------------------------------------------------------------------
create table if not exists public.water_reports (
  id               uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  location_id      uuid references public.campus_locations(id) on delete set null,
  location_note    text not null default '' check (char_length(location_note) <= 200),
  issue_type       text not null check (issue_type in
                     ('leaking_tap','broken_pipe','overflowing_tank','faulty_flush',
                      'unnecessary_usage','other')),
  description      text not null check (char_length(description) between 10 and 2000),
  severity         text not null check (severity in ('low','medium','high','critical')),
  status           text not null default 'submitted' check (status in
                     ('submitted','under_review','assigned','in_progress','resolved','closed')),
  observed_at      timestamptz,
  photo_path       text,
  is_anonymous     boolean not null default true,
  reporter_name    text check (char_length(reporter_name) <= 120),
  reporter_contact text check (char_length(reporter_contact) <= 160),
  assigned_to      text not null default '' check (char_length(assigned_to) <= 160),
  admin_notes      text not null default '' check (char_length(admin_notes) <= 2000),
  is_demo          boolean not null default false,
  submitted_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Anonymous reports must not carry identity fields.
  constraint water_reports_anonymous_clean check
    (not is_anonymous or (reporter_name is null and reporter_contact is null)),
  constraint water_reports_location_given check
    (location_id is not null or char_length(location_note) >= 3)
);
create index if not exists idx_reports_location   on public.water_reports(location_id);
create index if not exists idx_reports_status     on public.water_reports(status);
create index if not exists idx_reports_submitted  on public.water_reports(submitted_at desc);
create trigger trg_reports_updated before update on public.water_reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE 3: water_readings
-- phase separates baseline measurements from pilot measurements so the two
-- are never mixed. Values are stored in the unit they were measured in;
-- reports convert m³ → L (exact: 1 m³ = 1000 L).
-- ---------------------------------------------------------------------------
create table if not exists public.water_readings (
  id                 uuid primary key default gen_random_uuid(),
  location_id        uuid not null references public.campus_locations(id) on delete restrict,
  reading_date       date not null,
  consumption_value  numeric(14,3) not null check (consumption_value >= 0),
  measurement_unit   text not null check (measurement_unit in ('L','m3')),
  measurement_method text not null check (char_length(measurement_method) between 2 and 120),
  phase              text not null default 'baseline' check (phase in ('baseline','pilot','routine')),
  meter_reading      numeric(14,3) check (meter_reading >= 0),
  notes              text not null default '' check (char_length(notes) <= 1000),
  recorded_by        uuid references public.profiles(id) on delete set null,
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now(),
  constraint water_readings_one_per_day unique (location_id, reading_date, phase, measurement_method)
);
create index if not exists idx_readings_location_date on public.water_readings(location_id, reading_date);
create index if not exists idx_readings_phase         on public.water_readings(phase);

-- ---------------------------------------------------------------------------
-- TABLE 4: conservation_actions
-- ---------------------------------------------------------------------------
create table if not exists public.conservation_actions (
  id                  uuid primary key default gen_random_uuid(),
  report_id           uuid references public.water_reports(id) on delete set null,
  location_id         uuid not null references public.campus_locations(id) on delete restrict,
  action_description  text not null check (char_length(action_description) between 5 and 1000),
  responsible_team    text not null check (char_length(responsible_team) between 2 and 160),
  implementation_date date,
  estimated_cost      numeric(12,2) not null default 0 check (estimated_cost >= 0),
  actual_cost         numeric(12,2) check (actual_cost >= 0),
  status              text not null default 'planned' check (status in
                        ('planned','in_progress','completed','verified','cancelled')),
  verification_notes  text not null default '' check (char_length(verification_notes) <= 2000),
  is_demo             boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_actions_location on public.conservation_actions(location_id);
create index if not exists idx_actions_report   on public.conservation_actions(report_id);
create index if not exists idx_actions_status   on public.conservation_actions(status);
create trigger trg_actions_updated before update on public.conservation_actions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE 5: pledges   (personal fields optional — Act 843 data minimisation)
-- ---------------------------------------------------------------------------
create table if not exists public.pledges (
  id              uuid primary key default gen_random_uuid(),
  commitment_type text not null check (commitment_type in
                    ('report_leaks','turn_off_taps','avoid_waste','encourage_others','participate')),
  full_name       text check (char_length(full_name) <= 120),
  email           text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  department      text check (char_length(department) <= 160),
  comments        text check (char_length(comments) <= 1000),
  consent_status  boolean not null check (consent_status = true),
  is_demo         boolean not null default false,
  submitted_at    timestamptz not null default now()
);
create index if not exists idx_pledges_submitted on public.pledges(submitted_at desc);

-- ---------------------------------------------------------------------------
-- TABLE 6: feedback
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id             uuid primary key default gen_random_uuid(),
  category       text not null check (category in
                   ('general','website','reporting','pilot','suggestion','other')),
  message        text not null check (char_length(message) between 10 and 2000),
  contact_name   text check (char_length(contact_name) <= 120),
  contact_email  text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  consent_status boolean not null check (consent_status = true),
  status         text not null default 'new' check (status in ('new','reviewed','archived')),
  is_demo        boolean not null default false,
  submitted_at   timestamptz not null default now()
);
create index if not exists idx_feedback_submitted on public.feedback(submitted_at desc);

-- ---------------------------------------------------------------------------
-- Supporting tables (content the group edits without touching code)
-- ---------------------------------------------------------------------------
create table if not exists public.gallery_photos (
  id           uuid primary key default gen_random_uuid(),
  category     text not null check (category in
                 ('problem_areas','observations','interviews','research','ideation',
                  'prototype','pilot','before_after')),
  caption      text not null check (char_length(caption) between 2 and 160),
  taken_at     timestamptz,
  location_text text not null default '' check (char_length(location_text) <= 160),
  description  text not null default '' check (char_length(description) <= 1000),
  image_url    text not null,
  is_published boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_gallery_category on public.gallery_photos(category, sort_order);

create table if not exists public.budget_items (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in
                ('leak_detection','plumbing_repairs','monitoring_equipment','signage',
                 'hosting','training','maintenance','other')),
  item        text not null check (char_length(item) between 2 and 160),
  quantity    numeric(10,2) not null default 1 check (quantity >= 0),
  unit_cost   numeric(12,2) not null default 0 check (unit_cost >= 0),
  cost_basis  text not null default 'estimate' check (cost_basis in ('estimate','quotation','actual')),
  notes       text not null default '' check (char_length(notes) <= 500),
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.site_settings (
  key        text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

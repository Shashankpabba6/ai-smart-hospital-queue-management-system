-- ============================================================
-- AI Smart Hospital Queue Management System - database schema
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT).
-- Then run 002_supabase_auth.sql (moves login to Supabase Auth, removes password_hash).
-- Rebuilt from the app code (src/lib/supabase.ts and all queries).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- users ----------
-- NOTE: the app currently stores and compares the raw password in
-- password_hash (see src/lib/auth-context.tsx). Do not reuse real passwords.
create table if not exists public.users (
    user_id       uuid primary key default gen_random_uuid(),
    name          text not null,
    email         text not null unique,
    password_hash text not null,
    role          text not null check (role in ('patient', 'doctor', 'admin')),
    created_at    timestamptz not null default now()
);

-- ---------- staff (one row per doctor) ----------
create table if not exists public.staff (
    doctor_id              uuid primary key references public.users(user_id) on delete cascade,
    specialization         text not null default 'General Medicine',
    shift_hours            integer not null default 8,
    patients_handled_today integer not null default 0,
    is_available           boolean not null default true
);

-- ---------- appointments ----------
create table if not exists public.appointments (
    appointment_id           uuid primary key default gen_random_uuid(),
    patient_id               uuid not null references public.users(user_id) on delete cascade,
    doctor_id                uuid references public.users(user_id) on delete set null,
    symptoms                 text,
    fever                    numeric(4,1),
    blood_pressure_systolic  integer,
    blood_pressure_diastolic integer,
    spo2                     numeric(4,1),
    age                      integer,
    severity_score           integer not null default 1 check (severity_score between 1 and 5),
    predicted_wait_time      integer,
    token_number             integer,
    status                   text not null default 'waiting'
                             check (status in ('waiting', 'in_consultation', 'completed', 'cancelled', 'no_show')),
    queue_position           integer,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now()
);
create index if not exists ix_appointments_doctor_status on public.appointments (doctor_id, status);
create index if not exists ix_appointments_patient on public.appointments (patient_id);
create index if not exists ix_appointments_created on public.appointments (created_at);

-- ---------- resources (single row read by the admin dashboard) ----------
create table if not exists public.resources (
    resource_id           uuid primary key default gen_random_uuid(),
    total_beds            integer not null default 100,
    available_beds        integer not null default 100,
    icu_beds_total        integer not null default 20,
    icu_beds_available    integer not null default 20,
    ventilators_total     integer not null default 10,
    ventilators_available integer not null default 10,
    wheelchairs_total     integer not null default 25,
    wheelchairs_available integer not null default 25,
    xray_machines         integer not null default 3,
    xray_available        integer not null default 3,
    updated_at            timestamptz not null default now()
);
insert into public.resources (total_beds, available_beds, icu_beds_total, icu_beds_available)
select 120, 85, 20, 12
where not exists (select 1 from public.resources);

-- ---------- access ----------
-- The app uses its own users table (not Supabase Auth), so every browser
-- request arrives as the "anon" role. These policies let the app work as
-- designed. They are permissive: anyone with the publishable key can read
-- and write these tables. Fine for a demo; tighten before real patient data.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.users, public.staff,
      public.appointments, public.resources to anon, authenticated;

alter table public.users        enable row level security;
alter table public.staff        enable row level security;
alter table public.appointments enable row level security;
alter table public.resources    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['users', 'staff', 'appointments', 'resources'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t
                   and policyname = 'app_full_access') then
      execute format('create policy app_full_access on public.%I for all to anon, authenticated
                      using (true) with check (true)', t);
    end if;
  end loop;
end $$;

-- server-side code (API routes, scripts) uses the secret key = service_role.
-- Newer Supabase projects do not grant it access to new tables automatically.
grant select, insert, update, delete on public.users, public.staff,
      public.appointments, public.resources to service_role;

-- Make the new tables visible to the API immediately
notify pgrst, 'reload schema';

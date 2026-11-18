-- ============================================================
-- Migration 002: move login to Supabase Auth (hashed passwords)
-- Run once after schema.sql: Dashboard > SQL Editor > New query > paste > Run
--
-- * Passwords are no longer stored in public.users. Supabase Auth keeps them
--   as bcrypt hashes in auth.users, which the API never exposes.
-- * public.users becomes a profile table keyed by the auth user id; a trigger
--   creates the profile (and the staff row for doctors) on sign-up.
-- * Logged-out (anon) visitors lose all table access.
-- ============================================================

-- ---------- users: drop the plain-text password, link to auth.users ----------
alter table public.users drop column if exists password_hash;
alter table public.users alter column user_id drop default;
do $$
begin
  if exists (select 1 from public.users u where not exists (select 1 from auth.users a where a.id = u.user_id)) then
    raise exception 'public.users has rows without a matching auth user; delete them (Table Editor) and re-run';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_user_id_auth_fkey') then
    alter table public.users add constraint users_user_id_auth_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- ---------- create the profile row when someone signs up ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r     text  := coalesce(meta->>'role', 'patient');
  hours integer := case when (meta->>'shift_hours') ~ '^[0-9]{1,2}$' then (meta->>'shift_hours')::integer else 8 end;
begin
  if r not in ('patient', 'doctor', 'admin') then
    r := 'patient';
  end if;
  insert into public.users (user_id, name, email, role)
  values (new.id,
          coalesce(nullif(trim(meta->>'name'), ''), split_part(new.email, '@', 1)),
          lower(new.email),
          r);
  if r = 'doctor' then
    insert into public.staff (doctor_id, specialization, shift_hours)
    values (new.id, coalesce(nullif(trim(meta->>'specialization'), ''), 'General Medicine'), hours);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- access: signed-in users only ----------
revoke all on public.users, public.staff, public.appointments, public.resources from anon;

drop policy if exists app_full_access on public.users;
drop policy if exists app_full_access on public.staff;
drop policy if exists app_full_access on public.appointments;
drop policy if exists app_full_access on public.resources;

-- users: everyone signed in can see names/emails (needed for queues and doctor
-- lists); a user may only rename themselves and can never change their role.
revoke all on public.users from authenticated;
grant select on public.users to authenticated;
grant update (name) on public.users to authenticated;
drop policy if exists users_read on public.users;
create policy users_read on public.users for select to authenticated using (true);
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- staff / appointments / resources: the app's dashboards read and update these
grant select, insert, update, delete on public.staff, public.appointments, public.resources to authenticated;
do $$
declare t text;
begin
  foreach t in array array['staff', 'appointments', 'resources'] loop
    execute format('drop policy if exists signed_in_access on public.%I', t);
    execute format('create policy signed_in_access on public.%I for all to authenticated
                    using (true) with check (true)', t);
  end loop;
end $$;

-- server-side code (API routes, scripts) uses the secret key = service_role.
-- Newer Supabase projects do not grant it access to new tables automatically.
grant select, insert, update, delete on public.users, public.staff,
      public.appointments, public.resources to service_role;

notify pgrst, 'reload schema';

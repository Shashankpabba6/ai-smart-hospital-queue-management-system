-- ============================================================
-- Migration 003: nobody can sign themselves up as admin
-- Run once after 002: Dashboard > SQL Editor > New query > paste > Run
--
-- Sign-up can only create patient or doctor profiles. Any other requested
-- role (including "admin" sent straight to the Supabase API) becomes patient.
--
-- To make someone an admin, run this in the SQL Editor (service role only):
--   update public.users set role = 'admin' where email = 'person@example.com';
-- ============================================================

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
  if r not in ('patient', 'doctor') then
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

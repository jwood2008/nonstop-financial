-- =====================================================================
-- NonStop Financial — Birthday at signup
-- Paste into the Supabase SQL Editor. Idempotent.
--
-- Signup now asks for a birthday instead of an age. The app derives age
-- from it (and keeps profiles.age fresh on login), so the age-based
-- analytics keep working unchanged — but it never goes stale the way a
-- typed-once age does.
-- =====================================================================

alter table public.profiles
  add column if not exists birthdate date;

-- Recreate the signup trigger so new users' birthdate lands on the profile.
-- (Age still comes through the metadata too, for the analytics widgets.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, age, birthdate, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'age', '')::int,
    nullif(new.raw_user_meta_data ->> 'birthdate', '')::date,
    case
      when lower(split_part(new.email, '@', 2)) = 'nonstopglobal.co' then 'Agent'
      else 'Lead'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

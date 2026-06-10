-- =====================================================================
-- NonStop Financial — Single-role pipeline: Lead → Agent → Manager → Admin
-- Paste into the Supabase SQL Editor. Idempotent. Run AFTER teams.sql.
--
-- One role per person. Being on the admin list (app_admins) FORCES the
-- profile role to 'Admin' and clears any team ties (admins run the app,
-- they don't have teams). Removing admin access drops the person back to
-- Agent (NonStop email) or Lead. Managers are only role='Manager' — so
-- the signup manager list and team analytics never include admins.
-- =====================================================================

-- protect_profile_role: still service-role only, but also allow changes
-- made by our own database triggers (the admin-role sync below).
create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  if (new.role is distinct from old.role)
     and coalesce(auth.role(), '') <> 'service_role'
     and pg_trigger_depth() <= 1 then
    new.role := old.role;
  end if;
  return new;
end;
$$;

-- keep app_admins ↔ profiles.role in sync
create or replace function public.sync_admin_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
       set role = 'Admin', manager_id = null, requested_role = null
     where lower(email) = new.email;
    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles
       set role = case
         when lower(split_part(coalesce(email, ''), '@', 2)) = 'nonstopglobal.co' then 'Agent'
         else 'Lead'
       end
     where lower(email) = old.email and role = 'Admin';
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists app_admins_sync_role on public.app_admins;
create trigger app_admins_sync_role
  after insert or delete on public.app_admins
  for each row execute function public.sync_admin_role();

-- signups by already-invited admins land directly as Admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, age, birthdate, manager_id, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'age', '')::int,
    nullif(new.raw_user_meta_data ->> 'birthdate', '')::date,
    nullif(new.raw_user_meta_data ->> 'manager_id', '')::uuid,
    case
      when exists (select 1 from public.app_admins a where a.email = lower(new.email)) then 'Admin'
      when lower(split_part(new.email, '@', 2)) = 'nonstopglobal.co' then 'Agent'
      else 'Lead'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- backfill: everyone currently on the admin list becomes role 'Admin',
-- loses any manager assignment, and is no longer anyone's manager
update public.profiles p
   set role = 'Admin', manager_id = null, requested_role = null
 where lower(p.email) in (select email from public.app_admins)
   and p.role is distinct from 'Admin';

-- agents who had an admin selected as their "manager" get unassigned
update public.profiles p
   set manager_id = null
 where p.manager_id in (
   select p2.id from public.profiles p2
   where lower(p2.email) in (select email from public.app_admins)
 );

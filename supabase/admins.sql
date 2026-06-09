-- =====================================================================
-- NonStop Financial — Admin tiers (owners + sub-admins)
-- Run in the Supabase SQL Editor. Idempotent.
--
-- owner : full admin + can add/remove sub-admins
-- admin : full admin, but CANNOT manage other admins (a "sub-admin")
-- (anyone not listed is a regular user)
-- =====================================================================

create table if not exists public.app_admins (
  email      text primary key,
  role       text not null default 'admin' check (role in ('owner', 'admin')),
  added_by   text,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
-- No direct table access — everything goes through the SECURITY DEFINER
-- functions below (so only owners can mutate the list).

-- Remove any previously-seeded admins that should no longer have access
-- (re-run safe — clears the old bootstrap owners).
delete from public.app_admins where email in (
  'greg@lecgroup.com',
  'jay@nonstopfinancial.com',
  'admin@nonstopfinancial.com'
);

-- Seed the bootstrap owners (keep in sync with lib/admins.ts).
insert into public.app_admins (email, role) values
  ('james.l.wood@outlook.com', 'owner'),
  ('jameslwood589@gmail.com', 'owner')
on conflict (email) do update set role = 'owner';

-- The caller's tier: 'owner' | 'admin' | null
create or replace function public.my_admin_status()
returns text language sql security definer set search_path = public stable as $$
  select role from public.app_admins where email = lower(auth.email());
$$;
grant execute on function public.my_admin_status() to authenticated, anon;

create or replace function public.is_owner()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.app_admins
    where email = lower(auth.email()) and role = 'owner'
  );
$$;
grant execute on function public.is_owner() to authenticated, anon;

-- Owners only: list every admin (owners + sub-admins).
create or replace function public.list_admins()
returns table (email text, role text, added_by text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select email, role, added_by, created_at
  from public.app_admins
  where public.is_owner()
  order by (role = 'owner') desc, email;
$$;
grant execute on function public.list_admins() to authenticated;

-- Owners only: add a sub-admin by email.
create or replace function public.add_admin(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  if not public.is_owner() then return 'forbidden'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'invalid'; end if;
  insert into public.app_admins (email, role, added_by)
  values (e, 'admin', lower(auth.email()))
  on conflict (email) do nothing;
  return 'ok';
end;
$$;
grant execute on function public.add_admin(text) to authenticated;

-- Owners only: remove a sub-admin (owners are protected).
create or replace function public.remove_admin(p_email text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then return 'forbidden'; end if;
  delete from public.app_admins
  where email = lower(trim(p_email)) and role = 'admin';
  return 'ok';
end;
$$;
grant execute on function public.remove_admin(text) to authenticated;

# Tab 1 — Core: profiles, admins, payments

Paste this whole block into one Supabase SQL Editor tab and click **Run**.
Idempotent — safe to re-run. Run this tab FIRST.

Combines: `schema.sql` + `admins.sql` + `payments.sql`

- Profiles table, signup trigger, role ladder protection
- Admin tiers (owners + sub-admins) — seeds james.l.wood@outlook.com and jameslwood589@gmail.com as owners
- Stripe purchases table + `has_purchased()`

```sql
-- =====================================================================
-- NonStop Financial — Supabase schema
-- Run this once in the Supabase SQL Editor (project: mgavuqjhqflzixbtvvig).
-- Safe to re-run (idempotent).
-- =====================================================================

-- 1. Profiles: one row per auth user, holding the signup details (incl. age).
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  name       text not null default '',
  age        int  check (age is null or age between 13 and 120),
  phone      text not null default '',
  title      text not null default '',
  avatar     text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each user can read & write only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- 2. Auto-create a profile when a user signs up, pulling name/age from the
--    metadata the app passes to supabase.auth.signUp({ options: { data }}).
--    Position defaults by email: a NonStop email → 'Agent', otherwise 'Lead'.
--    (Admins promote people to 'Manager' from the analytics Users panel.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, age, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'age', '')::int,
    case
      when lower(split_part(new.email, '@', 2)) = 'nonstopglobal.co' then 'Agent'
      else 'Lead'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Keep updated_at fresh on edits.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 4. Age-bracket distribution for the analytics "Audience by Age" widget.
--    SECURITY DEFINER so it can aggregate across all users (returns only
--    anonymous percentages — no PII). Returns 0 rows until there are signups.
create or replace function public.age_distribution()
returns table (label text, value int)
language sql
security definer set search_path = public
as $$
  with buckets as (
    select case
      when age is null or age <= 18 then '18 & under'
      when age <= 24 then '18–24'
      when age <= 34 then '25–34'
      when age <= 44 then '35–44'
      else '45+'
    end as label
    from public.profiles
  ),
  counts as (
    select label, count(*)::int as n from buckets group by label
  ),
  tot as (select greatest(sum(n), 1) as t from counts)
  select c.label, round(c.n * 100.0 / t.t)::int as value
  from counts c, tot t
  order by array_position(
    array['18 & under','18–24','25–34','35–44','45+'], c.label
  );
$$;

grant execute on function public.age_distribution() to authenticated;

-- 5. Position ladder (Lead → Agent → Senior Agent → Manager). Separate from
--    admin status. New users default to 'Lead'. A user may set requested_role
--    (a request), but ONLY an admin (service-role server route) may change the
--    actual role — a trigger reverts any self-attempt.
alter table public.profiles
  add column if not exists role text not null default 'Lead',
  add column if not exists requested_role text;

create or replace function public.protect_profile_role()
returns trigger language plpgsql as $$
begin
  -- Only the service role (our admin route) may change `role`; ignore others.
  if (new.role is distinct from old.role)
     and coalesce(auth.role(), '') <> 'service_role' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();


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


-- =====================================================================
-- NonStop Financial — Payments (one-time purchase)
-- Run in the Supabase SQL Editor. Idempotent.
--
-- Writes happen only via the Stripe webhook (service-role key, bypasses RLS).
-- Users can read their own purchase. has_purchased() gates access in the app.
-- =====================================================================

create table if not exists public.purchases (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  stripe_session_id text unique,
  amount            integer,           -- in cents
  email             text,
  status            text not null default 'paid',
  created_at        timestamptz not null default now()
);

create index if not exists purchases_user_idx on public.purchases (user_id);

alter table public.purchases enable row level security;

drop policy if exists "purchases_select_own" on public.purchases;
create policy "purchases_select_own" on public.purchases
  for select using (user_id = auth.uid());

-- Has the current user paid?
create or replace function public.has_purchased()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.purchases
    where user_id = auth.uid() and status = 'paid'
  );
$$;
grant execute on function public.has_purchased() to authenticated, anon;
```

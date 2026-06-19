-- =====================================================================
-- NonStop Financial — 07 · Security: server-side paywall + leaderboard scope
-- Run AFTER 06_free_emails.sql. Idempotent — safe to re-run.
--
--   A. Server-side paywall. course_content is the curriculum; until now any
--      signed-in user could read it (RLS `using(true)`) and the only gate was
--      a client-side redirect (trivially bypassable). This adds a single
--      server-side switch — app_settings.paywall_enabled. It DEFAULTS OFF, so
--      nothing changes today. Flip it on at launch and curriculum reads then
--      require a purchase (has_purchased) or staff.
--
--   B. Leaderboard scope. analytics_scope()'s fallback branch returned ALL
--      users to a non-staff caller with no manager — leaking every user's
--      name + stats org-wide on the dashboard leaderboard. Now such a caller
--      sees only themselves. (Manager → own team, Admin → everyone: unchanged.)
-- =====================================================================


-- ── A. Paywall switch ────────────────────────────────────────────────
create table if not exists public.app_settings (
  id              boolean primary key default true,   -- single-row guard
  paywall_enabled boolean not null default false,
  updated_at      timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);

insert into public.app_settings (id, paywall_enabled)
  values (true, false)
  on conflict (id) do nothing;

alter table public.app_settings enable row level security;
-- No policies on purpose: only SECURITY DEFINER functions / the service role
-- can read or change the switch. The anon/authenticated client cannot.

-- Cheap boolean the RLS policy below calls on every curriculum read.
create or replace function public.is_paywall_on()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select paywall_enabled from public.app_settings where id), false);
$$;
grant execute on function public.is_paywall_on() to anon, authenticated;

-- Gate curriculum READS: wide open while the paywall is off; once it's on,
-- require a valid purchase (lifetime or active sub) or staff. Writes remain
-- admin-only (policies defined in 02/03 — left untouched here).
drop policy if exists "course_select_authenticated" on public.course_content;
create policy "course_select_authenticated" on public.course_content
  for select to authenticated
  using ( not public.is_paywall_on() or public.has_purchased() or public.is_staff() );


-- ── B. Leaderboard scope: non-staff with no manager → self only ──────
-- Identical to the 03 definition except the final ELSE branch, which used to
-- return every profile (the org-wide leak) and now returns just the caller.
create or replace function public.analytics_scope(p_manager uuid, p_user uuid)
returns table (user_id uuid)
language plpgsql security definer set search_path = public stable as $$
declare
  v_caller uuid := auth.uid();
  v_admin  boolean := exists (select 1 from public.app_admins where email = lower(auth.email()));
  v_role   text;
  v_mgr    uuid;
begin
  select p.role, p.manager_id into v_role, v_mgr
  from public.profiles p where p.id = v_caller;

  if v_admin then
    if p_user is not null then
      return query select p_user;
    elsif p_manager is not null then
      return query select p.id from public.profiles p
        where p.manager_id = p_manager or p.id = p_manager;
    else
      return query select p.id from public.profiles p;          -- admin: everyone
    end if;
  elsif v_role = 'Manager' then
    return query select p.id from public.profiles p
      where p.manager_id = v_caller or p.id = v_caller;          -- manager: own team
  elsif v_mgr is not null then
    return query select p.id from public.profiles p
      where p.manager_id = v_mgr or p.id = v_mgr;                -- agent: own team
  else
    return query select v_caller;                                -- no team: self only (was: everyone)
  end if;
end;
$$;
revoke all on function public.analytics_scope(uuid, uuid) from public, anon;
grant execute on function public.analytics_scope(uuid, uuid) to authenticated;

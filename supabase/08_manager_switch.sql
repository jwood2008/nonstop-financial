-- =====================================================================
-- NonStop Financial — 08 · Manager switching (analytics scope repair)
-- Run AFTER 07_security_paywall.sql. Idempotent — safe to re-run.
--
-- Nothing here changes the team model: manager_id on profiles is still the
-- single source of truth, and every team read (weekly training, team chat,
-- analytics, my_team) already resolves it live — so an agent who picks a new
-- manager in Settings moves teams immediately, with no admin step.
--
-- What this file fixes: 07 rewrote `analytics_scope` from the 03 version to
-- close the org-wide leak in its final ELSE branch, and in doing so dropped
-- the Manager drill-down that 05 had added. Result: a manager clicking one
-- member in "My Team" silently got the WHOLE team's numbers back while the UI
-- said they were looking at one person. This restores the drill-down on top of
-- 07's tightening — both behaviours in one definition.
--
--   admin   : p_user → that person · p_manager → that team · neither → all
--   manager : p_user → that member (own team only) · else → own team
--   agent   : their own team (via their manager) — params ignored
--   no team : themselves only
-- =====================================================================

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
      return query select p.id from public.profiles p;              -- admin: everyone
    end if;
  elsif v_role = 'Manager' then
    -- drill into ONE person, but only themselves or a member of their own
    -- team; anything else falls through to the whole team (05 behaviour)
    if p_user is not null and (
         p_user = v_caller
         or exists (select 1 from public.profiles p
                    where p.id = p_user and p.manager_id = v_caller)
       ) then
      return query select p_user;                                   -- manager: one member
    else
      return query select p.id from public.profiles p
        where p.manager_id = v_caller or p.id = v_caller;           -- manager: own team
    end if;
  elsif v_mgr is not null then
    return query select p.id from public.profiles p
      where p.manager_id = v_mgr or p.id = v_mgr;                   -- agent: own team
  else
    return query select v_caller;                                   -- no team: self only
  end if;
end;
$$;
revoke all on function public.analytics_scope(uuid, uuid) from public, anon;
grant execute on function public.analytics_scope(uuid, uuid) to authenticated;

-- Re-running 05 or 07 after this file reverts one half of the merge. This is
-- the definition that should be live.

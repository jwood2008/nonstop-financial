-- =====================================================================
-- NonStop Financial — "My Team" analytics for managers
-- Paste into the Supabase SQL Editor. Idempotent. Run AFTER teams.sql
-- and weekly-training.sql.
--
--  · analytics_scope now honors p_user for Managers when that user is on
--    their own team — so a manager can click one member and see that
--    person's individual analytics. (Previously p_user was admin-only
--    and silently ignored for managers; their scope was always the
--    whole team.) A manager still can NOT see anyone outside their team.
--  · my_team() — the caller's team list for the "My Team" panel.
--    Returns rows only when the caller's role is Manager.
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
      return query select p.id from public.profiles p;
    end if;
  elsif v_role = 'Manager' then
    -- a manager may drill into ONE person — but only themselves or
    -- a member of their own team
    if p_user is not null and (
         p_user = v_caller
         or exists (select 1 from public.profiles p
                    where p.id = p_user and p.manager_id = v_caller)
       ) then
      return query select p_user;
    else
      return query select p.id from public.profiles p
        where p.manager_id = v_caller or p.id = v_caller;
    end if;
  elsif v_mgr is not null then
    return query select p.id from public.profiles p
      where p.manager_id = v_mgr or p.id = v_mgr;
  else
    return query select p.id from public.profiles p;
  end if;
end;
$$;
revoke all on function public.analytics_scope(uuid, uuid) from public, anon;
grant execute on function public.analytics_scope(uuid, uuid) to authenticated;

-- ── the caller's team members (Manager only) ────────────────────────
create or replace function public.my_team()
returns table (id uuid, name text, email text, joined timestamptz)
language sql security definer set search_path = public stable as $$
  select p.id,
         coalesce(nullif(p.name, ''), split_part(coalesce(p.email, ''), '@', 1)) as name,
         p.email,
         p.created_at as joined
  from public.profiles p
  where p.manager_id = auth.uid()
    and exists (select 1 from public.profiles me
                where me.id = auth.uid() and me.role = 'Manager')
  order by 2;
$$;
revoke all on function public.my_team() from public, anon;
grant execute on function public.my_team() to authenticated;

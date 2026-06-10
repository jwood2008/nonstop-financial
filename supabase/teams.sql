-- =====================================================================
-- NonStop Financial — Teams (agents → managers) + scoped analytics
-- Paste into the Supabase SQL Editor. Idempotent. Run AFTER
-- analytics.sql (and it safely re-applies the hardening rules).
--
--  · profiles.manager_id — which Manager an agent reports to (picked
--    at signup by anyone with a NonStop email; editable in Settings)
--  · Managers calling the analytics functions are FORCED to their own
--    team's data in the database — the UI filter is just convenience.
--  · Admins can pass p_manager (a manager's user id) to see that
--    team, p_user (any user id) to see one person, or neither = all.
-- =====================================================================

-- ── team column ─────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists manager_id uuid references public.profiles (id) on delete set null;

create index if not exists profiles_manager_idx on public.profiles (manager_id);

-- ── managers list (signup form needs it pre-auth) ───────────────────
create or replace function public.list_managers()
returns table (id uuid, name text)
language sql security definer set search_path = public stable as $$
  select id,
         coalesce(nullif(name, ''), split_part(coalesce(email, ''), '@', 1)) as name
  from public.profiles
  where role = 'Manager'
  order by 2;
$$;
grant execute on function public.list_managers() to anon, authenticated;

-- ── signup trigger: store the chosen manager (+ birthdate) ──────────
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
      when lower(split_part(new.email, '@', 2)) = 'nonstopglobal.co' then 'Agent'
      else 'Lead'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── staff helper (same as analytics-hardening.sql, safe to re-run) ──
create or replace function public.is_staff()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.app_admins where email = lower(auth.email()))
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'Manager');
$$;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- ── who the caller is allowed to see ────────────────────────────────
-- admin   : p_user → that person · p_manager → that team · neither → all
-- Manager : always their own team (their agents + themselves)
-- agent   : their own team if they have a manager, else everyone
--           (only the leaderboard reaches this branch)
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
    return query select p.id from public.profiles p
      where p.manager_id = v_caller or p.id = v_caller;
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

-- ── analytics functions: new signatures with optional scope ─────────
-- (old 2-arg versions are dropped so PostgREST RPC stays unambiguous;
--  the app calls them with or without p_manager/p_user)

drop function if exists public.events_engagement(date, date);
create or replace function public.events_engagement(p_from date, p_to date, p_manager uuid default null, p_user uuid default null)
returns table (d date, active int, lessons int)
language plpgsql security definer set search_path = public as $$
declare v_from date;
begin
  if not public.is_staff() then return; end if;
  v_from := greatest(p_from, coalesce((select min(created_at)::date from public.events), p_to));
  return query
    with scope as (select user_id from public.analytics_scope(p_manager, p_user)),
    span as (
      select generate_series(v_from, p_to, interval '1 day')::date as d
    )
    select s.d,
           coalesce(count(distinct e.user_id), 0)::int,
           coalesce(count(*) filter (where e.type = 'lesson_complete'), 0)::int
    from span s
    left join public.events e
      on e.created_at::date = s.d
     and e.user_id in (select user_id from scope)
    group by s.d
    order by s.d;
end;
$$;
revoke all on function public.events_engagement(date, date, uuid, uuid) from public, anon;
grant execute on function public.events_engagement(date, date, uuid, uuid) to authenticated;

drop function if exists public.events_active_hours(date, date);
create or replace function public.events_active_hours(p_from date, p_to date, p_manager uuid default null, p_user uuid default null)
returns table (dow int, bucket int, n int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then return; end if;
  return query
    select extract(dow from e.created_at)::int,
           (extract(hour from e.created_at)::int / 2)::int,
           count(*)::int
    from public.events e
    where e.created_at::date between p_from and p_to
      and e.user_id in (select user_id from public.analytics_scope(p_manager, p_user))
    group by 1, 2;
end;
$$;
revoke all on function public.events_active_hours(date, date, uuid, uuid) from public, anon;
grant execute on function public.events_active_hours(date, date, uuid, uuid) to authenticated;

drop function if exists public.top_content(date, date);
create or replace function public.top_content(p_from date, p_to date, p_manager uuid default null, p_user uuid default null)
returns table (ref text, views int, completes int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then return; end if;
  return query
    select e.ref,
           count(distinct e.user_id) filter (where e.type = 'lesson_view')::int,
           count(distinct e.user_id) filter (where e.type = 'lesson_complete')::int
    from public.events e
    where e.ref is not null
      and e.type in ('lesson_view', 'lesson_complete')
      and e.created_at::date between p_from and p_to
      and e.user_id in (select user_id from public.analytics_scope(p_manager, p_user))
    group by e.ref
    order by 2 desc, 3 desc
    limit 20;
end;
$$;
revoke all on function public.top_content(date, date, uuid, uuid) from public, anon;
grant execute on function public.top_content(date, date, uuid, uuid) to authenticated;

drop function if exists public.leaderboard(date, date);
create or replace function public.leaderboard(p_from date, p_to date, p_manager uuid default null, p_user uuid default null)
returns table (name text, completed int, passes int, active_days int)
language plpgsql security definer set search_path = public as $$
begin
  -- any signed-in user; scope rules decide whose rows they see
  return query
    select coalesce(nullif(p.name, ''), split_part(coalesce(p.email, ''), '@', 1)) as name,
           count(*) filter (where e.type = 'lesson_complete')::int as completed,
           count(distinct e.ref) filter (where e.type = 'quiz_attempt' and e.amount >= 80)::int as passes,
           count(distinct e.created_at::date)::int as active_days
    from public.profiles p
    join public.events e on e.user_id = p.id
    where e.created_at::date between p_from and p_to
      and p.id in (select user_id from public.analytics_scope(p_manager, p_user))
    group by p.id, p.name, p.email
    having count(*) filter (where e.type = 'lesson_complete') > 0
    order by completed desc, passes desc
    limit 20;
end;
$$;
revoke all on function public.leaderboard(date, date, uuid, uuid) from public, anon;
grant execute on function public.leaderboard(date, date, uuid, uuid) to authenticated;

drop function if exists public.age_distribution(date, date);
create or replace function public.age_distribution(p_from date, p_to date, p_manager uuid default null, p_user uuid default null)
returns table (label text, value int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then return; end if;
  return query
    with buckets as (
      select case
        when p.age is null or p.age <= 18 then '18 & under'
        when p.age <= 24 then '18–24'
        when p.age <= 34 then '25–34'
        when p.age <= 44 then '35–44'
        else '45+'
      end as label
      from public.profiles p
      where p.created_at::date between p_from and p_to
        and p.id in (select user_id from public.analytics_scope(p_manager, p_user))
    ),
    counts as (select buckets.label, count(*)::int as n from buckets group by buckets.label),
    tot as (select greatest(sum(n), 1) as t from counts)
    select c.label, round(c.n * 100.0 / t.t)::int
    from counts c, tot t
    order by array_position(array['18 & under','18–24','25–34','35–44','45+'], c.label);
end;
$$;
revoke all on function public.age_distribution(date, date, uuid, uuid) from public, anon;
grant execute on function public.age_distribution(date, date, uuid, uuid) to authenticated;

drop function if exists public.analytics_kpis(date, date);
create or replace function public.analytics_kpis(p_from date, p_to date, p_manager uuid default null, p_user uuid default null)
returns table (key text, label text, value numeric, suffix text, delta numeric, series numeric[])
language plpgsql security definer set search_path = public as $$
declare
  v_from date;
  v_len  int;
  v_pf   date;
  v_pt   date;
begin
  if not public.is_staff() then return; end if;

  v_from := greatest(p_from, coalesce(
    least((select min(created_at)::date from public.events),
          (select min(created_at)::date from public.profiles)),
    p_to));
  v_len := (p_to - v_from + 1);
  v_pf  := v_from - v_len;
  v_pt  := v_from - 1;

  return query
  with scope as (select user_id from public.analytics_scope(p_manager, p_user)),
  span as (
    select generate_series(v_from, p_to, interval '1 day')::date as d
  ),
  daily as (
    select s.d,
      count(distinct (ev.user_id, ev.ref)) filter (where ev.type = 'lesson_view')     as views,
      count(distinct (ev.user_id, ev.ref)) filter (where ev.type = 'lesson_complete') as completes,
      count(ev.*) filter (where ev.type = 'quiz_attempt')    as quizzes,
      count(distinct ev.user_id)                             as actives
    from span s
    left join public.events ev
      on ev.created_at::date = s.d
     and ev.user_id in (select user_id from scope)
    group by s.d
  ),
  newd as (
    select s.d, count(p.id) as new_members
    from span s
    left join public.profiles p
      on p.created_at::date = s.d
     and p.id in (select user_id from scope)
    group by s.d
  ),
  cur as (
    select
      coalesce(sum(views),0) as views, coalesce(sum(completes),0) as completes,
      coalesce(sum(quizzes),0) as quizzes, array_agg(views::numeric order by d) as views_s,
      array_agg(completes::numeric order by d) as completes_s,
      array_agg(quizzes::numeric order by d) as quizzes_s,
      array_agg(actives::numeric order by d) as actives_s
    from daily
  ),
  prev as (
    select
      count(distinct (user_id, ref)) filter (where type='lesson_view') as views,
      count(distinct (user_id, ref)) filter (where type='lesson_complete') as completes,
      count(*) filter (where type='quiz_attempt') as quizzes
    from public.events
    where created_at::date between v_pf and v_pt
      and user_id in (select user_id from scope)
  ),
  cact as (
    select
      count(distinct user_id) filter (where created_at::date between v_from and p_to) as a_cur,
      count(distinct user_id) filter (where created_at::date between v_pf and v_pt)   as a_prev
    from public.events
    where created_at::date between v_pf and p_to
      and user_id in (select user_id from scope)
  ),
  passes as (
    select
      count(*) filter (where type='quiz_attempt' and created_at::date between v_from and p_to) as q_cur,
      count(*) filter (where type='quiz_attempt' and amount>=80 and created_at::date between v_from and p_to) as p_cur,
      count(*) filter (where type='quiz_attempt' and created_at::date between v_pf and v_pt) as q_prev,
      count(*) filter (where type='quiz_attempt' and amount>=80 and created_at::date between v_pf and v_pt) as p_prev
    from public.events
    where created_at::date between v_pf and p_to
      and user_id in (select user_id from scope)
  ),
  mem as (
    select (select count(*) from public.profiles where id in (select user_id from scope))::numeric as total,
           array_agg(new_members::numeric order by d) as new_s,
           sum(new_members) as new_cur
    from newd
  )
  select 'active','Active', cact.a_cur::numeric, '',
         (case when cact.a_prev>0 then round((cact.a_cur-cact.a_prev)*100.0/cact.a_prev) else 0 end)::numeric,
         cur.actives_s
    from cact, cur
  union all
  select 'views','Lesson Views', cur.views::numeric, '',
         (case when prev.views>0 then round((cur.views-prev.views)*100.0/prev.views) else 0 end)::numeric,
         cur.views_s from cur, prev
  union all
  select 'completes','Lessons Done', cur.completes::numeric, '',
         (case when prev.completes>0 then round((cur.completes-prev.completes)*100.0/prev.completes) else 0 end)::numeric,
         cur.completes_s from cur, prev
  union all
  select 'quizzes','Quiz Attempts', cur.quizzes::numeric, '',
         (case when prev.quizzes>0 then round((cur.quizzes-prev.quizzes)*100.0/prev.quizzes) else 0 end)::numeric,
         cur.quizzes_s from cur, prev
  union all
  select 'pass_rate','Quiz Pass Rate',
         (case when passes.q_cur>0 then round(passes.p_cur*100.0/passes.q_cur) else 0 end)::numeric, '%',
         (case when passes.q_cur>0 and passes.q_prev>0
               then round(passes.p_cur*100.0/passes.q_cur) - round(passes.p_prev*100.0/passes.q_prev) else 0 end)::numeric,
         cur.quizzes_s from passes, cur
  union all
  select 'members','New Members', mem.new_cur::numeric, '',
         0::numeric, mem.new_s from mem;
end;
$$;
revoke all on function public.analytics_kpis(date, date, uuid, uuid) from public, anon;
grant execute on function public.analytics_kpis(date, date, uuid, uuid) to authenticated;

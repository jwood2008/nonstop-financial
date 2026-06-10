-- =====================================================================
-- NonStop Financial — Analytics hardening (run AFTER analytics.sql)
-- Paste into the Supabase SQL Editor. Idempotent.
--
-- Fixes:
--  1. Analytics functions were executable by `anon` — anyone with the
--     public URL + anon key could pull the leaderboard (real names),
--     KPIs, and audience data without logging in. All anon grants are
--     revoked.
--  2. Staff gating: KPIs / engagement / active hours / top content /
--     age distribution now return rows only for staff (team admins or
--     Managers) — matching the app's `canManage` gate, but enforced in
--     the database instead of only in the UI.
--     The leaderboard stays available to any signed-in user (the
--     dashboard widget shows it to the whole team).
--  3. "All time" ranges: p_from is clamped to the earliest recorded
--     event, so a 1970-01-01 request no longer generates a ~20,000-day
--     series per KPI.
--  4. analytics_kpis' previous-period scans are date-bounded instead of
--     scanning the whole events table.
-- =====================================================================

-- Staff = team admin (any tier) OR a Manager position.
create or replace function public.is_staff()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.app_admins where email = lower(auth.email()))
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'Manager');
$$;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- ── engagement (staff only, clamped range) ──────────────────────────
create or replace function public.events_engagement(p_from date, p_to date)
returns table (d date, active int, lessons int)
language plpgsql security definer set search_path = public as $$
declare v_from date;
begin
  if not public.is_staff() then return; end if;
  v_from := greatest(p_from, coalesce((select min(created_at)::date from public.events), p_to));
  return query
    with span as (
      select generate_series(v_from, p_to, interval '1 day')::date as d
    )
    select s.d,
           coalesce(count(distinct e.user_id), 0)::int,
           coalesce(count(*) filter (where e.type = 'lesson_complete'), 0)::int
    from span s
    left join public.events e on e.created_at::date = s.d
    group by s.d
    order by s.d;
end;
$$;
revoke all on function public.events_engagement(date, date) from public, anon;
grant execute on function public.events_engagement(date, date) to authenticated;

-- ── active hours (staff only) ───────────────────────────────────────
create or replace function public.events_active_hours(p_from date, p_to date)
returns table (dow int, bucket int, n int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then return; end if;
  return query
    select extract(dow from created_at)::int,
           (extract(hour from created_at)::int / 2)::int,
           count(*)::int
    from public.events
    where created_at::date between p_from and p_to
    group by 1, 2;
end;
$$;
revoke all on function public.events_active_hours(date, date) from public, anon;
grant execute on function public.events_active_hours(date, date) to authenticated;

-- ── top content (staff only) ────────────────────────────────────────
create or replace function public.top_content(p_from date, p_to date)
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
    group by e.ref
    order by 2 desc, 3 desc
    limit 20;
end;
$$;
revoke all on function public.top_content(date, date) from public, anon;
grant execute on function public.top_content(date, date) to authenticated;

-- ── leaderboard (any signed-in user — powers the dashboard widget) ──
-- (definition unchanged from analytics.sql; just drop the anon grant)
revoke all on function public.leaderboard(date, date) from public, anon;
grant execute on function public.leaderboard(date, date) to authenticated;

-- ── age distribution (staff only) ───────────────────────────────────
create or replace function public.age_distribution(p_from date, p_to date)
returns table (label text, value int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then return; end if;
  return query
    with buckets as (
      select case
        when age is null or age <= 18 then '18 & under'
        when age <= 24 then '18–24'
        when age <= 34 then '25–34'
        when age <= 44 then '35–44'
        else '45+'
      end as label
      from public.profiles
      where created_at::date between p_from and p_to
    ),
    counts as (select buckets.label, count(*)::int as n from buckets group by buckets.label),
    tot as (select greatest(sum(n), 1) as t from counts)
    select c.label, round(c.n * 100.0 / t.t)::int
    from counts c, tot t
    order by array_position(array['18 & under','18–24','25–34','35–44','45+'], c.label);
end;
$$;
revoke all on function public.age_distribution(date, date) from public, anon;
grant execute on function public.age_distribution(date, date) to authenticated;

-- ── KPI strip (staff only, clamped + bounded scans) ─────────────────
create or replace function public.analytics_kpis(p_from date, p_to date)
returns table (key text, label text, value numeric, suffix text, delta numeric, series numeric[])
language plpgsql security definer set search_path = public as $$
declare
  v_from date;
  v_len  int;
  v_pf   date;
  v_pt   date;
begin
  if not public.is_staff() then return; end if;

  -- clamp "all time" to the first day we actually have data
  v_from := greatest(p_from, coalesce(
    least((select min(created_at)::date from public.events),
          (select min(created_at)::date from public.profiles)),
    p_to));
  v_len := (p_to - v_from + 1);
  v_pf  := v_from - v_len;
  v_pt  := v_from - 1;

  return query
  with span as (
    select generate_series(v_from, p_to, interval '1 day')::date as d
  ),
  daily as (
    select s.d,
      count(distinct (ev.user_id, ev.ref)) filter (where ev.type = 'lesson_view')     as views,
      count(distinct (ev.user_id, ev.ref)) filter (where ev.type = 'lesson_complete') as completes,
      count(ev.*) filter (where ev.type = 'quiz_attempt')    as quizzes,
      count(distinct ev.user_id)                             as actives
    from span s left join public.events ev on ev.created_at::date = s.d
    group by s.d
  ),
  newd as (
    select s.d, count(p.id) as new_members
    from span s left join public.profiles p on p.created_at::date = s.d
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
  ),
  cact as (
    select
      count(distinct user_id) filter (where created_at::date between v_from and p_to) as a_cur,
      count(distinct user_id) filter (where created_at::date between v_pf and v_pt)   as a_prev
    from public.events
    where created_at::date between v_pf and p_to
  ),
  passes as (
    select
      count(*) filter (where type='quiz_attempt' and created_at::date between v_from and p_to) as q_cur,
      count(*) filter (where type='quiz_attempt' and amount>=80 and created_at::date between v_from and p_to) as p_cur,
      count(*) filter (where type='quiz_attempt' and created_at::date between v_pf and v_pt) as q_prev,
      count(*) filter (where type='quiz_attempt' and amount>=80 and created_at::date between v_pf and v_pt) as p_prev
    from public.events
    where created_at::date between v_pf and p_to
  ),
  mem as (
    select (select count(*) from public.profiles)::numeric as total,
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
revoke all on function public.analytics_kpis(date, date) from public, anon;
grant execute on function public.analytics_kpis(date, date) to authenticated;

-- ── misc anon revokes (none of these are called pre-login) ──────────
revoke execute on function public.my_admin_status() from anon;
revoke execute on function public.is_owner() from anon;
revoke execute on function public.has_purchased() from anon;

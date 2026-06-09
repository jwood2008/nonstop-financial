-- =====================================================================
-- NonStop Financial — Analytics events (Phases 1–3)
-- Run in the Supabase SQL Editor after schema.sql. Idempotent.
--
-- The app records lightweight activity events (lesson_complete, quiz_attempt,
-- lesson_view). SECURITY DEFINER functions aggregate them for the analytics
-- widgets — they return only anonymous counts, never per-user rows.
--
-- Phase 3: every function takes a [p_from, p_to] date window so the page can
-- filter by range and compare periods ("last week vs this week").
-- =====================================================================

create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type       text not null,
  ref        text,
  amount     numeric,
  created_at timestamptz not null default now()
);

create index if not exists events_created_idx on public.events (created_at);
create index if not exists events_type_idx    on public.events (type);
create index if not exists events_user_idx     on public.events (user_id);

alter table public.events enable row level security;

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events
  for insert with check (user_id = auth.uid());

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own" on public.events
  for select using (user_id = auth.uid());

-- Drop prior (un-parameterized) signatures so re-running is clean.
drop function if exists public.events_engagement(int);
drop function if exists public.events_active_hours();
drop function if exists public.top_content();
drop function if exists public.leaderboard();
drop function if exists public.analytics_kpis();
drop function if exists public.age_distribution();

-- Engagement: active users + lesson completions per day across the window.
create or replace function public.events_engagement(p_from date, p_to date)
returns table (d date, active int, lessons int)
language sql security definer set search_path = public as $$
  with span as (
    select generate_series(p_from, p_to, interval '1 day')::date as d
  )
  select s.d,
         coalesce(count(distinct e.user_id), 0)::int as active,
         coalesce(count(*) filter (where e.type = 'lesson_complete'), 0)::int as lessons
  from span s
  left join public.events e on e.created_at::date = s.d
  group by s.d
  order by s.d;
$$;
grant execute on function public.events_engagement(date, date) to authenticated, anon;

-- Most active hours within the window (weekday 0=Sun..6=Sat, 2-hour buckets).
create or replace function public.events_active_hours(p_from date, p_to date)
returns table (dow int, bucket int, n int)
language sql security definer set search_path = public as $$
  select extract(dow from created_at)::int as dow,
         (extract(hour from created_at)::int / 2)::int as bucket,
         count(*)::int as n
  from public.events
  where created_at::date between p_from and p_to
  group by 1, 2;
$$;
grant execute on function public.events_active_hours(date, date) to authenticated, anon;

-- Top content: views + completions per lesson in the window.
create or replace function public.top_content(p_from date, p_to date)
returns table (ref text, views int, completes int)
language sql security definer set search_path = public as $$
  -- unique viewers / completers per lesson (each user counted once), so
  -- completion can't exceed 100%
  select ref,
         count(distinct user_id) filter (where type = 'lesson_view')::int     as views,
         count(distinct user_id) filter (where type = 'lesson_complete')::int as completes
  from public.events
  where ref is not null
    and type in ('lesson_view', 'lesson_complete')
    and created_at::date between p_from and p_to
  group by ref
  order by views desc, completes desc
  limit 20;
$$;
grant execute on function public.top_content(date, date) to authenticated, anon;

-- Team leaderboard for the window: completions, quiz passes, days active.
create or replace function public.leaderboard(p_from date, p_to date)
returns table (name text, completed int, passes int, active_days int)
language sql security definer set search_path = public as $$
  select coalesce(nullif(p.name, ''), split_part(coalesce(p.email, ''), '@', 1)) as name,
         count(*) filter (where e.type = 'lesson_complete')::int as completed,
         count(distinct e.ref) filter (where e.type = 'quiz_attempt' and e.amount >= 80)::int as passes,
         count(distinct e.created_at::date)::int as active_days
  from public.profiles p
  join public.events e on e.user_id = p.id
  where e.created_at::date between p_from and p_to
  group by p.id, p.name, p.email
  having count(*) filter (where e.type = 'lesson_complete') > 0
  order by completed desc, passes desc
  limit 20;
$$;
grant execute on function public.leaderboard(date, date) to authenticated, anon;

-- Audience age distribution for signups in the window (all-time if range is wide).
create or replace function public.age_distribution(p_from date, p_to date)
returns table (label text, value int)
language sql security definer set search_path = public as $$
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
  counts as (select label, count(*)::int as n from buckets group by label),
  tot as (select greatest(sum(n), 1) as t from counts)
  select c.label, round(c.n * 100.0 / t.t)::int as value
  from counts c, tot t
  order by array_position(array['18 & under','18–24','25–34','35–44','45+'], c.label);
$$;
grant execute on function public.age_distribution(date, date) to authenticated, anon;

-- KPI strip: value over the window, delta vs the immediately-preceding window
-- of equal length, and a daily sparkline series across the window.
create or replace function public.analytics_kpis(p_from date, p_to date)
returns table (key text, label text, value numeric, suffix text, delta numeric, series numeric[])
language sql security definer set search_path = public as $$
  with bounds as (
    select p_from as f, p_to as t,
           (p_to - p_from + 1) as len,
           (p_from - (p_to - p_from + 1)) as pf,   -- previous window from
           (p_from - 1) as pt                       -- previous window to
  ),
  span as (
    select generate_series((select f from bounds), (select t from bounds), interval '1 day')::date as d
  ),
  daily as (
    select s.d,
      -- count each user once per lesson per day (a rewatch isn't a new view)
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
    from public.events, bounds
    where created_at::date between bounds.pf and bounds.pt
  ),
  cact as (
    select
      count(distinct user_id) filter (where created_at::date between (select f from bounds) and (select t from bounds)) as a_cur,
      count(distinct user_id) filter (where created_at::date between (select pf from bounds) and (select pt from bounds)) as a_prev
    from public.events
  ),
  passes as (
    select
      count(*) filter (where type='quiz_attempt' and created_at::date between (select f from bounds) and (select t from bounds)) as q_cur,
      count(*) filter (where type='quiz_attempt' and amount>=80 and created_at::date between (select f from bounds) and (select t from bounds)) as p_cur,
      count(*) filter (where type='quiz_attempt' and created_at::date between (select pf from bounds) and (select pt from bounds)) as q_prev,
      count(*) filter (where type='quiz_attempt' and amount>=80 and created_at::date between (select pf from bounds) and (select pt from bounds)) as p_prev
    from public.events
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
$$;
grant execute on function public.analytics_kpis(date, date) to authenticated, anon;

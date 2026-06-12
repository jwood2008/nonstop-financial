# Tab 4 — Weekly Training + team chat

Paste LAST, after Tab 3. Idempotent — safe to re-run.

Same as: `weekly-training.sql`

- `team_training` — one weekly program per manager (Week 1..N)
- `team_messages` — team chat; manager/admin posts can be pinned as UPDATEs
- Analytics functions gain `p_source` ('all' | 'course' | 'weekly')

```sql
-- =====================================================================
-- NonStop Financial — Weekly Training + team chat
-- Paste into the Supabase SQL Editor. Idempotent.
-- Run AFTER teams.sql and admin-only-content.sql.
--
--  · team_training  — one weekly program per manager (weeks of lessons,
--    same shape as the course so the same editor/quizzes work).
--    Team members read it; only that manager (or an admin) writes it.
--  · team_messages  — team chat. Anyone on a manager's team can post;
--    the manager (or an admin) can flag a message as an UPDATE, which
--    pins it in the Weekly Training tab.
--  · Analytics functions gain p_source: weekly-training lesson/quiz ids
--    are prefixed 'wt-', so 'course' | 'weekly' | 'all' can be split.
-- =====================================================================

-- ── team membership helper ──────────────────────────────────────────
create or replace function public.is_team_member(t uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin()
      or auth.uid() = t
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.manager_id = t);
$$;
revoke all on function public.is_team_member(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;

-- ── weekly training content (per manager) ───────────────────────────
create table if not exists public.team_training (
  manager_id uuid primary key references public.profiles (id) on delete cascade,
  content    jsonb not null default '{"modules": []}'::jsonb, -- weeks as "modules"
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.team_training enable row level security;

drop policy if exists "training_select_team" on public.team_training;
create policy "training_select_team" on public.team_training
  for select to authenticated using (public.is_team_member(manager_id));

drop policy if exists "training_insert_owner" on public.team_training;
create policy "training_insert_owner" on public.team_training
  for insert to authenticated
  with check (auth.uid() = manager_id or public.is_admin());

drop policy if exists "training_update_owner" on public.team_training;
create policy "training_update_owner" on public.team_training
  for update to authenticated
  using (auth.uid() = manager_id or public.is_admin())
  with check (auth.uid() = manager_id or public.is_admin());

drop trigger if exists team_training_touch on public.team_training;
create trigger team_training_touch before update on public.team_training
  for each row execute function public.touch_updated_at();

-- ── team chat ────────────────────────────────────────────────────────
create table if not exists public.team_messages (
  id         bigint generated always as identity primary key,
  team_id    uuid not null references public.profiles (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  is_update  boolean not null default false, -- manager announcements (pinned)
  created_at timestamptz not null default now()
);

create index if not exists team_messages_team_idx on public.team_messages (team_id, created_at desc);

alter table public.team_messages enable row level security;

drop policy if exists "messages_select_team" on public.team_messages;
create policy "messages_select_team" on public.team_messages
  for select to authenticated using (public.is_team_member(team_id));

drop policy if exists "messages_insert_team" on public.team_messages;
create policy "messages_insert_team" on public.team_messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_team_member(team_id)
    -- only the team's manager (or an admin) can post pinned updates
    and (not is_update or auth.uid() = team_id or public.is_admin())
  );

-- ── analytics: add p_source ('all' | 'course' | 'weekly') ───────────
-- Weekly lesson & quiz ids start with 'wt-'; the course's never do.

drop function if exists public.events_engagement(date, date, uuid, uuid);
create or replace function public.events_engagement(p_from date, p_to date, p_manager uuid default null, p_user uuid default null, p_source text default 'all')
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
     and (p_source = 'all'
          or (p_source = 'weekly' and e.ref like 'wt-%')
          or (p_source = 'course' and (e.ref is null or e.ref not like 'wt-%')))
    group by s.d
    order by s.d;
end;
$$;
revoke all on function public.events_engagement(date, date, uuid, uuid, text) from public, anon;
grant execute on function public.events_engagement(date, date, uuid, uuid, text) to authenticated;

drop function if exists public.events_active_hours(date, date, uuid, uuid);
create or replace function public.events_active_hours(p_from date, p_to date, p_manager uuid default null, p_user uuid default null, p_source text default 'all')
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
      and (p_source = 'all'
           or (p_source = 'weekly' and e.ref like 'wt-%')
           or (p_source = 'course' and (e.ref is null or e.ref not like 'wt-%')))
    group by 1, 2;
end;
$$;
revoke all on function public.events_active_hours(date, date, uuid, uuid, text) from public, anon;
grant execute on function public.events_active_hours(date, date, uuid, uuid, text) to authenticated;

drop function if exists public.top_content(date, date, uuid, uuid);
create or replace function public.top_content(p_from date, p_to date, p_manager uuid default null, p_user uuid default null, p_source text default 'all')
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
      and (p_source = 'all'
           or (p_source = 'weekly' and e.ref like 'wt-%')
           or (p_source = 'course' and e.ref not like 'wt-%'))
    group by e.ref
    order by 2 desc, 3 desc
    limit 20;
end;
$$;
revoke all on function public.top_content(date, date, uuid, uuid, text) from public, anon;
grant execute on function public.top_content(date, date, uuid, uuid, text) to authenticated;

drop function if exists public.leaderboard(date, date, uuid, uuid);
create or replace function public.leaderboard(p_from date, p_to date, p_manager uuid default null, p_user uuid default null, p_source text default 'all')
returns table (name text, completed int, passes int, active_days int)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select coalesce(nullif(p.name, ''), split_part(coalesce(p.email, ''), '@', 1)) as name,
           count(*) filter (where e.type = 'lesson_complete')::int as completed,
           count(distinct e.ref) filter (where e.type = 'quiz_attempt' and e.amount >= 80)::int as passes,
           count(distinct e.created_at::date)::int as active_days
    from public.profiles p
    join public.events e on e.user_id = p.id
    where e.created_at::date between p_from and p_to
      and p.id in (select user_id from public.analytics_scope(p_manager, p_user))
      and (p_source = 'all'
           or (p_source = 'weekly' and e.ref like 'wt-%')
           or (p_source = 'course' and (e.ref is null or e.ref not like 'wt-%')))
    group by p.id, p.name, p.email
    having count(*) filter (where e.type = 'lesson_complete') > 0
    order by completed desc, passes desc
    limit 20;
end;
$$;
revoke all on function public.leaderboard(date, date, uuid, uuid, text) from public, anon;
grant execute on function public.leaderboard(date, date, uuid, uuid, text) to authenticated;

drop function if exists public.analytics_kpis(date, date, uuid, uuid);
create or replace function public.analytics_kpis(p_from date, p_to date, p_manager uuid default null, p_user uuid default null, p_source text default 'all')
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
  ev as (
    -- one source-filtered, scope-filtered view of events for every branch
    select * from public.events
    where user_id in (select user_id from scope)
      and (p_source = 'all'
           or (p_source = 'weekly' and ref like 'wt-%')
           or (p_source = 'course' and (ref is null or ref not like 'wt-%')))
  ),
  span as (
    select generate_series(v_from, p_to, interval '1 day')::date as d
  ),
  daily as (
    select s.d,
      count(distinct (e.user_id, e.ref)) filter (where e.type = 'lesson_view')     as views,
      count(distinct (e.user_id, e.ref)) filter (where e.type = 'lesson_complete') as completes,
      count(e.*) filter (where e.type = 'quiz_attempt')    as quizzes,
      count(distinct e.user_id)                            as actives
    from span s left join ev e on e.created_at::date = s.d
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
    from ev
    where created_at::date between v_pf and v_pt
  ),
  cact as (
    select
      count(distinct user_id) filter (where created_at::date between v_from and p_to) as a_cur,
      count(distinct user_id) filter (where created_at::date between v_pf and v_pt)   as a_prev
    from ev
    where created_at::date between v_pf and p_to
  ),
  passes as (
    select
      count(*) filter (where type='quiz_attempt' and created_at::date between v_from and p_to) as q_cur,
      count(*) filter (where type='quiz_attempt' and amount>=80 and created_at::date between v_from and p_to) as p_cur,
      count(*) filter (where type='quiz_attempt' and created_at::date between v_pf and v_pt) as q_prev,
      count(*) filter (where type='quiz_attempt' and amount>=80 and created_at::date between v_pf and v_pt) as p_prev
    from ev
    where created_at::date between v_pf and p_to
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
revoke all on function public.analytics_kpis(date, date, uuid, uuid, text) from public, anon;
grant execute on function public.analytics_kpis(date, date, uuid, uuid, text) to authenticated;

-- age_distribution is profile-based (no event source) — unchanged.
```

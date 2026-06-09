-- =====================================================================
-- NonStop Financial — Analytics events (Phase 1)
-- Run in the Supabase SQL Editor after schema.sql. Idempotent.
--
-- The app records lightweight activity events (lesson_complete, quiz_attempt,
-- …). SECURITY DEFINER functions aggregate them for the analytics widgets —
-- they return only anonymous counts, never per-user rows.
-- =====================================================================

create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type       text not null,          -- 'lesson_complete' | 'quiz_attempt' | …
  ref        text,                   -- lesson/block id the event refers to
  amount     numeric,                -- optional value (e.g. quiz %)
  created_at timestamptz not null default now()
);

create index if not exists events_created_idx on public.events (created_at);
create index if not exists events_type_idx    on public.events (type);
create index if not exists events_user_idx     on public.events (user_id);

alter table public.events enable row level security;

-- Users may only write/read their own events; aggregates go through the
-- SECURITY DEFINER functions below.
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events
  for insert with check (user_id = auth.uid());

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own" on public.events
  for select using (user_id = auth.uid());

-- Engagement: active users + lesson completions per day for the last N days
-- (one row per day, zero-filled so the chart never has gaps).
create or replace function public.events_engagement(days int default 14)
returns table (d date, active int, lessons int)
language sql security definer set search_path = public as $$
  with span as (
    select generate_series(current_date - (days - 1), current_date, interval '1 day')::date as d
  )
  select s.d,
         coalesce(count(distinct e.user_id), 0)::int as active,
         coalesce(count(*) filter (where e.type = 'lesson_complete'), 0)::int as lessons
  from span s
  left join public.events e on e.created_at::date = s.d
  group by s.d
  order by s.d;
$$;
grant execute on function public.events_engagement(int) to authenticated, anon;

-- Most active hours: counts bucketed by weekday (0=Sun..6=Sat) and 2-hour slot.
create or replace function public.events_active_hours()
returns table (dow int, bucket int, n int)
language sql security definer set search_path = public as $$
  select extract(dow from created_at)::int as dow,
         (extract(hour from created_at)::int / 2)::int as bucket,
         count(*)::int as n
  from public.events
  group by 1, 2;
$$;
grant execute on function public.events_active_hours() to authenticated, anon;

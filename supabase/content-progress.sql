-- =====================================================================
-- NonStop Financial — Shared curriculum + cross-device progress
-- Paste into the Supabase SQL Editor. Idempotent.
--
-- Before this migration, curriculum edits and lesson progress lived only
-- in each browser's localStorage: an admin editing content changed no one
-- else's view, and a user's progress vanished on a new device.
--
--  course_content : one row per course id — the published curriculum
--                   (whole Course object as jsonb). Staff write, all
--                   signed-in users read. The app saves automatically
--                   ~1s after an admin edit.
--  user_progress  : one row per user — completed lessons, video watch
--                   fractions, quiz attempts, notes. Owner-only.
--
-- Note: lessons with large uploaded media (data-URLs) can exceed request
-- limits; the app skips auto-sync above ~5 MB of course JSON and logs a
-- warning. Long-term fix: move uploads to Supabase Storage.
-- =====================================================================

-- Staff helper (same as analytics-hardening.sql — safe to re-run)
create or replace function public.is_staff()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.app_admins where email = lower(auth.email()))
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'Manager');
$$;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- ── published curriculum ────────────────────────────────────────────
create table if not exists public.course_content (
  id         text primary key,          -- Course.id (curriculum version key)
  content    jsonb not null,            -- the whole Course object
  updated_by text,                      -- email of the admin who last saved
  updated_at timestamptz not null default now()
);

alter table public.course_content enable row level security;

drop policy if exists "course_select_authenticated" on public.course_content;
create policy "course_select_authenticated" on public.course_content
  for select to authenticated using (true);

drop policy if exists "course_insert_staff" on public.course_content;
create policy "course_insert_staff" on public.course_content
  for insert to authenticated with check (public.is_staff());

drop policy if exists "course_update_staff" on public.course_content;
create policy "course_update_staff" on public.course_content
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop trigger if exists course_content_touch on public.course_content;
create trigger course_content_touch before update on public.course_content
  for each row execute function public.touch_updated_at();

-- ── per-user progress ───────────────────────────────────────────────
create table if not exists public.user_progress (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  completed      jsonb not null default '[]'::jsonb,  -- lessonId[]
  video_progress jsonb not null default '{}'::jsonb,  -- { blockId: fraction 0..1 }
  quiz_results   jsonb not null default '{}'::jsonb,  -- { blockId: QuizAttempt[] }
  notes          jsonb not null default '{}'::jsonb,  -- { lessonId: text }
  updated_at     timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists "progress_select_own" on public.user_progress;
create policy "progress_select_own" on public.user_progress
  for select using (user_id = auth.uid());

drop policy if exists "progress_insert_own" on public.user_progress;
create policy "progress_insert_own" on public.user_progress
  for insert with check (user_id = auth.uid());

drop policy if exists "progress_update_own" on public.user_progress;
create policy "progress_update_own" on public.user_progress
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists user_progress_touch on public.user_progress;
create trigger user_progress_touch before update on public.user_progress
  for each row execute function public.touch_updated_at();

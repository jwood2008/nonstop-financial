-- =====================================================================
-- NonStop Financial — content editing is ADMIN-only
-- Paste into the Supabase SQL Editor. Idempotent. Run AFTER teams.sql.
--
-- Managers are analytics-only: they keep their team's analytics but can
-- no longer write course content or spotlights (course_content table).
-- =====================================================================

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.app_admins where email = lower(auth.email()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "course_insert_staff" on public.course_content;
create policy "course_insert_staff" on public.course_content
  for insert to authenticated with check (public.is_admin());

drop policy if exists "course_update_staff" on public.course_content;
create policy "course_update_staff" on public.course_content
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

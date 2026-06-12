# Tab 6 — Free-access email list (agency people without NonStop emails)

Paste after Tab 3. Idempotent — safe to re-run.

Same as: `supabase/free-emails.sql`

- `free_emails` table — emails on it skip payment at signup entirely
  (same flow as a NonStop email: instant account, confirmation email,
  manager picker, role 'Agent')
- `is_free_email()` — the yes/no check the signup form uses
- `add_free_email()` / `remove_free_email()` / `list_free_emails()` — admin-only
- Updates the signup trigger so free-listed people land as Agents

To add people (SQL Editor, as an admin — or just edit the `free_emails`
table in the Table Editor):

    select public.add_free_email('person@gmail.com');

```sql
-- =====================================================================
-- NonStop Financial — Free-access email list
-- Paste into the Supabase SQL Editor. Idempotent. Run AFTER single-role.sql.
--
-- Agency people without an @nonstopglobal.co address still get free
-- access: put their email on this list and signup skips payment for
-- them entirely (same flow as a NonStop email — account on click,
-- confirmation email, manager picker, role 'Agent').
--
--  · free_emails       — the list (no direct table access; use the
--                        functions or the Table Editor)
--  · is_free_email()   — anon-callable yes/no check the signup form uses
--  · add_free_email()/remove_free_email()/list_free_emails() — admin-only
--  · handle_new_user() — free-listed signups land as role 'Agent'
-- =====================================================================

create table if not exists public.free_emails (
  email      text primary key,
  added_by   text,
  created_at timestamptz not null default now()
);

alter table public.free_emails enable row level security;
-- no policies on purpose — service role + the functions below only

-- yes/no: does this email skip payment? (reveals nothing else)
create or replace function public.is_free_email(p_email text)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.free_emails where email = lower(trim(p_email)));
$$;
revoke all on function public.is_free_email(text) from public;
grant execute on function public.is_free_email(text) to anon, authenticated;

-- admins manage the list
create or replace function public.add_free_email(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  if not public.is_admin() then return 'forbidden'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'invalid'; end if;
  insert into public.free_emails (email, added_by)
  values (e, lower(auth.email()))
  on conflict (email) do nothing;
  return 'ok';
end;
$$;
revoke all on function public.add_free_email(text) from public, anon;
grant execute on function public.add_free_email(text) to authenticated;

create or replace function public.remove_free_email(p_email text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return 'forbidden'; end if;
  delete from public.free_emails where email = lower(trim(p_email));
  return 'ok';
end;
$$;
revoke all on function public.remove_free_email(text) from public, anon;
grant execute on function public.remove_free_email(text) to authenticated;

create or replace function public.list_free_emails()
returns table (email text, added_by text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select email, added_by, created_at
  from public.free_emails
  where public.is_admin()
  order by email;
$$;
revoke all on function public.list_free_emails() from public, anon;
grant execute on function public.list_free_emails() to authenticated;

-- signups: free-listed emails are Agents, same as NonStop emails
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
      when exists (select 1 from public.app_admins a where a.email = lower(new.email)) then 'Admin'
      when lower(split_part(new.email, '@', 2)) = 'nonstopglobal.co' then 'Agent'
      when exists (select 1 from public.free_emails f where f.email = lower(new.email)) then 'Agent'
      else 'Lead'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
```

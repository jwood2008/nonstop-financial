-- =====================================================================
-- NonStop Financial — Payments (one-time purchase)
-- Run in the Supabase SQL Editor. Idempotent.
--
-- Writes happen only via the Stripe webhook (service-role key, bypasses RLS).
-- Users can read their own purchase. has_purchased() gates access in the app.
-- =====================================================================

create table if not exists public.purchases (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  stripe_session_id text unique,
  amount            integer,           -- in cents
  email             text,
  status            text not null default 'paid',
  created_at        timestamptz not null default now()
);

create index if not exists purchases_user_idx on public.purchases (user_id);

alter table public.purchases enable row level security;

drop policy if exists "purchases_select_own" on public.purchases;
create policy "purchases_select_own" on public.purchases
  for select using (user_id = auth.uid());

-- Has the current user paid?
create or replace function public.has_purchased()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.purchases
    where user_id = auth.uid() and status = 'paid'
  );
$$;
grant execute on function public.has_purchased() to authenticated, anon;

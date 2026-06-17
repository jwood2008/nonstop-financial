-- =====================================================================
-- NonStop Financial — Subscription-aware access
-- Run in the Supabase SQL Editor AFTER payments.sql. Idempotent.
--
-- Extends `purchases` so monthly subscriptions can expire, and rewrites
-- has_purchased() so a cancelled/lapsed monthly plan loses access while a
-- one-time full-access purchase stays lifetime.
-- Writes happen only via the Stripe webhook (service-role key).
-- =====================================================================

alter table public.purchases
  add column if not exists stripe_subscription_id text,
  add column if not exists plan                   text,          -- 'full' | 'monthly'
  add column if not exists current_period_end     timestamptz;

create index if not exists purchases_subscription_idx
  on public.purchases (stripe_subscription_id);

-- Access = a one-time full purchase (no subscription, never expires)
--        OR an active subscription still inside its paid period.
create or replace function public.has_purchased()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.purchases p
    where p.user_id = auth.uid()
      and (
        -- one-time full access: paid, no subscription → lifetime
        (p.stripe_subscription_id is null and p.status = 'paid')
        -- active subscription: not cancelled/past_due and not past its period
        or (p.stripe_subscription_id is not null
            and p.status in ('active', 'trialing')
            and (p.current_period_end is null or p.current_period_end > now()))
      )
  );
$$;
grant execute on function public.has_purchased() to authenticated, anon;

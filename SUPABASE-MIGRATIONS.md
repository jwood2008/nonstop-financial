# Supabase setup

> ⚠️ This file previously inlined a **partial, out-of-date** subset of the
> migrations (and pointed at an old project). It is no longer the source of
> truth. **Use the `sql scripts/` folder** — each `Tab N - *.md` is one SQL
> Editor tab, complete and idempotent. See `sql scripts/README.md`.

## Fresh project — run in this order

Open the SQL Editor of the **target** Supabase project and run each in order:

1. **Tab 1 — Core** — profiles, role ladder, `app_admins` (seeds the owner), `purchases`
2. **Tab 2 — Analytics, content, birthdate**
3. **Tab 3 — Teams, roles, permissions**
   → then in the app, **Analytics → Users**, promote at least one **Manager**
4. **Tab 4 — Weekly training + chat**
5. **Tab 5 — My team analytics**
6. **Tab 6 — Free-access email list** — *must run last* (it owns the final `handle_new_user` with the free-email branch)
7. **`supabase/subscriptions.sql`** — subscription-aware access; run after Tab 1. Required so monthly plans actually expire (otherwise a cancelled monthly keeps access).

Order matters: Tab 3 before Tabs 4–6 (they depend on `is_admin()`), and Tab 6 last.

## Not SQL — also required for payments + auth to work

- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and a webhook endpoint pointed at `/api/stripe/webhook` subscribed to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- **Supabase Auth:** custom SMTP (Resend), "Confirm email" ON, Site URL set, and the Redirect URL allowlist must include `/auth/callback` and `/reset-password`.

See the project checklist for the full list of secrets and dashboard settings.

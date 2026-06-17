# Supabase — database setup (single source of truth)

Project: `mgavuqjhqflzixbtvvig` · SQL Editor: https://supabase.com/dashboard/project/mgavuqjhqflzixbtvvig/sql/new

These six numbered files are the **complete, ordered, idempotent** schema for
NonStop Financial. Re-running any of them is always safe. They replace the old
`supabase/*.sql` individual files and the `sql scripts/*.md` tabs (removed —
they had drifted out of sync).

## Fresh project — run in order

Open the target project's SQL Editor and run each file top to bottom:

| # | File | What it sets up |
|---|------|-----------------|
| 1 | `01_core.sql` | profiles + signup trigger + role protection · admin tiers (owners/sub-admins) · Stripe purchases **+ subscriptions** + `has_purchased()` |
| 2 | `02_analytics_content.sql` | events + windowed analytics · shared curriculum (`course_content`) + cross-device progress (`user_progress`) · birthday at signup |
| 3 | `03_teams_roles.sql` | `manager_id` + `list_managers()` · scoped analytics (`analytics_scope`) · single-role pipeline (Lead→Agent→Manager→Admin) · content editing made admin-only |
| 4 | `04_weekly_training.sql` | `team_training` (weekly program per manager) · `team_messages` (team chat) · analytics gain `p_source` ('all' / 'course' / 'weekly') |
| 5 | `05_my_team.sql` | manager drill-down into one team member · `my_team()` |
| 6 | `06_free_emails.sql` | `free_emails` allowlist (skip payment at signup) · **owns the final `handle_new_user`** — run last |

Order matters: each builds on the previous. `handle_new_user` is redefined as it
gains columns (birthdate → manager_id → admin/free-email role logic); the version
in `06` is the one that ends up live.

After running #3: promote at least one **Manager** in **Analytics → Users**
(the signup manager dropdown needs one).

## Not SQL — also required for payments + auth

- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and a webhook at
  `/api/stripe/webhook` subscribed to `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`.
- **Supabase Auth:** custom SMTP (Resend), "Confirm email" ON, Site URL set, and
  the Redirect allowlist must include `/auth/callback` and `/reset-password`.
- Server env: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ADMIN_EMAIL_FROM`,
  `MONTHLY_CENTS`, `PRICE_CENTS`. Client env: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MONTHLY_LABEL`,
  `NEXT_PUBLIC_PRICE_LABEL`. See `.env.local.example`.

## Notes

- Bootstrap owners are seeded in `01_core.sql` (`james.l.wood@outlook.com`,
  `jameslwood589@gmail.com`). Keep in sync with `lib/admins.ts`.
- These files are also applied to the live DB as tracked migrations
  (`supabase migration list` / the MCP `list_migrations`), named `01_core` … `06_free_emails`.

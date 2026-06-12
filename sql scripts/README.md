# Supabase SQL scripts — run in order

SQL Editor: https://supabase.com/dashboard/project/mgavuqjhqflzixbtvvig/sql/new

Each `.md` file here is one SQL Editor tab. Open the file, copy the whole
```sql block, paste it into a new tab, click **Run**, then move to the next.
Every script is idempotent — re-running is always safe.

| Order | File | What it sets up |
|---|---|---|
| 1 | Tab 1 - Core (profiles, admins, payments).md | profiles, admin tiers, Stripe purchases |
| 2 | Tab 2 - Analytics, content, birthdate.md | events + analytics, shared curriculum, cross-device progress, birthdate |
| 3 | Tab 3 - Teams, roles, permissions.md | teams/manager_id, scoped analytics, single-role pipeline, admin-only editing |
| 4 | Tab 4 - Weekly training + chat.md | weekly training programs, team chat, per-source analytics |
| 5 | Tab 5 - My team analytics.md | managers click a team member to see their individual analytics |
| 6 | Tab 6 - Free-access email list.md | agency emails that skip payment at signup (free_emails table) |

Notes:
- `supabase/analytics-hardening.sql` is intentionally absent — Tab 3 includes everything from it.
- After Tab 3: promote your managers in **Analytics → Users** (signup manager dropdown needs at least one Manager).
- Tab 4 is the one with the Weekly Training tab + team chat (`team_messages`).

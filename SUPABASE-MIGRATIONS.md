# Supabase setup

The database schema lives in **`supabase/`** as six numbered, idempotent files
(`01_core.sql` … `06_free_emails.sql`). That folder's
[`README.md`](supabase/README.md) is the single source of truth — run the files
in order in the target project's SQL Editor.

> The old `supabase/*.sql` individual files and the `sql scripts/*.md` "tab"
> files were consolidated into the numbered set (they had drifted apart). The
> numbered files are also applied to the live project as tracked migrations.

See [`supabase/README.md`](supabase/README.md) for the run order, the Stripe +
Auth dashboard settings, and the required environment variables.

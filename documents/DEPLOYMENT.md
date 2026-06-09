# Deploying NonStop Financial to production (Vercel + Supabase)

Status of your project (checked 2026-06-09):

- ✅ Supabase project `mgavuqjhqflzixbtvvig` is live — auth healthy, tables
  (`profiles`, `events`, `app_admins`, `purchases`) exist.
- ✅ Real auth (Supabase email/password + reset) and Stripe payments are coded.
- ✅ `DEMO_MODE` is now **false** — login goes through real Supabase auth.
- ✅ Production build passes (`npm run build`).

What's left is configuration in three dashboards: **Vercel**, **Supabase**, and
**Stripe**. Replace `YOUR_DOMAIN` below with the real domain everywhere.

---

## 1. Create the new Vercel project

Option A — dashboard:
1. vercel.com → **Add New… → Project** → import the `NonStop Financial` repo.
2. Framework preset: **Next.js** (auto-detected). Leave build/output defaults.
3. Add the environment variables in step 2 **before** the first deploy.
4. Deploy.

Option B — CLI (from the project folder):
```bash
npm i -g vercel        # if not installed
vercel login
vercel link            # choose "create a new project" when prompted
vercel --prod          # first production deploy
```

> Note: there's an existing linked project in `.vercel/project.json`
> (`nonstop-financial`). For a *new* project, run `vercel link` and pick
> "create new", or delete the `.vercel/` folder first.

## 2. Environment variables (Vercel → Settings → Environment Variables)

Set these for the **Production** (and Preview) environments. Pull the values
from your current `.env.local` / the dashboards:

| Variable | Where it comes from | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (publishable / anon) | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service role) | **server-only secret** |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys | use **live** key for real payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks (step 4) | per-endpoint secret |
| `PRICE_CENTS` | your price, e.g. `49700` | |
| `NEXT_PUBLIC_PRICE_LABEL` | display price, e.g. `$497` | |
| `RESEND_API_KEY` | resend.com → API Keys | sends the "you're an admin" email; optional |
| `ADMIN_EMAIL_FROM` | a verified sender on your domain | e.g. `NonStop Financial <team@YOUR_DOMAIN>` |
| `NEXT_PUBLIC_VOICE_PROVIDER` | `browser` | leave as browser unless self-hosting whisper-flow |

> **Admin invite emails:** when an owner adds a sub-admin in Settings, the app
> emails them via Resend. Set `RESEND_API_KEY` and verify your sending domain at
> resend.com → Domains, then set `ADMIN_EMAIL_FROM` to an address on it. Without
> the key, admins are still added — they just don't get the email.

## 3. Supabase auth URLs (Supabase → Authentication → URL Configuration)

The app redirects email-confirmation and password-reset links back to
`window.location.origin`, so Supabase must allow your domain:

- **Site URL:** `https://YOUR_DOMAIN`
- **Redirect URLs (allow list):** add
  - `https://YOUR_DOMAIN`
  - `https://YOUR_DOMAIN/reset-password`
  - `https://*.vercel.app` (so preview deploys can log in too — optional)

Also decide under **Authentication → Providers → Email**:
- **Confirm email** ON = users must click a link before first login (more secure).
- OFF = instant signup (smoother). The code handles both.

## 4. Stripe (only if taking real payments now)

1. Switch the dashboard to **Live mode**, use the live `STRIPE_SECRET_KEY`.
2. **Developers → Webhooks → Add endpoint:**
   - URL: `https://YOUR_DOMAIN/api/stripe/webhook`
   - Event: `checkout.session.completed` (at minimum)
3. Copy the endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET` in Vercel.

## 5. Custom domain (Vercel → Settings → Domains)

1. Add `YOUR_DOMAIN`.
2. Point DNS at Vercel (A record `76.76.21.21`, or the CNAME Vercel shows).
3. Wait for the SSL cert to issue (usually minutes).

## 6. Post-deploy smoke test

- [ ] Visit `https://YOUR_DOMAIN/login` → sign up a test account → confirms/logs in.
- [ ] Log in as the owner email (`james.l.wood@outlook.com`) → `/admin` is reachable.
- [ ] `/learn` shows all 9 curriculum modules.
- [ ] (If Stripe live) run a real checkout → returns to app with access unlocked.

---

## Things to double-check

- **Owner email** lives in `lib/admins.ts` (`ADMIN_EMAILS` → just
  `james.l.wood@outlook.com`) and seeds the `app_admins` table. Re-run
  `supabase/admins.sql` in the Supabase SQL editor to clear the old owners
  from the live DB and seed this one.
- **`supabase/analytics.sql` has uncommitted local edits** (simplified). If you
  rely on those analytics views in production, re-run that file in the Supabase
  SQL editor so the DB matches the file.
- Keep `DEMO_MODE = false` for production. Flip to `true` only for offline demos.

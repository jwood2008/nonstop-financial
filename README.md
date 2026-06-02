# NonStop Financial — Producer Operating System

> "Build Elite Producers Faster."

A preview build of the AgentOS platform for NonStop Financial. Next.js + TypeScript + Tailwind, on-brand (**black / white / Nonstop Orange `#FF5F1F`**, Oswald + Inter).

**No backend yet.** Login is fake (just click), and everything an admin edits is saved to the browser's `localStorage` — no Supabase, no database required.

## Run it

```bash
npm install      # first time only
npm run dev      # http://localhost:3000
```

Then open **http://localhost:3000** and click **Enter Platform** (or **Log in**).

## What's here

| Page | Route | Notes |
|------|-------|-------|
| Landing / "Coming Soon" | `/` | Simple hero + fake login button |
| Agent Dashboard | `/dashboard` | Progress, weekly activity, milestones, leaderboard |
| **Training / video template** | `/learn` | The main focus — see below |
| **Admin Analytics** | `/admin` | Instagram-style metrics (admin only) |

## Admin ⇄ User switching

- Use the floating **View: User / Admin** switch in the bottom-right of any in-app page.
- Admin is only selectable for accounts listed in **`lib/admins.ts`** — think of that file as "the backend" where you assign admins. The demo login (`greg@lecgroup.com`) is already an admin.
- When real auth (Supabase) is added later, that same list moves into the database/RLS without touching the rest of the app.

## The video / course template (`/learn`)

Whop-style layout: course nav on the left, content in the middle, utility tabs (Files · Notes · Transcript · AI Coach) below.

Every media slot is a **placeholder box** — `VIDEO HERE`, `IMAGE HERE`, `GIF HERE` — until content is added.

### Editing content with no backend (admin)

1. Switch to **Admin** (bottom-right).
2. Open **Training** (`/learn`) and click **Edit**.
3. For any block you can:
   - Switch its type (Video / Image / GIF / Text)
   - **Upload** a file (stored in-browser) or **Paste a URL** (YouTube, Vimeo, Mux, `.mp4`, image/GIF link)
   - Add a caption, or add/remove blocks
4. In the **Files** tab, upload PDFs / scripts / worksheets.
5. Edit the lesson **title** and **Transcript** inline.

All changes auto-save to this browser. **Reset to default** (in the edit banner) restores the seed content.

> ⚠️ Uploaded files are stored as data URLs in `localStorage` (~4.5 MB/file cap). For large videos, paste a hosted URL (YouTube/Vimeo/Mux) instead — that's also how production will work.

## Going to production later

- Wire **Supabase** for real auth + domain-based signup, and move `lib/admins.ts` roles into the DB.
- Replace `localStorage` content with Supabase tables + Storage.
- Swap the mock **AI Coach** (`components/AICoachTab.tsx`) for real OpenAI calls.
- Replace mock analytics in `lib/data.ts` with real event tracking.

## Project layout

```
app/            landing, dashboard, learn, admin pages
components/     AppShell, RoleSwitcher, content blocks, charts, tabs
lib/            store (localStorage state), seed data, types, admin list
```

# NONSTOP FINANCIAL — Platform Curriculum

The written reference for the training program. Each module has its own file in
this folder. The **structure** here is mirrored 1:1 by the app — edit
[`lib/curriculum.ts`](../../lib/curriculum.ts) and the app's modules, lessons,
and PDF slots update automatically.

| Where | What it is |
| --- | --- |
| `documents/curriculum/*.md` | The written reference (these files) |
| `lib/curriculum.ts` | The single source of truth that drives the app |
| `/learn` | The interactive training (video, progress, files, AI coach) |
| `/curriculum` | The read-only program overview |

## Modules

1. [Welcome & Orientation](module-01-welcome-orientation.md)
2. [Mindset Mastery](module-02-mindset-mastery.md)
3. [Licensing](module-03-licensing.md) *(if not licensed)*
4. [Contracting & Appointments](module-04-contracting-appointments.md)
5. [Product Knowledge](module-05-product-knowledge.md)
6. [Sales](module-06-sales.md) — *heaviest module, 8 sub-lessons*
7. [Systems & Daily Operations](module-07-systems-operations.md)
8. [Recruiting & Leadership](module-08-recruiting-leadership.md)
9. [Scale Your Business](module-09-scale-business.md)

## How content gets added

Each lesson currently ships as a **skeleton**: an empty video block, an intro
line, and any named PDFs as "Coming soon" slots. To fill a lesson in:

1. Go to `/learn`, open the lesson, and click **Edit** (admin only).
2. Drop in the real video / images / copy in the content blocks.
3. Open the **Files** tab and upload the actual PDF — it replaces the placeholder.

Don't edit content in these markdown files expecting it to appear in the app —
they're the human-readable reference. The app reads from `lib/curriculum.ts`.

## Platform notes (for James)

- **Module 6 (Sales)** is the heaviest module — it has its own sub-module
  navigation (8 numbered lessons, 6.1–6.8).
- Every module/lesson has a progress checkbox wired to the top progress bar on
  `/learn`.
- PDFs attach directly inside each sub-module (the lesson's **Files** tab).
- The leaderboard pulls from activity-tracker data.
- Admin vs member dashboards: the admin view shows per-agent module completion.

## Drop the source PDFs here

Put the actual PDF files in [`assets/`](assets/) as you produce them, named to
match the slots (e.g. `90-Day Game Plan Template.pdf`). Then upload them in the
matching lesson's Files tab.

import type { Course, Lesson, LessonFile } from "./types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  NONSTOP FINANCIAL — Platform Curriculum (single source of truth)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  This file is the canonical outline of the training program. Edit the modules
 *  below and everything else follows automatically:
 *    • `/learn`       — the real training experience (built via buildCourse())
 *    • `/curriculum`  — the read-only program overview
 *    • documents/curriculum/*.md — the written reference for each module
 *
 *  Each "topic" becomes a lesson with empty placeholder content blocks, ready
 *  for an admin to drop in video, images and copy later. Named PDFs become file
 *  slots on the lesson — they show as "Coming soon" until the real file is
 *  uploaded in the lesson's Files tab.
 *
 *  Don't worry about the actual content here — only the structure. The course
 *  spec drives the skeleton so nobody has to wire modules up by hand.
 */

/** One topic inside a module → renders as a single lesson. */
export interface CurriculumLesson {
  /** Short, stable code used to build deterministic ids (e.g. "game-plan"). */
  key: string;
  title: string;
  /** Optional one-liner shown as the lesson's intro text block. */
  blurb?: string;
  /** PDFs that belong to this topic (display names — "PDF:" prefix optional). */
  pdfs?: string[];
}

/** A curriculum module → renders as a course module with N lessons. */
export interface CurriculumModule {
  /** 1-based module number. */
  id: number;
  /** Title without the "Module N:" prefix — that's added automatically. */
  title: string;
  /** One-sentence description of what the module covers. */
  summary: string;
  /** Optional note (e.g. "If not licensed"). */
  note?: string;
  lessons: CurriculumLesson[];
}

export const CURRICULUM: CurriculumModule[] = [
  {
    id: 1,
    title: "Welcome & Orientation",
    summary:
      "Get oriented to who we are, how the platform works, and the 90-day plan that turns a new recruit into a producer.",
    lessons: [
      {
        key: "who-we-are",
        title: "Who we are & what we're building",
        blurb: "The NonStop mission, vision, and the kind of producer we build.",
      },
      {
        key: "how-to-use",
        title: "How to use this platform",
        blurb: "Where everything lives: modules, files, the AI coach, and your progress tracker.",
      },
      {
        key: "game-plan",
        title: "Your 90-day game plan",
        blurb: "The roadmap for your first 90 days.",
        pdfs: ["90-Day Game Plan Template"],
      },
    ],
  },
  {
    id: 2,
    title: "Mindset Mastery",
    summary:
      "Build the operator mindset: ownership, obsession, daily standards, and resilience against rejection.",
    lessons: [
      {
        key: "business-owner",
        title: "You're a business owner now",
        blurb: "The identity shift from employee to owner-operator.",
        pdfs: ["Affirmations Sheet"],
      },
      {
        key: "obsession",
        title: "Obsession beats talent",
        blurb: "Why consistent obsession out-produces raw talent.",
      },
      {
        key: "daily-standards",
        title: "Daily standards",
        blurb:
          "The non-negotiables that need to happen every day to be a top 1% producer.",
        pdfs: ["Daily Standards Tracker"],
      },
      {
        key: "rejection",
        title: "Handling rejection before it hits",
        blurb: "Pre-framing rejection so it never knocks you off your game.",
      },
    ],
  },
  {
    id: 3,
    title: "Licensing",
    note: "If not licensed",
    summary:
      "Get licensed fast: why it comes first, how to study, scheduling the exam, and what to do the day you pass.",
    lessons: [
      {
        key: "why-first",
        title: "Why licensing comes first",
        blurb: "Licensing is the gate to everything else — here's why.",
      },
      {
        key: "how-to-study",
        title: "How to study for your state exam",
        blurb: "A study plan that gets you exam-ready.",
        pdfs: ["Licensing Study Guide"],
      },
      {
        key: "scheduling",
        title: "Scheduling your exam",
        blurb: "How and when to book your state exam.",
        pdfs: ["State Exam Checklist"],
      },
      {
        key: "day-you-pass",
        title: "What to do the day you pass",
        blurb: "The exact next steps the moment you're licensed.",
      },
    ],
  },
  {
    id: 4,
    title: "Contracting & Appointments",
    summary:
      "Get contracted and appointed so you can write business with our carriers.",
    lessons: [
      {
        key: "nlg-contracting",
        title: "Getting contracted with National Life Group",
        blurb: "Step-by-step through the NLG contracting process.",
        pdfs: ["Contracting Checklist"],
      },
      {
        key: "appointment-checklist",
        title: "Carrier appointment checklist",
        blurb: "Everything that needs to happen to get appointed.",
      },
      {
        key: "what-appointed-means",
        title: 'What "appointed" means and why it matters',
        blurb: "Why appointment status gates which products you can sell.",
      },
    ],
  },
  {
    id: 5,
    title: "Product Knowledge",
    summary:
      "Know the carriers and products cold: F&G, Transamerica, Mutual of Omaha, and the difference between whole life, term, and IUL.",
    lessons: [
      {
        key: "carriers",
        title: "The carriers we use",
        blurb: "F&G, Transamerica, and Mutual of Omaha — who they are and when to use them.",
        pdfs: ["Carrier Comparison Cheat Sheet"],
      },
      {
        key: "product-types",
        title: "Whole life vs term vs IUL",
        blurb: "The three core product types explained simply.",
        pdfs: ["Product Quick Reference Guide"],
      },
      {
        key: "living-benefits",
        title: "Living benefits overview",
        blurb: "How living benefits work and why clients love them.",
      },
      {
        key: "master-one",
        title: "Master one product first",
        blurb: "Why depth on one product beats shallow knowledge of all.",
      },
      {
        key: "carrier-fit",
        title: "Which carrier fits which client",
        blurb: "Matching the right carrier to the client's situation.",
      },
    ],
  },
  {
    id: 6,
    title: "Sales",
    summary:
      "The heaviest module: mindset, scripts, rapport, running the appointment, objections, rebuttals, closing, and reviewing your recordings.",
    lessons: [
      {
        key: "sales-mindset",
        title: "6.1 The sales mindset",
        blurb: "The mental frame that makes selling natural.",
      },
      {
        key: "the-script",
        title: "6.2 Understanding your script",
        blurb: "How the master script is structured and why.",
        pdfs: ["Master Script"],
      },
      {
        key: "rapport",
        title: "6.3 Building rapport",
        blurb: "Earning trust in the first few minutes.",
      },
      {
        key: "running-appointment",
        title: "6.4 Running an appointment",
        blurb: "Start to finish flow of a great appointment.",
        pdfs: ["Appointment Checklist"],
      },
      {
        key: "objection-handling",
        title: "6.5 Objection handling",
        blurb: "Turning objections into opportunities.",
        pdfs: ["Objection Handling Playbook"],
      },
      {
        key: "rebuttals",
        title: "6.6 Rebuttals and follow-up",
        blurb: "Word-for-word rebuttals and the follow-up cadence.",
        pdfs: ["Rebuttal Word Tracks"],
      },
      {
        key: "closing",
        title: "6.7 Closing the sale",
        blurb: "Closing as the natural end of a great presentation.",
      },
      {
        key: "recording-review",
        title: "6.8 Recording review",
        blurb: "How to review your call recordings to improve fast.",
        pdfs: ["Call Recording Review Guide"],
      },
    ],
  },
  {
    id: 7,
    title: "Systems & Daily Operations",
    summary:
      "Run your business on systems: lead distribution, tracking your numbers, and the CRM and tools you'll use daily.",
    lessons: [
      {
        key: "lead-distribution",
        title: "Lead distribution",
        blurb: "How leads flow to you and how to work them.",
      },
      {
        key: "track-numbers",
        title: "How to track your numbers",
        blurb: "The metrics that matter and how to log them daily.",
        pdfs: ["Activity Tracker Sheet", "Weekly Metrics Template"],
      },
      {
        key: "crm-tools",
        title: "CRM and tools walkthrough",
        blurb: "A tour of the CRM and the tools that keep you organized.",
      },
    ],
  },
  {
    id: 8,
    title: "Recruiting & Leadership",
    summary:
      "Grow beyond yourself: when to recruit, how to talk to prospects, and building a team that doesn't depend on you.",
    lessons: [
      {
        key: "when-to-recruit",
        title: "When to start recruiting",
        blurb: "The right time to begin building a team.",
      },
      {
        key: "talk-to-prospect",
        title: "How to talk to a prospect",
        blurb: "Opening the opportunity conversation.",
        pdfs: ["Recruiting Script", "Opportunity Overview One-Pager"],
      },
      {
        key: "self-sufficient-team",
        title: "Building a self-sufficient team",
        blurb: "Systems that let your team run without you.",
      },
      {
        key: "leadership-vs-dependency",
        title: "Leadership vs dependency",
        blurb: "Leading people instead of carrying them.",
      },
    ],
  },
  {
    id: 9,
    title: "Scale Your Business",
    summary:
      "Take it to the next level: scaling production, a repeatable weekly review, long-term vision, and managing debt.",
    lessons: [
      {
        key: "scaling-production",
        title: "Scaling production",
        blurb: "Growing volume without breaking your systems.",
        pdfs: ["Production Scaling Roadmap"],
      },
      {
        key: "weekly-review",
        title: "Weekly review process",
        blurb: "The weekly rhythm that keeps you compounding.",
      },
      {
        key: "long-term-vision",
        title: "Long-term business vision",
        blurb: "Building toward a business that lasts.",
      },
      {
        key: "outstanding-debt",
        title: "Outstanding debt",
        blurb: "Managing and clearing outstanding debt as you scale.",
      },
    ],
  },
];

/* ────────────────────────── helpers / builders ────────────────────────── */

/** Full module title with its "Module N:" prefix and optional note. */
export function moduleTitle(m: CurriculumModule): string {
  return `Module ${m.id}: ${m.title}${m.note ? ` (${m.note})` : ""}`;
}

/** Normalize a PDF display name (strip any "PDF:" prefix) → "Name.pdf". */
function pdfFileName(name: string): string {
  return `${name.replace(/^\s*PDF:\s*/i, "").trim()}.pdf`;
}

/**
 * Build the live Course from the curriculum spec. IDs are deterministic so a
 * learner's progress (completed lessons, notes) stays stable across reloads.
 * Every lesson ships with empty placeholder blocks and any PDFs as empty file
 * slots (src === "" → shown as "Coming soon" until uploaded).
 */
export function buildCourse(): Course {
  return {
    id: "nonstop-curriculum",
    title: "NonStop Financial — Platform Curriculum",
    modules: CURRICULUM.map((m) => ({
      id: `m${m.id}`,
      title: moduleTitle(m),
      lessons: m.lessons.map((l): Lesson => {
        const lessonId = `m${m.id}-${l.key}`;
        const files: LessonFile[] = (l.pdfs ?? []).map((p, i) => ({
          id: `${lessonId}-pdf${i + 1}`,
          name: pdfFileName(p),
          kind: "application/pdf",
          src: "", // placeholder — upload the real PDF in the Files tab
        }));
        return {
          id: lessonId,
          title: l.title,
          duration: "TBD",
          blocks: [
            {
              id: `${lessonId}-video`,
              type: "video",
              src: "",
              caption: l.title,
            },
            {
              id: `${lessonId}-text`,
              type: "text",
              src: "",
              caption: l.blurb ?? "Content coming soon.",
            },
          ],
          files,
          transcript: "",
        };
      }),
    })),
  };
}

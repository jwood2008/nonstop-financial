import type { Course } from "./types";

/** Helper to make placeholder blocks that say "VIDEO HERE" etc. */
const ph = (
  id: string,
  type: "video" | "image" | "gif" | "text",
  caption: string
) => ({ id, type, src: "", caption });

/**
 * Seed course — structure taken straight from the PRD (Insurance Foundations,
 * Product Training, Sales Training, Advanced Production). Every lesson ships
 * with empty placeholder blocks so an admin can drop in real media later.
 */
export const SEED_COURSE: Course = {
  id: "nonstop-core",
  title: "Producer Development Path",
  modules: [
    {
      id: "m-foundations",
      title: "Insurance Foundations",
      lessons: [
        {
          id: "l-intro",
          title: "Introduction",
          duration: "6 min",
          blocks: [
            ph("b1", "video", "Welcome to NonStop — intro video"),
            ph("b2", "text", "Add a short welcome message for new agents here."),
          ],
          files: [],
          transcript:
            "Welcome to NonStop Financial. In this lesson we cover what to expect from the Producer Development Path and how to get certified fast.",
        },
        {
          id: "l-licensing",
          title: "Licensing",
          duration: "12 min",
          blocks: [
            ph("b1", "video", "Licensing walkthrough"),
            ph("b2", "image", "State licensing requirements chart"),
          ],
          files: [],
          transcript:
            "Licensing requirements vary by state. This lesson walks through the path to getting and maintaining your life license.",
        },
      ],
    },
    {
      id: "m-product",
      title: "Product Training",
      lessons: [
        {
          id: "l-iul",
          title: "IUL",
          duration: "18 min",
          blocks: [
            ph("b1", "video", "How Indexed Universal Life works"),
            ph("b2", "gif", "Cash value accumulation animation"),
            ph("b3", "text", "Key talking points for IUL with business owners."),
          ],
          files: [],
          transcript:
            "Indexed Universal Life ties cash value growth to a market index with a floor and a cap. Here is how to position it.",
        },
        { id: "l-term", title: "Term", duration: "9 min", blocks: [ph("b1", "video", "Term life fundamentals")], files: [], transcript: "Term life is the simplest, most affordable coverage. Learn when it's the right fit." },
        { id: "l-whole", title: "Whole Life", duration: "14 min", blocks: [ph("b1", "video", "Whole life & guaranteed value")], files: [], transcript: "Whole life offers guaranteed cash value and lifelong coverage." },
      ],
    },
    {
      id: "m-sales",
      title: "Sales Training",
      lessons: [
        { id: "l-prospect", title: "Prospecting", duration: "11 min", blocks: [ph("b1", "video", "Building a pipeline that never runs dry")], files: [], transcript: "Prospecting is the lifeblood of production. Build daily habits that fill your pipeline." },
        { id: "l-objection", title: "Objection Handling", duration: "16 min", blocks: [ph("b1", "video", "Advanced Objection Handling"), ph("b2", "text", "The 5 most common objections and your responses.")], files: [], transcript: "When a prospect says premiums are too expensive, reframe around value and risk." },
        { id: "l-closing", title: "Closing", duration: "13 min", blocks: [ph("b1", "video", "Closing with confidence")], files: [], transcript: "Closing is simply the natural conclusion of a great presentation." },
      ],
    },
    {
      id: "m-advanced",
      title: "Advanced Production",
      lessons: [
        { id: "l-referrals", title: "Referrals", duration: "10 min", blocks: [ph("b1", "video", "Turning clients into a referral engine")], files: [], transcript: "Referrals are the highest-converting leads you will ever work." },
        { id: "l-recruiting", title: "Recruiting", duration: "15 min", blocks: [ph("b1", "video", "Recruiting elite producers")], files: [], transcript: "Recruiting multiplies your impact. Learn to identify and attract talent." },
        { id: "l-team", title: "Team Building", duration: "12 min", blocks: [ph("b1", "video", "Building a high-performance team")], files: [], transcript: "A great team compounds. Build culture, accountability, and momentum." },
      ],
    },
  ],
};

/* ===================== ANALYTICS (mock, Instagram-style) ===================== */

export interface Sparkline {
  label: string;
  value: string;
  delta: number; // percent change
  series: number[];
}

export const KPIS: Sparkline[] = [
  { label: "Active Agents", value: "342", delta: 12.4, series: [180, 210, 240, 260, 255, 300, 342] },
  { label: "Reach (30d)", value: "5,120", delta: 8.1, series: [3200, 3600, 4100, 4400, 4700, 4900, 5120] },
  { label: "Lesson Views", value: "18,944", delta: 23.7, series: [9000, 11000, 12500, 14000, 15500, 17200, 18944] },
  { label: "Watch Time (hrs)", value: "2,318", delta: 15.2, series: [1200, 1450, 1600, 1800, 2000, 2150, 2318] },
  { label: "Avg. Completion", value: "78%", delta: 4.3, series: [62, 65, 68, 70, 73, 75, 78] },
  { label: "Certifications", value: "126", delta: 31.0, series: [40, 55, 68, 80, 95, 110, 126] },
  { label: "Quiz Pass Rate", value: "84%", delta: 2.1, series: [76, 78, 79, 80, 81, 83, 84] },
  { label: "Avg. Streak", value: "6.2d", delta: 9.8, series: [3.1, 3.8, 4.4, 5.0, 5.4, 5.9, 6.2] },
];

/** Daily engagement over the last 14 days (active + new). */
export const ENGAGEMENT_14D = [
  { day: "M", active: 210, lessons: 320 },
  { day: "T", active: 245, lessons: 380 },
  { day: "W", active: 260, lessons: 410 },
  { day: "T", active: 230, lessons: 350 },
  { day: "F", active: 290, lessons: 470 },
  { day: "S", active: 140, lessons: 180 },
  { day: "S", active: 120, lessons: 150 },
  { day: "M", active: 255, lessons: 390 },
  { day: "T", active: 275, lessons: 430 },
  { day: "W", active: 300, lessons: 480 },
  { day: "T", active: 285, lessons: 460 },
  { day: "F", active: 320, lessons: 520 },
  { day: "S", active: 160, lessons: 210 },
  { day: "S", active: 135, lessons: 175 },
];

/** Audience retention for the featured lesson (like an IG video drop-off). */
export const RETENTION_CURVE = [100, 96, 92, 88, 81, 77, 74, 70, 66, 61, 58, 54, 49, 44, 40, 36, 33, 30, 27, 24];

/** Where agents are in the funnel. */
export const FUNNEL = [
  { stage: "Signed Up", value: 480 },
  { stage: "Started Training", value: 412 },
  { stage: "Completed Module 1", value: 351 },
  { stage: "Passed a Quiz", value: 298 },
  { stage: "Certified", value: 126 },
];

export const TOP_CONTENT = [
  { title: "Advanced Objection Handling", views: 2840, completion: 91, avgWatch: "14:20", trend: 18 },
  { title: "How IUL Works", views: 2510, completion: 84, avgWatch: "16:05", trend: 12 },
  { title: "Closing with Confidence", views: 2190, completion: 88, avgWatch: "11:40", trend: 9 },
  { title: "Prospecting That Never Runs Dry", views: 1980, completion: 76, avgWatch: "09:30", trend: -4 },
  { title: "Recruiting Elite Producers", views: 1640, completion: 71, avgWatch: "12:55", trend: 22 },
];

export const LEADERBOARD = [
  { name: "Marcus Bell", completion: 98, certs: 4, streak: 21 },
  { name: "Priya Nair", completion: 95, certs: 3, streak: 18 },
  { name: "Diego Ramos", completion: 92, certs: 3, streak: 16 },
  { name: "Sara Kim", completion: 90, certs: 2, streak: 14 },
  { name: "James Wood", completion: 78, certs: 2, streak: 6 },
];

/** Active-hours heatmap: rows = days, cols = 12 two-hour buckets. 0-4 intensity. */
export const ACTIVE_HEATMAP: number[][] = [
  [0, 0, 1, 2, 3, 4, 3, 2, 3, 4, 2, 1],
  [0, 1, 1, 2, 4, 4, 3, 3, 4, 3, 2, 1],
  [0, 0, 2, 3, 4, 3, 2, 3, 4, 4, 3, 1],
  [1, 1, 2, 2, 3, 4, 4, 3, 3, 4, 2, 0],
  [0, 1, 2, 3, 4, 4, 3, 2, 3, 3, 2, 1],
  [0, 0, 1, 1, 2, 2, 2, 1, 2, 2, 1, 0],
  [0, 0, 0, 1, 1, 2, 1, 1, 2, 1, 1, 0],
];

/** Audience breakdown by module (like IG "audience" donut). */
export const AUDIENCE_BY_MODULE = [
  { label: "Insurance Foundations", value: 34 },
  { label: "Product Training", value: 28 },
  { label: "Sales Training", value: 23 },
  { label: "Advanced Production", value: 15 },
];

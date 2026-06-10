import type { Course, Spotlight } from "./types";
import { buildCourse } from "./curriculum";

/** Default dashboard Spotlight cards — admins edit these in place on the
 *  dashboard (photo, text, link); edits sync to Supabase for everyone. */
export const DEFAULT_SPOTLIGHTS: Spotlight[] = [
  {
    id: "objection",
    title: "Advanced Objection Handling",
    description: "Reframe price and risk so prospects sell themselves.",
    href: "/learn",
    image:
      "https://images.unsplash.com/photo-1551250928-243dc937c49d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    id: "iul",
    title: "How IUL Works",
    description: "Position indexed universal life with confidence.",
    href: "/learn",
    image:
      "https://images.unsplash.com/photo-1551250928-e4a05afaed1e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    id: "closing",
    title: "Closing with Confidence",
    description: "Turn a great presentation into a signed application.",
    href: "/learn",
    image:
      "https://images.unsplash.com/photo-1536735561749-fc87494598cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    id: "recruiting",
    title: "Recruiting Elite Producers",
    description: "Multiply your impact by building a team.",
    href: "/learn",
    image:
      "https://images.unsplash.com/photo-1548324215-9133768e4094?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
];

/**
 * Seed course — built from the canonical NONSTOP FINANCIAL curriculum spec in
 * lib/curriculum.ts (9 modules, each topic a lesson). Every lesson ships with
 * empty placeholder blocks and PDF file slots so an admin can drop in real
 * media and documents later. Edit lib/curriculum.ts to change the structure.
 */
export const SEED_COURSE: Course = buildCourse();

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
// Age distribution of the audience (sums to 100%). Buckets match the brackets
// collected at signup — see ageBracket() in lib/store.
export const AUDIENCE_BY_AGE = [
  { label: "18 & under", value: 6 },
  { label: "18–24", value: 31 },
  { label: "25–34", value: 38 },
  { label: "35–44", value: 17 },
  { label: "45+", value: 8 },
];

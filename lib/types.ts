export type Role = "user" | "admin";

export type BlockType = "video" | "image" | "gif" | "text" | "quiz";

/* ----- Quizzes (admin-authored, learner-graded) ----- */
export type QuizKind = "mcq" | "match";

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: number; // index into options
}

export interface MatchPair {
  id: string;
  term: string;
  definition: string;
}

export interface QuizData {
  kind: QuizKind;
  title: string;
  questions: QuizQuestion[];
  pairs: MatchPair[];
}

export interface QuizAttempt {
  name: string;
  percent: number; // 0-100
  timeMs: number;
  mistakes: number;
  kind: QuizKind;
  at: number; // epoch ms
}

/** A single piece of content inside a lesson's main panel. */
export interface ContentBlock {
  id: string;
  type: BlockType;
  /** Data URL (uploaded) or external URL (pasted). Empty = show placeholder. */
  src: string;
  /** Caption / label shown under the block, or the body when type === "text". */
  caption: string;
  /** Present when type === "quiz". */
  quiz?: QuizData;
}

export interface LessonFile {
  id: string;
  name: string;
  /** mime type, e.g. application/pdf */
  kind: string;
  /** Data URL (uploaded) or external URL. */
  src: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  blocks: ContentBlock[];
  files: LessonFile[];
  transcript: string;
  /** which video src this transcript was written/generated for (mismatch = stale) */
  transcriptVideoSrc?: string;
  /** completion is tracked locally per-lesson */
  completed?: boolean;
}

export interface Module {
  id: string;
  title: string;
  /** short blurb shown on lead-type track cards (optional elsewhere) */
  description?: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  modules: Module[];
}

/** A dashboard Spotlight card — admin-editable, links anywhere (story,
 *  Instagram, article…). Stored in Supabase so everyone sees the same set. */
export interface Spotlight {
  id: string;
  title: string;
  description: string;
  /** Where the card leads on click — external URLs open in a new tab. */
  href: string;
  /** Background image: external URL or uploaded data-URL. */
  image: string;
}

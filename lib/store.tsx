"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Course,
  ContentBlock,
  LessonFile,
  Role,
  BlockType,
  QuizAttempt,
} from "./types";
import type { Persona } from "./personas";
import { SEED_COURSE } from "./data";
import { SEED_PERSONAS } from "./personas";
import { DEMO_EMAIL, isAdminEmail } from "./admins";

const LS_ROLE = "nf.role";
const LS_EMAIL = "nf.email";
const LS_COURSE = "nf.course";
const LS_NOTES = "nf.notes"; // { [lessonId]: string }
const LS_DONE = "nf.completed"; // string[] of lessonIds
const LS_PERSONAS = "nf.personas";
const LS_QUIZ = "nf.quizResults"; // { [blockId]: QuizAttempt[] }
const LS_PROFILE = "nf.profile";

const DEFAULT_PROFILE = { name: "", avatar: "", phone: "", title: "" };

interface Store {
  ready: boolean;
  email: string | null;
  loggedIn: boolean;
  login: () => void;
  logout: () => void;

  role: Role;
  setRole: (r: Role) => void;
  canBeAdmin: boolean;

  // editable account profile (no backend — persisted locally)
  profile: { name: string; avatar: string; phone: string; title: string };
  updateProfile: (patch: Partial<Store["profile"]>) => void;

  course: Course;
  resetCourse: () => void;

  // editing (admin)
  updateBlock: (lessonId: string, blockId: string, patch: Partial<ContentBlock>) => void;
  addBlock: (lessonId: string, type: BlockType) => void;
  removeBlock: (lessonId: string, blockId: string) => void;
  moveBlock: (lessonId: string, blockId: string, dir: -1 | 1) => void;
  addFile: (lessonId: string, file: LessonFile) => void;
  removeFile: (lessonId: string, fileId: string) => void;
  updateLessonTitle: (lessonId: string, title: string) => void;
  updateTranscript: (lessonId: string, text: string) => void;

  // course structure (admin)
  addModule: () => string;
  removeModule: (moduleId: string) => void;
  updateModuleTitle: (moduleId: string, title: string) => void;
  addLesson: (moduleId: string) => string;
  removeLesson: (lessonId: string) => void;

  // roleplay personas (admin-editable)
  personas: Persona[];
  addPersona: (p: Persona) => void;
  updatePersona: (id: string, patch: Partial<Persona>) => void;
  removePersona: (id: string) => void;
  resetPersonas: () => void;

  // quiz leaderboard results, keyed by quiz block id
  quizResults: Record<string, QuizAttempt[]>;
  addQuizResult: (blockId: string, attempt: QuizAttempt) => void;

  // user state
  notes: Record<string, string>;
  setNote: (lessonId: string, text: string) => void;
  completed: Set<string>;
  toggleComplete: (lessonId: string) => void;
}

const Ctx = createContext<Store | null>(null);

const uid = () => Math.random().toString(36).slice(2, 9);

/** A blank lesson with one empty video block, ready for an admin to fill in. */
function newLesson() {
  return {
    id: uid(),
    title: "New Lesson",
    duration: "0 min",
    blocks: [{ id: uid(), type: "video" as const, src: "", caption: "" }],
    files: [],
    transcript: "",
  };
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRoleState] = useState<Role>("user");
  const [course, setCourse] = useState<Course>(SEED_COURSE);
  const [personas, setPersonas] = useState<Persona[]>(SEED_PERSONAS);
  const [quizResults, setQuizResults] = useState<Record<string, QuizAttempt[]>>(
    {}
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  // hydrate from localStorage
  useEffect(() => {
    setEmail(read<string | null>(LS_EMAIL, null));
    setRoleState(read<Role>(LS_ROLE, "user"));
    setCourse(read<Course>(LS_COURSE, SEED_COURSE));
    setPersonas(read<Persona[]>(LS_PERSONAS, SEED_PERSONAS));
    setQuizResults(read<Record<string, QuizAttempt[]>>(LS_QUIZ, {}));
    setProfile(read(LS_PROFILE, DEFAULT_PROFILE));
    setNotes(read<Record<string, string>>(LS_NOTES, {}));
    setCompleted(new Set(read<string[]>(LS_DONE, [])));
    setReady(true);
  }, []);

  // persist
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_COURSE, JSON.stringify(course));
  }, [course, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_PERSONAS, JSON.stringify(personas));
  }, [personas, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_QUIZ, JSON.stringify(quizResults));
  }, [quizResults, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
  }, [profile, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_NOTES, JSON.stringify(notes));
  }, [notes, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_DONE, JSON.stringify([...completed]));
  }, [completed, ready]);

  const canBeAdmin = isAdminEmail(email);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_ROLE, r);
  };

  const login = () => {
    setEmail(DEMO_EMAIL);
    window.localStorage.setItem(LS_EMAIL, JSON.stringify(DEMO_EMAIL));
  };
  const logout = () => {
    setEmail(null);
    window.localStorage.removeItem(LS_EMAIL);
    setRole("user");
  };

  // ---- course mutations ----
  const mutateLesson = (
    lessonId: string,
    fn: (lesson: Course["modules"][0]["lessons"][0]) => void
  ) => {
    setCourse((prev) => {
      const next: Course = structuredClone(prev);
      for (const m of next.modules) {
        const l = m.lessons.find((x) => x.id === lessonId);
        if (l) {
          fn(l);
          break;
        }
      }
      return next;
    });
  };

  const store: Store = useMemo(
    () => ({
      ready,
      email,
      loggedIn: !!email,
      login,
      logout,
      role,
      setRole,
      canBeAdmin,
      profile,
      updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
      course,
      resetCourse: () => setCourse(structuredClone(SEED_COURSE)),

      updateBlock: (lessonId, blockId, patch) =>
        mutateLesson(lessonId, (l) => {
          const b = l.blocks.find((x) => x.id === blockId);
          if (b) Object.assign(b, patch);
        }),
      addBlock: (lessonId, type) =>
        mutateLesson(lessonId, (l) => {
          const block: ContentBlock = { id: uid(), type, src: "", caption: "" };
          if (type === "quiz") {
            block.quiz = { kind: "mcq", title: "Quiz", questions: [], pairs: [] };
          }
          l.blocks.push(block);
        }),
      removeBlock: (lessonId, blockId) =>
        mutateLesson(lessonId, (l) => {
          l.blocks = l.blocks.filter((x) => x.id !== blockId);
        }),
      moveBlock: (lessonId, blockId, dir) =>
        mutateLesson(lessonId, (l) => {
          const i = l.blocks.findIndex((x) => x.id === blockId);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= l.blocks.length) return;
          [l.blocks[i], l.blocks[j]] = [l.blocks[j], l.blocks[i]];
        }),
      addFile: (lessonId, file) =>
        mutateLesson(lessonId, (l) => {
          l.files.push(file);
        }),
      removeFile: (lessonId, fileId) =>
        mutateLesson(lessonId, (l) => {
          l.files = l.files.filter((x) => x.id !== fileId);
        }),
      updateLessonTitle: (lessonId, title) =>
        mutateLesson(lessonId, (l) => {
          l.title = title;
        }),
      updateTranscript: (lessonId, text) =>
        mutateLesson(lessonId, (l) => {
          l.transcript = text;
          // bind the transcript to whatever video is currently in the lesson,
          // so we can tell when it goes stale (a different video is added)
          l.transcriptVideoSrc =
            l.blocks.find((b) => b.type === "video" && b.src.trim())?.src ?? "";
        }),

      addModule: () => {
        const id = uid();
        setCourse((prev) => {
          const next: Course = structuredClone(prev);
          next.modules.push({
            id,
            title: "New Module",
            lessons: [newLesson()],
          });
          return next;
        });
        return id;
      },
      removeModule: (moduleId) =>
        setCourse((prev) => {
          const next: Course = structuredClone(prev);
          next.modules = next.modules.filter((m) => m.id !== moduleId);
          return next;
        }),
      updateModuleTitle: (moduleId, title) =>
        setCourse((prev) => {
          const next: Course = structuredClone(prev);
          const m = next.modules.find((x) => x.id === moduleId);
          if (m) m.title = title;
          return next;
        }),
      addLesson: (moduleId) => {
        const lesson = newLesson();
        setCourse((prev) => {
          const next: Course = structuredClone(prev);
          const m = next.modules.find((x) => x.id === moduleId);
          if (m) m.lessons.push(lesson);
          return next;
        });
        return lesson.id;
      },
      removeLesson: (lessonId) =>
        setCourse((prev) => {
          const next: Course = structuredClone(prev);
          for (const m of next.modules) {
            m.lessons = m.lessons.filter((l) => l.id !== lessonId);
          }
          return next;
        }),

      quizResults,
      addQuizResult: (blockId, attempt) =>
        setQuizResults((prev) => ({
          ...prev,
          [blockId]: [...(prev[blockId] ?? []), attempt],
        })),

      personas,
      addPersona: (p) => setPersonas((prev) => [...prev, p]),
      updatePersona: (id, patch) =>
        setPersonas((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
        ),
      removePersona: (id) =>
        setPersonas((prev) => prev.filter((p) => p.id !== id)),
      resetPersonas: () => setPersonas(structuredClone(SEED_PERSONAS)),

      notes,
      setNote: (lessonId, text) =>
        setNotes((prev) => ({ ...prev, [lessonId]: text })),
      completed,
      toggleComplete: (lessonId) =>
        setCompleted((prev) => {
          const next = new Set(prev);
          next.has(lessonId) ? next.delete(lessonId) : next.add(lessonId);
          return next;
        }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, email, role, canBeAdmin, profile, course, personas, quizResults, notes, completed]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Flatten all lessons for convenience. */
export function allLessons(course: Course) {
  return course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title, moduleId: m.id }))
  );
}

export const newFileId = uid;

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  Spotlight,
} from "./types";
import type { Persona } from "./personas";
import { SEED_COURSE, DEFAULT_SPOTLIGHTS } from "./data";
import { SEED_PERSONAS } from "./personas";
import { DEMO_EMAIL, isAdminEmail } from "./admins";
import { supabase, isSupabaseConfigured, track } from "./supabase";
import { isTrackableVideo, WATCH_THRESHOLD } from "./video";
import { DEFAULT_ROLE } from "./roles";

const LS_ROLE = "nf.role";
const LS_EMAIL = "nf.email";
const LS_COURSE = "nf.course";
const LS_NOTES = "nf.notes"; // { [lessonId]: string }
const LS_DONE = "nf.completed"; // string[] of lessonIds
const LS_PERSONAS = "nf.personas";
const LS_QUIZ = "nf.quizResults"; // { [blockId]: QuizAttempt[] }
const LS_PROFILE = "nf.profile";
const LS_THEME = "nf.theme"; // "dark" | "light"
const LS_ACCOUNTS = "nf.accounts"; // { [emailLower]: Account }
const LS_VIDEO = "nf.videoProgress"; // { [blockId]: fraction watched 0..1 }
const LS_SPOTLIGHTS = "nf.spotlights"; // Spotlight[]

/** course_content row id that holds the dashboard Spotlight cards. */
const SPOTLIGHTS_DOC_ID = "spotlights";

type Theme = "dark" | "light" | "system";

/** A locally-stored account. No backend yet — this stands in for Supabase. */
type Account = {
  email: string;
  password: string;
  name: string;
  age: number;
  birthdate?: string;
};

type AuthResult =
  | { ok: true; needsConfirmation?: boolean }
  | { ok: false; error: string };

type AdminStatus = "owner" | "admin" | null;
export type AdminRow = {
  email: string;
  role: "owner" | "admin";
  added_by: string | null;
  created_at: string;
};

const DEFAULT_PROFILE = {
  name: "",
  avatar: "",
  phone: "",
  title: "",
  age: 0, // derived from birthdate when one is set
  birthdate: "", // ISO yyyy-mm-dd — collected at signup
  managerId: "", // which Manager this agent reports to (NonStop emails)
  role: DEFAULT_ROLE as string,
  requestedRole: null as string | null,
};

/** Email domain that makes a signup a NonStop agent (team features). */
export const NONSTOP_DOMAIN = "nonstopglobal.co";
export const isNonstopEmail = (em: string | null | undefined) =>
  (em ?? "").toLowerCase().split("@")[1] === NONSTOP_DOMAIN;

/** Current age from an ISO birthdate (yyyy-mm-dd). 0 when invalid/empty. */
export function ageFromBirthdate(iso: string): number {
  if (!iso) return 0;
  const b = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(+b)) return 0;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/** Bucket a raw age into the brackets shown in the analytics audience widget. */
export function ageBracket(age: number): string {
  if (!age || age <= 18) return "18 & under";
  if (age <= 24) return "18–24";
  if (age <= 34) return "25–34";
  if (age <= 44) return "35–44";
  return "45+";
}

interface Store {
  ready: boolean;
  email: string | null;
  loggedIn: boolean;
  login: (email?: string) => void;
  logout: () => void;
  // credential auth — Supabase when configured, local preview otherwise
  signUp: (data: {
    name: string;
    email: string;
    password: string;
    /** ISO yyyy-mm-dd — age is derived from this, here and in Settings. */
    birthdate: string;
    /** profile id of the Manager a NonStop agent reports to */
    managerId?: string;
  }) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;

  role: Role;
  setRole: (r: Role) => void;
  canBeAdmin: boolean;
  /** Has the admin tools (edit + analytics): team admins or Managers. */
  canManage: boolean;

  // admin tiers: owners can manage sub-admins; sub-admins can't
  adminStatus: AdminStatus;
  isOwner: boolean;
  listAdmins: () => Promise<AdminRow[]>;
  addAdmin: (email: string) => Promise<AuthResult & { emailed?: boolean }>;
  removeAdmin: (email: string) => Promise<AuthResult>;

  // one-time purchase / access
  hasPaid: boolean;
  paidReady: boolean;
  refreshPaid: () => Promise<void>;

  // appearance
  theme: Theme;
  setTheme: (t: Theme) => void;

  // editable account profile (no backend — persisted locally)
  profile: {
    name: string;
    avatar: string;
    phone: string;
    title: string;
    age: number;
    birthdate: string;
    managerId: string;
    role: string;
    requestedRole: string | null;
  };
  updateProfile: (patch: Partial<Store["profile"]>) => void;
  /** Request a different position (admins approve). Empty string cancels. */
  requestRoleChange: (role: string) => Promise<AuthResult>;

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

  // dashboard spotlights (admin-editable: photo, copy, click-through URL)
  spotlights: Spotlight[];
  addSpotlight: () => string;
  updateSpotlight: (id: string, patch: Partial<Spotlight>) => void;
  removeSpotlight: (id: string) => void;

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

  // video watch progress (per content block, 0..1) — gates lesson completion
  videoProgress: Record<string, number>;
  setVideoProgress: (blockId: string, fraction: number) => void;
  /** False when a lesson has trackable video that isn't watched enough yet. */
  canCompleteLesson: (lessonId: string) => boolean;
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
  const [spotlights, setSpotlights] = useState<Spotlight[]>(DEFAULT_SPOTLIGHTS);
  const [personas, setPersonas] = useState<Persona[]>(SEED_PERSONAS);
  const [quizResults, setQuizResults] = useState<Record<string, QuizAttempt[]>>(
    {}
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [videoProgress, setVideoProgressState] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [adminStatus, setAdminStatus] = useState<AdminStatus>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [paidReady, setPaidReady] = useState(false); // has the paid check resolved?

  // Guards the profile→Supabase sync: until the DB profile has been loaded at
  // least once for this session, the sync effect must not run — otherwise it
  // can race ahead of loadProfile and upsert the empty DEFAULT_PROFILE over
  // the user's real name/age/phone.
  const profileLoadedRef = useRef(false);
  // Same idea for the remote course/progress sync (see loadRemote below).
  const remoteLoadedForRef = useRef<string | null>(null); // user id already loaded
  const courseSyncedRef = useRef<string | null>(null); // JSON of last loaded/saved course
  const spotlightsSyncedRef = useRef<string | null>(null);
  const progressLoadedRef = useRef(false);
  const progressSyncedRef = useRef<string | null>(null);

  // Pull the published curriculum and this user's progress from Supabase.
  // Course: the DB copy is the source of truth (admin edits propagate to
  // everyone). Progress: merged with local state — completed is a union,
  // video progress takes the furthest point, quiz attempts are combined.
  const loadRemote = async (uid: string) => {
    if (!supabase || remoteLoadedForRef.current === uid) return;
    remoteLoadedForRef.current = uid;

    const [{ data: cc }, { data: sp }, { data: pr }] = await Promise.all([
      supabase
        .from("course_content")
        .select("content")
        .eq("id", SEED_COURSE.id)
        .maybeSingle(),
      supabase
        .from("course_content")
        .select("content")
        .eq("id", SPOTLIGHTS_DOC_ID)
        .maybeSingle(),
      supabase.from("user_progress").select("*").eq("user_id", uid).maybeSingle(),
    ]);

    if (cc?.content) {
      const remote = cc.content as Course;
      if (remote.id === SEED_COURSE.id) {
        setCourse(remote);
        courseSyncedRef.current = JSON.stringify(remote);
      }
    }

    if (Array.isArray(sp?.content)) {
      const remote = sp.content as Spotlight[];
      setSpotlights(remote);
      spotlightsSyncedRef.current = JSON.stringify(remote);
    }

    if (pr) {
      const remoteDone = (pr.completed as string[]) ?? [];
      setCompleted((prev) => new Set([...prev, ...remoteDone]));
      const remoteVideo = (pr.video_progress as Record<string, number>) ?? {};
      setVideoProgressState((prev) => {
        const merged = { ...prev };
        for (const [k, v] of Object.entries(remoteVideo)) {
          merged[k] = Math.max(merged[k] ?? 0, v);
        }
        return merged;
      });
      const remoteQuiz = (pr.quiz_results as Record<string, QuizAttempt[]>) ?? {};
      setQuizResults((prev) => {
        const merged: Record<string, QuizAttempt[]> = { ...prev };
        for (const [k, attempts] of Object.entries(remoteQuiz)) {
          const seen = new Set((merged[k] ?? []).map((a) => a.at));
          merged[k] = [
            ...(merged[k] ?? []),
            ...attempts.filter((a) => !seen.has(a.at)),
          ].sort((a, b) => a.at - b.at);
        }
        return merged;
      });
      const remoteNotes = (pr.notes as Record<string, string>) ?? {};
      // remote notes fill in anything this device doesn't have; local edits win
      setNotes((prev) => ({ ...remoteNotes, ...prev }));
    }
    progressLoadedRef.current = true;
  };

  // pull a logged-in user's profile row from Supabase into local state
  const loadProfile = async (uid: string) => {
    if (!supabase) return;
    // select * so a not-yet-migrated DB (no role columns) doesn't error
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    profileLoadedRef.current = true;
    if (data)
      setProfile((p) => ({
        ...p,
        name: data.name ?? p.name,
        // age is derived from the birthday when we have one (stays current
        // as years pass); the stored age is only a fallback for old rows
        birthdate: data.birthdate ?? p.birthdate,
        age: data.birthdate
          ? ageFromBirthdate(data.birthdate)
          : (data.age ?? p.age),
        phone: data.phone ?? p.phone,
        title: data.title ?? p.title,
        avatar: data.avatar ?? p.avatar,
        managerId: data.manager_id ?? p.managerId,
        role: data.role ?? p.role,
        requestedRole: data.requested_role ?? null,
      }));

    // Guarantee the position rule even if the DB trigger isn't applied: a
    // NonStop email still on "Lead" gets auto-bumped to "Agent".
    const em = (data?.email ?? "").toLowerCase();
    if (em.split("@")[1] === "nonstopglobal.co" && (!data?.role || data.role === "Lead")) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        try {
          const res = await fetch("/api/profile/sync-position", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = await res.json().catch(() => ({}));
          if (res.ok && j?.role) setProfile((p) => ({ ...p, role: j.role }));
        } catch {
          /* ignore */
        }
      }
    }
  };

  // hydrate local-only state from localStorage; auth comes from Supabase when
  // configured, otherwise from the local preview session.
  useEffect(() => {
    setRoleState(read<Role>(LS_ROLE, "user"));
    setThemeState(
      ((typeof window !== "undefined" &&
        (window.localStorage.getItem(LS_THEME) as Theme | null)) ||
        "dark") as Theme
    );
    // Use the saved course only if it matches the current curriculum version
    // (SEED_COURSE.id). An older saved course — e.g. the previous
    // "Producer Development Path" — is automatically replaced by the new one,
    // so curriculum changes show up without a manual "Reset to default".
    const savedCourse = read<Course | null>(LS_COURSE, null);
    setCourse(savedCourse?.id === SEED_COURSE.id ? savedCourse : SEED_COURSE);
    setSpotlights(read<Spotlight[]>(LS_SPOTLIGHTS, DEFAULT_SPOTLIGHTS));
    setPersonas(read<Persona[]>(LS_PERSONAS, SEED_PERSONAS));
    setQuizResults(read<Record<string, QuizAttempt[]>>(LS_QUIZ, {}));
    setProfile({ ...DEFAULT_PROFILE, ...read(LS_PROFILE, DEFAULT_PROFILE) });
    setAccounts(read<Record<string, Account>>(LS_ACCOUNTS, {}));
    setNotes(read<Record<string, string>>(LS_NOTES, {}));
    setCompleted(new Set(read<string[]>(LS_DONE, [])));
    setVideoProgressState(read<Record<string, number>>(LS_VIDEO, {}));

    if (!isSupabaseConfigured || !supabase) {
      setEmail(read<string | null>(LS_EMAIL, null));
      setReady(true);
      return;
    }

    // Supabase: resolve the session before marking ready so authenticated
    // users aren't bounced to the landing page on a hard refresh.
    let unsub: { unsubscribe: () => void } | undefined;
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) {
        setEmail(user.email ?? null);
        void loadProfile(user.id);
        void loadRemote(user.id);
      }
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // A password-reset link establishes a recovery session — send the user to
      // the reset page wherever Supabase happens to land them.
      if (
        event === "PASSWORD_RECOVERY" &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/reset-password")
      ) {
        window.location.replace("/reset-password");
        return;
      }
      const user = session?.user;
      if (user) {
        setEmail(user.email ?? null);
        void loadProfile(user.id);
        void loadRemote(user.id);
      } else {
        setEmail(null);
      }
    });
    unsub = sub.subscription;
    return () => unsub?.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_COURSE, JSON.stringify(course));
  }, [course, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_PERSONAS, JSON.stringify(personas));
  }, [personas, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_SPOTLIGHTS, JSON.stringify(spotlights));
  }, [spotlights, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_QUIZ, JSON.stringify(quizResults));
  }, [quizResults, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
  }, [profile, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_ACCOUNTS, JSON.stringify(accounts));
  }, [accounts, ready]);

  // sync profile edits back to Supabase (avatar stays local — too large for a row)
  useEffect(() => {
    if (!ready || !isSupabaseConfigured || !supabase || !email) return;
    if (!profileLoadedRef.current) return; // DB profile not loaded yet — don't clobber it
    let cancelled = false;
    (async () => {
      const { data } = await supabase!.auth.getUser();
      const user = data.user;
      if (!user || cancelled) return;
      const base = {
        id: user.id,
        email: user.email,
        name: profile.name,
        // keep the stored age fresh: recompute from the birthday when set
        age:
          (profile.birthdate ? ageFromBirthdate(profile.birthdate) : profile.age) ||
          null,
        phone: profile.phone,
        title: profile.title,
      };
      const { error } = await supabase!.from("profiles").upsert({
        ...base,
        birthdate: profile.birthdate || null,
        manager_id: profile.managerId || null,
      });
      // graceful fallback while column migrations haven't run yet
      if (error && /birthdate|manager_id/i.test(error.message)) {
        await supabase!.from("profiles").upsert(base);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.name, profile.age, profile.birthdate, profile.managerId, profile.phone, profile.title, ready, email]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_NOTES, JSON.stringify(notes));
  }, [notes, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_DONE, JSON.stringify([...completed]));
  }, [completed, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(LS_VIDEO, JSON.stringify(videoProgress));
  }, [videoProgress, ready]);

  // Admin tier: optimistic from the bootstrap owner list, then refined by
  // Supabase (which also knows runtime-added sub-admins).
  useEffect(() => {
    if (!email) {
      setAdminStatus(null);
      return;
    }
    const seed: AdminStatus = isAdminEmail(email) ? "owner" : null;
    setAdminStatus(seed);
    if (isSupabaseConfigured && supabase) {
      supabase
        .rpc("my_admin_status")
        .then(({ data, error }) => {
          if (!error) setAdminStatus(((data as AdminStatus) ?? seed) || null);
        });
    }
  }, [email]);

  const canBeAdmin = adminStatus !== null;
  const isOwner = adminStatus === "owner";
  // Managers (a position) can edit content and see analytics, but they are not
  // team admins (can't manage admins or assign positions).
  const isManager = (profile.role || "").toLowerCase() === "manager";
  // Who gets the admin tools (edit + analytics): team admins OR managers.
  const canManage = canBeAdmin || isManager;

  // The "admin" view (edit + analytics) is automatic for anyone who can manage.
  // Everyone else is a regular user. No manual toggle.
  useEffect(() => {
    setRoleState(canManage ? "admin" : "user");
  }, [canManage]);

  // Publish curriculum edits to Supabase (staff only — RLS enforces it too).
  // Debounced; skipped when the course matches what's already saved, and when
  // embedded data-URL media makes the JSON too large to ship in one request.
  useEffect(() => {
    if (!ready || !isSupabaseConfigured || !supabase || !canManage) return;
    const json = JSON.stringify(course);
    if (json === courseSyncedRef.current) return;
    if (json.length > 5_000_000) {
      console.warn(
        "[course sync] Course is too large to auto-publish (embedded uploads). " +
          "Use external URLs for big media so edits sync to the team."
      );
      return;
    }
    const t = setTimeout(async () => {
      const { error } = await supabase!.from("course_content").upsert({
        id: course.id,
        content: course,
        updated_by: email,
      });
      if (!error) courseSyncedRef.current = json;
      else console.warn("[course sync] save failed:", error.message);
    }, 1200);
    return () => clearTimeout(t);
  }, [course, ready, canManage, email]);

  // Publish spotlight edits to Supabase (staff only — same table/policies as
  // the course; stored under the fixed "spotlights" row id).
  useEffect(() => {
    if (!ready || !isSupabaseConfigured || !supabase || !canManage) return;
    const json = JSON.stringify(spotlights);
    if (json === spotlightsSyncedRef.current) return;
    if (json.length > 5_000_000) {
      console.warn("[spotlights] too large to publish — use image URLs, not huge uploads.");
      return;
    }
    const t = setTimeout(async () => {
      const { error } = await supabase!.from("course_content").upsert({
        id: SPOTLIGHTS_DOC_ID,
        content: spotlights,
        updated_by: email,
      });
      if (!error) spotlightsSyncedRef.current = json;
      else console.warn("[spotlights] save failed:", error.message);
    }, 1200);
    return () => clearTimeout(t);
  }, [spotlights, ready, canManage, email]);

  // Sync this user's progress to Supabase so it follows them across devices.
  // Waits for the initial remote load (so we merge before we overwrite).
  useEffect(() => {
    if (!ready || !isSupabaseConfigured || !supabase || !email) return;
    if (!progressLoadedRef.current) return;
    const payload = {
      completed: [...completed],
      video_progress: videoProgress,
      quiz_results: quizResults,
      notes,
    };
    const json = JSON.stringify(payload);
    if (json === progressSyncedRef.current) return;
    const t = setTimeout(async () => {
      const { data } = await supabase!.auth.getUser();
      const user = data.user;
      if (!user) return;
      const { error } = await supabase!
        .from("user_progress")
        .upsert({ user_id: user.id, ...payload });
      if (!error) progressSyncedRef.current = json;
    }, 1200);
    return () => clearTimeout(t);
  }, [completed, videoProgress, quizResults, notes, ready, email]);

  const refreshPaid = async () => {
    if (!email || !isSupabaseConfigured || !supabase) {
      setHasPaid(false);
      setPaidReady(true);
      return;
    }
    const { data, error } = await supabase.rpc("has_purchased");
    if (!error) setHasPaid(Boolean(data));
    setPaidReady(true);
  };
  useEffect(() => {
    setPaidReady(false);
    void refreshPaid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const listAdmins = async (): Promise<AdminRow[]> => {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase.rpc("list_admins");
    return error || !data ? [] : (data as AdminRow[]);
  };
  const addAdmin: Store["addAdmin"] = async (em) => {
    if (!isSupabaseConfigured || !supabase)
      return { ok: false, error: "Connect Supabase to manage admins." };
    // Go through the server route so the new admin also gets a notification
    // email (the add_admin RPC alone can't send mail). The route re-checks
    // that the caller is an owner before granting.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { ok: false, error: "Please sign in again." };
    try {
      const res = await fetch("/api/admin/add-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: em }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        return { ok: false, error: data?.error ?? "Couldn't add admin." };
      return { ok: true, emailed: Boolean(data?.emailed) };
    } catch {
      return { ok: false, error: "Network error — try again." };
    }
  };
  const removeAdmin = async (em: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase)
      return { ok: false, error: "Connect Supabase to manage admins." };
    const { data, error } = await supabase.rpc("remove_admin", { p_email: em });
    if (error) return { ok: false, error: error.message };
    if (data === "forbidden")
      return { ok: false, error: "Only owners can remove admins." };
    return { ok: true };
  };

  // reflect the theme onto <html> so CSS (html.light / html.dark) can switch
  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      // "system" follows the OS; otherwise anything that isn't "light" is dark
      const dark = theme === "system" ? mql.matches : theme !== "light";
      root.classList.toggle("dark", dark);
      root.classList.toggle("light", !dark);
    };
    apply();
    if (theme === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_THEME, t);
  };

  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_ROLE, r);
  };

  const login = (em?: string) => {
    const next = em ?? DEMO_EMAIL;
    setEmail(next);
    window.localStorage.setItem(LS_EMAIL, JSON.stringify(next));
  };
  const logout = () => {
    if (isSupabaseConfigured && supabase) void supabase.auth.signOut();
    profileLoadedRef.current = false;
    remoteLoadedForRef.current = null;
    progressLoadedRef.current = false;
    progressSyncedRef.current = null;
    courseSyncedRef.current = null;
    spotlightsSyncedRef.current = null;
    setEmail(null);
    window.localStorage.removeItem(LS_EMAIL);
    setProfile(DEFAULT_PROFILE);
    setRole("user");
  };

  const signUp: Store["signUp"] = async ({ name, email: em, password, birthdate, managerId }) => {
    const key = em.trim().toLowerCase();
    if (!name.trim()) return { ok: false, error: "Enter your name." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key))
      return { ok: false, error: "Enter a valid email address." };
    if (password.length < 6)
      return { ok: false, error: "Password must be at least 6 characters." };
    const age = ageFromBirthdate(birthdate);
    if (!birthdate || age < 13 || age > 120)
      return { ok: false, error: "Enter a valid birthday (you must be at least 13)." };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: key,
        password,
        options: {
          // age travels alongside the birthdate so the profiles trigger (and
          // age-based analytics) keep working unchanged
          data: { name: name.trim(), age, birthdate, manager_id: managerId || "" },
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) return { ok: false, error: error.message };
      setProfile({
        ...DEFAULT_PROFILE,
        name: name.trim(),
        age,
        birthdate,
        managerId: managerId || "",
      });
      if (data.session?.user) {
        // confirmation disabled — straight in
        setEmail(data.session.user.email ?? key);
        return { ok: true };
      }
      // confirmation enabled — user must click the link in their email
      return { ok: true, needsConfirmation: true };
    }

    // local preview fallback
    if (accounts[key])
      return { ok: false, error: "An account with this email already exists." };
    const account: Account = { email: key, password, name: name.trim(), age, birthdate };
    setAccounts((prev) => ({ ...prev, [key]: account }));
    setProfile({ ...DEFAULT_PROFILE, name: account.name, age, birthdate });
    login(key);
    return { ok: true };
  };

  const signIn: Store["signIn"] = async (em, password) => {
    const key = em.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: key,
        password,
      });
      if (error) {
        const m = error.message;
        const msg = /invalid login credentials/i.test(m)
          ? "Incorrect email or password."
          : /email not confirmed/i.test(m)
            ? "Please confirm your email first — check your inbox for the link."
            : m;
        return { ok: false, error: msg };
      }
      if (data.user) {
        setEmail(data.user.email ?? key);
        await loadProfile(data.user.id);
      }
      return { ok: true };
    }

    // local preview fallback
    const account = accounts[key];
    if (account) {
      if (account.password !== password)
        return { ok: false, error: "Incorrect password." };
      setProfile((p) => ({
        ...p,
        name: p.name || account.name,
        age: account.birthdate ? ageFromBirthdate(account.birthdate) : account.age,
        birthdate: account.birthdate ?? p.birthdate,
      }));
      login(key);
      return { ok: true };
    }
    // seeded admin/demo emails work without registering
    if (isAdminEmail(key) || key === DEMO_EMAIL.toLowerCase()) {
      if (!password) return { ok: false, error: "Enter your password." };
      login(key);
      return { ok: true };
    }
    return { ok: false, error: "No account found for that email." };
  };

  const resendConfirmation: Store["resendConfirmation"] = async (em) => {
    if (!isSupabaseConfigured || !supabase) return { ok: true };
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: em.trim().toLowerCase(),
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const requestPasswordReset: Store["requestPasswordReset"] = async (em) => {
    if (!isSupabaseConfigured || !supabase)
      return { ok: false, error: "Password reset isn't available in preview mode." };
    const key = em.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key))
      return { ok: false, error: "Enter a valid email address." };
    const { error } = await supabase.auth.resetPasswordForEmail(key, {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const updatePassword: Store["updatePassword"] = async (password) => {
    if (!isSupabaseConfigured || !supabase)
      return { ok: false, error: "Not available in preview mode." };
    if (password.length < 6)
      return { ok: false, error: "Password must be at least 6 characters." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const msg = /session|auth/i.test(error.message)
        ? "Your reset link has expired. Request a new one."
        : error.message;
      return { ok: false, error: msg };
    }
    return { ok: true };
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

  // A lesson that contains trackable video can only be completed once that
  // video has been watched past the threshold — no skipping to the end.
  const lessonWatchSatisfied = (lessonId: string): boolean => {
    const lesson = course.modules
      .flatMap((m) => m.lessons)
      .find((l) => l.id === lessonId);
    if (!lesson) return true;
    const vids = lesson.blocks.filter(
      (b) => b.type === "video" && isTrackableVideo(b.src)
    );
    return vids.every((b) => (videoProgress[b.id] ?? 0) >= WATCH_THRESHOLD);
  };

  const store: Store = useMemo(
    () => ({
      ready,
      email,
      loggedIn: !!email,
      login,
      logout,
      signUp,
      signIn,
      resendConfirmation,
      requestPasswordReset,
      updatePassword,
      role,
      setRole,
      canBeAdmin,
      canManage,
      adminStatus,
      isOwner,
      listAdmins,
      addAdmin,
      removeAdmin,
      hasPaid,
      paidReady,
      refreshPaid,
      theme,
      setTheme,
      profile,
      updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
      requestRoleChange: async (role) => {
        if (!isSupabaseConfigured || !supabase)
          return { ok: false, error: "Connect Supabase to request a role." };
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return { ok: false, error: "Please sign in again." };
        try {
          const res = await fetch("/api/role/request", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok)
            return { ok: false, error: data?.error ?? "Couldn't submit request." };
          setProfile((p) => ({ ...p, requestedRole: role || null }));
          return { ok: true };
        } catch {
          return { ok: false, error: "Network error — try again." };
        }
      },
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
      addQuizResult: (blockId, attempt) => {
        void track("quiz_attempt", blockId, attempt.percent);
        setQuizResults((prev) => ({
          ...prev,
          [blockId]: [...(prev[blockId] ?? []), attempt],
        }));
      },

      spotlights,
      addSpotlight: () => {
        const id = uid();
        setSpotlights((prev) => [
          ...prev,
          { id, title: "New spotlight", description: "", href: "", image: "" },
        ]);
        return id;
      },
      updateSpotlight: (id, patch) =>
        setSpotlights((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
        ),
      removeSpotlight: (id) =>
        setSpotlights((prev) => prev.filter((s) => s.id !== id)),

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
          if (next.has(lessonId)) {
            next.delete(lessonId);
          } else {
            // gate: a lesson with trackable video must be watched first
            if (!lessonWatchSatisfied(lessonId)) return prev;
            next.add(lessonId);
            void track("lesson_complete", lessonId);
          }
          return next;
        }),

      videoProgress,
      setVideoProgress: (blockId, fraction) =>
        setVideoProgressState((prev) => {
          const cur = prev[blockId] ?? 0;
          const next = Math.min(1, Math.max(0, fraction));
          // monotonic: progress only ever moves forward
          return next > cur ? { ...prev, [blockId]: next } : prev;
        }),
      canCompleteLesson: lessonWatchSatisfied,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, email, role, canBeAdmin, canManage, adminStatus, hasPaid, paidReady, theme, profile, accounts, course, spotlights, personas, quizResults, notes, completed, videoProgress]
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

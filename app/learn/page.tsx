"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { AppShell } from "@/components/AppShell";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { useStore, allLessons } from "@/lib/store";
import { track } from "@/lib/supabase";
import { ContentBlockView } from "@/components/ContentBlockView";
import { FilesTab } from "@/components/FilesTab";
import { AICoachTab } from "@/components/AICoachTab";
import type { BlockType } from "@/lib/types";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  Play,
  Image as ImageIcon,
  Film,
  Type,
  FileText,
  NotebookPen,
  AlignLeft,
  Sparkles,
  RotateCcw,
  ChevronDown,
  Trash2,
  FolderPlus,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  AlertTriangle,
  Check,
  ListChecks,
  Lock,
} from "lucide-react";
import { lessonCoachState } from "@/lib/coach";
import { isTrackableVideo } from "@/lib/video";
import { TranscriptFetchButton } from "@/components/TranscriptFetchButton";
import Plan from "@/components/ui/agent-plan";

const TABS = [
  { id: "files", label: "Files", icon: FileText },
  { id: "notes", label: "Notes", icon: NotebookPen },
  { id: "transcript", label: "Transcript", icon: AlignLeft },
  { id: "coach", label: "AI Coach", icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function LearnPage() {
  return (
    <AppShell>
      <Learn />
    </AppShell>
  );
}

function Learn() {
  const {
    course,
    role,
    completed,
    toggleComplete,
    addBlock,
    updateLessonTitle,
    resetCourse,
    addModule,
    removeModule,
    updateModuleTitle,
    addLesson,
    removeLesson,
    videoProgress,
    canCompleteLesson,
  } = useStore();
  const lessons = allLessons(course);
  const [activeId, setActiveId] = useState(lessons[0]?.id);
  const [tab, setTab] = useState<TabId>("files");
  const [editing, setEditing] = useState(false);
  // modules start collapsed — open one by clicking its header
  const [openModules, setOpenModules] = useState<Set<string>>(
    () => new Set<string>()
  );
  const toggleModule = (id: string) =>
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ---- resizable sidebar (drag the divider; collapse to a rail or go wide) ----
  const isLg = useMediaQuery("(min-width: 1024px)");
  const asideRef = useRef<HTMLElement>(null);
  const dragging = useRef(false);
  const prevWidth = useRef(320);
  const [sidebarW, setSidebarW] = useState(320); // 20rem default
  const MIN_W = 56; // almost fully shut → collapses to a rail
  const MAX_W = 1100; // open way up, near full-screen
  const collapsed = isLg && sidebarW < 120;

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("nf.sidebarW"));
    if (saved >= MIN_W && saved <= MAX_W) setSidebarW(saved);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("nf.sidebarW", String(sidebarW));
  }, [sidebarW]);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !asideRef.current) return;
      const left = asideRef.current.getBoundingClientRect().left;
      setSidebarW(Math.min(MAX_W, Math.max(MIN_W, e.clientX - left)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };
  const collapseSidebar = () => {
    prevWidth.current = sidebarW;
    setSidebarW(72);
  };
  const expandSidebar = () =>
    setSidebarW(prevWidth.current >= 160 ? prevWidth.current : 320);
  const maximizeSidebar = () => setSidebarW(MAX_W);

  const isAdmin = role === "admin";
  const active = useMemo(
    () => lessons.find((l) => l.id === activeId) ?? lessons[0],
    [lessons, activeId]
  );

  // record a lesson view for analytics whenever the open lesson changes
  useEffect(() => {
    if (active?.id) track("lesson_view", active.id);
  }, [active?.id]);

  // ---- watch gate: must finish the lesson's video before it can complete ----
  const gatedVideos = (active?.blocks ?? []).filter(
    (b) => b.type === "video" && isTrackableVideo(b.src)
  );
  const watchGated = gatedVideos.length > 0;
  const watchPct = watchGated
    ? Math.floor(
        Math.min(...gatedVideos.map((b) => videoProgress[b.id] ?? 0)) * 100
      )
    : 100;
  const watchSatisfied = active ? canCompleteLesson(active.id) : true;
  const isDone = active ? completed.has(active.id) : false;
  // locked = there's a video to watch, it isn't watched yet, and not already done
  const completeLocked = watchGated && !watchSatisfied && !isDone;

  // auto-complete once the video has been watched (one-shot per lesson, so a
  // manual un-complete still sticks)
  const autoDone = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!active) return;
    if (
      watchGated &&
      watchSatisfied &&
      !completed.has(active.id) &&
      !autoDone.current.has(active.id)
    ) {
      autoDone.current.add(active.id);
      toggleComplete(active.id);
    }
  }, [active, watchGated, watchSatisfied, completed, toggleComplete]);

  const addTypes: { t: BlockType; label: string; icon: typeof Play }[] = [
    { t: "video", label: "Video", icon: Play },
    { t: "image", label: "Image", icon: ImageIcon },
    { t: "gif", label: "GIF", icon: Film },
    { t: "text", label: "Text", icon: Type },
    { t: "quiz", label: "Quiz", icon: ListChecks },
  ];

  // Sequential unlock: a lesson stays locked until every lesson before it (in
  // course order) is complete. The current (first incomplete) lesson is open;
  // admins editing bypass this. No skipping ahead.
  const firstIncompleteIdx = lessons.findIndex((l) => !completed.has(l.id));
  const isLessonLocked = (id: string) => {
    if (isAdmin && editing) return false;
    if (firstIncompleteIdx === -1) return false; // everything done
    return lessons.findIndex((l) => l.id === id) > firstIncompleteIdx;
  };

  // course → agent-plan tracker shape (used in the sidebar when not editing)
  const planTasks = course.modules.map((m) => {
    const doneCount = m.lessons.filter((l) => completed.has(l.id)).length;
    return {
      id: m.id,
      title: m.title,
      status:
        doneCount === m.lessons.length
          ? "completed"
          : doneCount > 0
          ? "in-progress"
          : "pending",
      count: `${doneCount}/${m.lessons.length}`,
      subtasks: m.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        status: completed.has(l.id)
          ? "completed"
          : isLessonLocked(l.id)
          ? "locked"
          : "pending",
        meta: l.duration,
      })),
    };
  });

  if (!active) return null;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
      {/* ---------- LEFT: course navigation (resizable) ---------- */}
      <aside
        ref={asideRef}
        style={isLg ? { width: sidebarW } : undefined}
        className="border-b border-line lg:h-[calc(100vh-3.5rem)] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 scroll-thin"
      >
        {collapsed ? (
          <div className="flex h-full flex-col items-center gap-2 py-3">
            <button
              onClick={expandSidebar}
              title="Expand panel"
              className="p-2 text-muted-2 transition hover:text-white"
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
            {course.modules.map((m, mi) => {
              const hasActive = m.lessons.some((l) => l.id === active.id);
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    expandSidebar();
                    setOpenModules((p) => new Set(p).add(m.id));
                  }}
                  title={m.title}
                  className={`flex h-8 w-8 items-center justify-center text-xs font-bold transition ${
                    hasActive
                      ? "bg-nonstop text-white"
                      : "bg-surface-3 text-muted hover:text-white"
                  }`}
                >
                  {mi + 1}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 border-b border-line bg-ink px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="min-w-0 truncate font-display text-lg font-bold text-white">
                  {course.title}
                </h2>
                <div className="hidden shrink-0 items-center gap-0.5 lg:flex">
                  <button
                    onClick={maximizeSidebar}
                    title="Widen panel"
                    className="p-1 text-muted-2 transition hover:text-white"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={collapseSidebar}
                    title="Collapse panel"
                    className="p-1 text-muted-2 transition hover:text-white"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-2">
                {completed.size}/{lessons.length} lessons complete
              </p>
              <div className="mt-2 h-1.5 overflow-hidden bg-surface-3">
                <div
                  className="h-full bg-nonstop"
                  style={{
                    width: `${(completed.size / lessons.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {!editing && (
              <div className="p-3">
                <Plan
                  tasks={planTasks}
                  activeSubtaskId={active.id}
                  onSelectSubtask={(_m, lessonId) => {
                    if (!isLessonLocked(lessonId)) setActiveId(lessonId);
                  }}
                  onToggleSubtask={(_m, lessonId) => {
                    if (!isLessonLocked(lessonId)) toggleComplete(lessonId);
                  }}
                />
              </div>
            )}

            <nav className={`space-y-1.5 p-3 ${editing ? "" : "hidden"}`}>
          {course.modules.map((m, mi) => {
            const isOpen = openModules.has(m.id);
            const doneInModule = m.lessons.filter((l) =>
              completed.has(l.id)
            ).length;
            const moduleComplete = doneInModule === m.lessons.length;
            const hasActive = m.lessons.some((l) => l.id === active.id);
            return (
              <div
                key={m.id}
                className="overflow-hidden border border-line bg-surface/40"
              >
                {/* module header */}
                {editing ? (
                  <div
                    className={`flex items-center gap-2 px-3 py-2.5 ${
                      hasActive ? "bg-surface-2" : ""
                    }`}
                  >
                    <button
                      onClick={() => toggleModule(m.id)}
                      className="shrink-0 text-muted-2 transition hover:text-white"
                      title={isOpen ? "Collapse" : "Expand"}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-surface-3 text-xs font-bold text-muted">
                      {mi + 1}
                    </span>
                    <input
                      value={m.title}
                      onChange={(e) => updateModuleTitle(m.id, e.target.value)}
                      className="min-w-0 flex-1 border border-line-2 bg-surface-2 px-2 py-1 text-sm font-semibold text-white outline-none focus:border-nonstop"
                    />
                    <button
                      onClick={() =>
                        window.confirm(
                          `Delete module "${m.title}" and its lessons?`
                        ) && removeModule(m.id)
                      }
                      className="shrink-0 p-1 text-muted-2 transition hover:text-red-400"
                      title="Delete module"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleModule(m.id)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-surface-2 ${
                      hasActive ? "bg-surface-2" : ""
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center text-xs font-bold ${
                        moduleComplete
                          ? "bg-nonstop text-white"
                          : "bg-surface-3 text-muted"
                      }`}
                    >
                      {moduleComplete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        mi + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-2">
                        Module {mi + 1}
                      </span>
                      <span className="block truncate text-sm font-semibold text-white">
                        {m.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-2">
                      {doneInModule}/{m.lessons.length}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-2 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}

                {/* lessons */}
                {isOpen && (
                  <div className="border-t border-line p-2">
                    <ul className="space-y-0.5">
                      {m.lessons.map((l) => {
                        const done = completed.has(l.id);
                        const isActive = l.id === active.id;
                        return (
                          <li key={l.id} className="flex items-center gap-1">
                            <button
                              onClick={() => setActiveId(l.id)}
                              className={`group flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left text-sm transition ${
                                isActive
                                  ? "bg-surface-3 text-white ring-1 ring-line-2"
                                  : "text-muted hover:bg-surface-2 hover:text-white"
                              }`}
                            >
                              {done ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-300" />
                              ) : (
                                <Circle className="h-4 w-4 shrink-0 text-muted-2" />
                              )}
                              <span className="flex-1 truncate">{l.title}</span>
                              <span className="text-[11px] text-muted-2">
                                {l.duration}
                              </span>
                            </button>
                            {editing && lessons.length > 1 && (
                              <button
                                onClick={() =>
                                  window.confirm(`Delete lesson "${l.title}"?`) &&
                                  removeLesson(l.id)
                                }
                                className="shrink-0 p-1.5 text-muted-2 transition hover:text-red-400"
                                title="Delete lesson"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {editing && (
                      <button
                        onClick={() => {
                          const id = addLesson(m.id);
                          setActiveId(id);
                        }}
                        className="mt-1 flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-surface-2"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add lesson
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {editing && (
            <button
              onClick={() => {
                const id = addModule();
                setOpenModules((prev) => new Set(prev).add(id));
              }}
              className="flex w-full items-center justify-center gap-1.5 border border-dashed border-line-2 px-3 py-2.5 text-sm font-semibold text-muted transition hover:border-zinc-500 hover:text-white"
            >
              <FolderPlus className="h-4 w-4" /> Add module
            </button>
          )}
            </nav>
          </>
        )}
      </aside>

      {/* ---------- drag divider ---------- */}
      <div
        onMouseDown={startDrag}
        onDoubleClick={() => setSidebarW(320)}
        title="Drag to resize · double-click to reset"
        className="group hidden w-1 shrink-0 cursor-col-resize items-center justify-center bg-line transition-colors hover:bg-nonstop lg:flex"
      >
        <span className="h-8 w-1 bg-line-2 transition-colors group-hover:bg-nonstop" />
      </div>

      {/* ---------- RIGHT: lesson content ---------- */}
      <section className="min-w-0 flex-1 px-4 py-6 lg:px-8">
        {/* header row */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-2">
              {active.moduleTitle}
            </p>
            {editing ? (
              <input
                value={active.title}
                onChange={(e) => updateLessonTitle(active.id, e.target.value)}
                className="mt-1 w-full max-w-lg border border-line-2 bg-surface-2 px-2 py-1 font-display text-2xl font-bold text-white outline-none"
              />
            ) : (
              <h1 className="mt-1 font-display text-3xl font-bold text-white">
                {active.title}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setEditing((e) => !e)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition ${
                  editing
                    ? "bg-nonstop text-white"
                    : "border border-line-2 text-white hover:border-zinc-500"
                }`}
              >
                <Pencil className="h-4 w-4" />
                {editing ? "Done editing" : "Edit"}
              </button>
            )}
            {/* liquid-glass complete button — warm (not orange-orange) glow */}
            <LiquidButton
              onClick={() => {
                if (!completeLocked) toggleComplete(active.id);
              }}
              disabled={completeLocked}
              size="default"
              title={
                completeLocked
                  ? `Finish watching the video to complete this lesson (${watchPct}% watched)`
                  : undefined
              }
              className={`rounded-full text-sm font-semibold ${
                isDone
                  ? "text-nonstop shadow-[0_0_26px_-6px_rgba(255,150,70,0.5)]"
                  : completeLocked
                  ? "cursor-not-allowed text-muted-2"
                  : "text-white shadow-[0_0_22px_-8px_rgba(255,150,70,0.35)] hover:text-nonstop"
              }`}
            >
              {isDone ? (
                <motion.span
                  key="done"
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 600, damping: 18 }}
                >
                  {/* orange checkmark on completion */}
                  <CheckCircle2 className="h-4 w-4 text-nonstop" strokeWidth={2.5} />
                </motion.span>
              ) : completeLocked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              {isDone
                ? "Completed"
                : completeLocked
                ? `Watch to complete · ${watchPct}%`
                : "Mark complete"}
            </LiquidButton>
          </div>
        </div>

        {/* admin editing banner */}
        {editing && (
          <div className="mb-4 flex flex-wrap items-center gap-2 border border-line-2 bg-surface-3 px-4 py-3">
            <span className="text-sm font-semibold text-zinc-300">Edit mode</span>
            <span className="text-xs text-muted">
              Changes save automatically to this browser — no backend needed.
            </span>
            <button
              onClick={resetCourse}
              className="ml-auto inline-flex items-center gap-1.5 border border-line-2 px-2.5 py-1.5 text-xs text-muted transition hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to default
            </button>
          </div>
        )}

        {/* content blocks */}
        <div className="space-y-5">
          {active.blocks.map((b, i) => (
            <ContentBlockView
              key={b.id}
              lessonId={active.id}
              block={b}
              editing={editing}
              index={i}
              total={active.blocks.length}
            />
          ))}
        </div>

        {/* add-block controls (admin) */}
        {editing && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border border-dashed border-line-2 p-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-2">
              Add block
            </span>
            {addTypes.map(({ t, label, icon: Icon }) => (
              <button
                key={t}
                onClick={() => addBlock(active.id, t)}
                className="inline-flex items-center gap-1.5 border border-line-2 px-3 py-1.5 text-sm font-semibold text-white transition hover:border-zinc-500 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ---------- bottom utility tabs ---------- */}
        <div className="mt-8 border border-line bg-surface/50">
          <div className="flex items-center gap-1 border-b border-line px-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const activeTab = tab === t.id;
              const count =
                t.id === "files" ? active.files.length : undefined;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                    activeTab ? "text-white" : "text-muted-2 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {count !== undefined && count > 0 && (
                    <span className="bg-surface-3 px-1.5 text-[10px] text-muted">
                      {count}
                    </span>
                  )}
                  {activeTab && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 bg-nonstop" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {tab === "files" && <FilesTab lesson={active} isAdmin={isAdmin} />}
            {tab === "notes" && <NotesTab lessonId={active.id} />}
            {tab === "transcript" && (
              <TranscriptTab lessonId={active.id} editing={editing} />
            )}
            {tab === "coach" && <AICoachTab lesson={active} />}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- responsive media query hook ---------- */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/* ---------- Notes (personal, autosave) ---------- */
function NotesTab({ lessonId }: { lessonId: string }) {
  const { notes, setNote } = useStore();
  return (
    <div>
      <textarea
        value={notes[lessonId] ?? ""}
        onChange={(e) => setNote(lessonId, e.target.value)}
        placeholder="Your private notes for this lesson… (auto-saves)"
        className="min-h-48 w-full resize-y border border-line-2 bg-surface-2 p-4 text-sm leading-relaxed text-zinc-200 outline-none focus:border-nonstop"
      />
      <p className="mt-2 text-xs text-muted-2">
        Auto-saved to this browser · builds your personal knowledge base.
      </p>
    </div>
  );
}

/* ---------- Transcript (admin-editable) ---------- */
function TranscriptTab({ lessonId, editing }: { lessonId: string; editing: boolean }) {
  const { course, updateTranscript } = useStore();
  const lesson = allLessons(course).find((l) => l.id === lessonId);
  if (!lesson) return null;

  const vid = lessonCoachState(lesson);
  const stale = vid.hasRealVideo && !vid.transcriptMatches;

  return (
    <div className="space-y-3">
      {/* match status + one-click fetch (admins, any time) */}
      {vid.hasRealVideo && (
        <div
          className={`border px-3 py-2 text-xs ${
            stale
              ? "border-amber-500/40 bg-amber-500/5 text-amber-300"
              : "border-green-500/30 bg-green-500/10 text-green-300"
          }`}
        >
          <div className="flex items-start gap-1.5">
            {stale ? (
              <>
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  This transcript doesn&apos;t match the current video — the AI
                  Coach won&apos;t use it until it does.
                </span>
              </>
            ) : (
              <>
                <Check className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>Transcript matches the current video.</span>
              </>
            )}
          </div>
          <TranscriptFetchButton lessonId={lessonId} className="mt-2" />
        </div>
      )}

      {editing ? (
        <textarea
          value={lesson.transcript}
          onChange={(e) => updateTranscript(lessonId, e.target.value)}
          placeholder="Paste the transcript of THIS video (or use Transcribe with Whisper). The AI Coach analyzes this text to know the video's contents."
          className="min-h-48 w-full resize-y border border-line-2 bg-surface-2 p-4 text-sm leading-relaxed text-zinc-200 outline-none focus:border-nonstop"
        />
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
            {lesson.transcript || (
              <span className="text-muted-2">No transcript yet.</span>
            )}
          </p>
          <p className="text-xs text-muted-2">
            The AI Coach reads this transcript to understand the video. In
            production it&apos;s generated from the video automatically (Whisper/Mux).
          </p>
        </>
      )}
    </div>
  );
}

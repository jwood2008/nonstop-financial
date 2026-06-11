"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ContentBlockView } from "@/components/ContentBlockView";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { useStore } from "@/lib/store";
import { track } from "@/lib/supabase";
import type { BlockType, Lesson } from "@/lib/types";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ImageIcon,
  ListChecks,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
  Type,
  X,
} from "lucide-react";

/* "In Depth" — lead-type training tracks (IUL, MP, VETS, FEX, Gen Life, …).
   Different agencies run different leads, so each type gets its own track.
   Unlike the main course (sequential, no skipping), these are the one thing
   agents can jump into DIRECTLY from the nav. Admin-edited, like the course. */

export default function LeadsPage() {
  return (
    <AppShell>
      <Leads />
    </AppShell>
  );
}

function Leads() {
  const {
    leadCourse,
    canBeAdmin,
    completed,
    toggleComplete,
    canCompleteLesson,
    addTrack,
    removeTrack,
    updateTrack,
    addTrackLesson,
    removeTrackLesson,
    addBlock,
    updateLessonTitle,
  } = useStore();

  const [editing, setEditing] = useState(false);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const tracks = leadCourse.modules;
  const open = tracks.find((t) => t.id === trackId) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      <PageHeader
        label="In Depth"
        title={open ? open.title : "Train for the leads you run"}
        meta={
          open
            ? open.description || "Lead-type training track"
            : "Every agency runs different leads — pick your type and go deep. No sequence, jump straight in."
        }
        actions={
          <div className="flex items-center gap-2">
            {open && (
              <button
                onClick={() => {
                  setTrackId(null);
                  setActiveId(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> All lead types
              </button>
            )}
            {canBeAdmin && (
              <button
                onClick={() => setEditing((e) => !e)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  editing
                    ? "border-nonstop bg-nonstop text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:text-white"
                }`}
              >
                {editing ? (
                  <>
                    <X className="h-3.5 w-3.5" /> Done editing
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5" /> Edit tracks
                  </>
                )}
              </button>
            )}
          </div>
        }
      />

      {!open ? (
        <TrackGrid
          tracks={tracks}
          completed={completed}
          editing={editing && canBeAdmin}
          onOpen={(id) => setTrackId(id)}
          onAdd={() => setTrackId(addTrack())}
          onRemove={removeTrack}
          onUpdate={updateTrack}
        />
      ) : (
        <TrackView
          track={open}
          editing={editing && canBeAdmin}
          completed={completed}
          activeId={activeId}
          setActiveId={setActiveId}
          toggleComplete={toggleComplete}
          canCompleteLesson={canCompleteLesson}
          addTrackLesson={addTrackLesson}
          removeTrackLesson={removeTrackLesson}
          addBlock={addBlock}
          updateLessonTitle={updateLessonTitle}
        />
      )}
    </div>
  );
}

/* ── the grid of lead-type cards ── */
function TrackGrid({
  tracks,
  completed,
  editing,
  onOpen,
  onAdd,
  onRemove,
  onUpdate,
}: {
  tracks: { id: string; title: string; description?: string; lessons: { id: string }[] }[];
  completed: Set<string>;
  editing: boolean;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: { title?: string; description?: string }) => void;
}) {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {tracks.map((t) => {
        const done = t.lessons.filter((l) => completed.has(l.id)).length;
        const pct = t.lessons.length
          ? Math.round((done / t.lessons.length) * 100)
          : 0;
        return editing ? (
          <div
            key={t.id}
            className="rounded-3xl border border-nonstop/30 bg-white/[0.03] p-5"
          >
            <div className="flex items-start gap-2">
              <input
                value={t.title}
                onChange={(e) => onUpdate(t.id, { title: e.target.value })}
                placeholder="Lead type (e.g. IUL)"
                className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 font-display text-lg font-bold text-white outline-none focus:border-nonstop"
              />
              <button
                onClick={() => onRemove(t.id)}
                title="Remove this track"
                className="shrink-0 rounded-lg border border-white/10 p-2 text-white/40 transition hover:border-red-400/40 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={t.description ?? ""}
              onChange={(e) => onUpdate(t.id, { description: e.target.value })}
              placeholder="One-line description of this lead type…"
              rows={2}
              className="mt-2 w-full resize-none rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-nonstop"
            />
            <button
              onClick={() => onOpen(t.id)}
              className="mt-2 text-xs font-semibold text-nonstop hover:underline"
            >
              Open track → ({t.lessons.length} lessons)
            </button>
          </div>
        ) : (
          <button
            key={t.id}
            onClick={() => onOpen(t.id)}
            className="group relative block min-h-[180px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-nonstop/40 hover:shadow-[0_18px_44px_-18px_rgba(255,95,31,0.35)]"
          >
            <Target className="h-5 w-5 text-nonstop" />
            <h3 className="mt-3 font-display text-2xl font-bold text-white">
              {t.title}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/55">
              {t.description || "Training for this lead type."}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-white/40">
                {t.lessons.length === 0
                  ? "Content coming soon"
                  : `${t.lessons.length} lesson${t.lessons.length === 1 ? "" : "s"}${
                      done > 0 ? ` · ${pct}% done` : ""
                    }`}
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-nonstop">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        );
      })}
      {editing && (
        <button
          onClick={onAdd}
          className="flex min-h-[180px] items-center justify-center rounded-3xl border border-dashed border-white/20 text-sm font-semibold text-white/55 transition hover:border-nonstop hover:text-white"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add lead type
        </button>
      )}
    </div>
  );
}

/* ── one track: lesson list + content (direct access, no sequence) ── */
function TrackView({
  track: t,
  editing,
  completed,
  activeId,
  setActiveId,
  toggleComplete,
  canCompleteLesson,
  addTrackLesson,
  removeTrackLesson,
  addBlock,
  updateLessonTitle,
}: {
  track: {
    id: string;
    title: string;
    lessons: Lesson[];
  };
  editing: boolean;
  completed: Set<string>;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  toggleComplete: (id: string) => void;
  canCompleteLesson: (id: string) => boolean;
  addTrackLesson: (trackId: string) => string;
  removeTrackLesson: (id: string) => void;
  addBlock: (lessonId: string, type: BlockType) => void;
  updateLessonTitle: (lessonId: string, title: string) => void;
}) {
  const lessons = t.lessons;
  const active = useMemo(
    () => lessons.find((l) => l.id === activeId) ?? lessons[0] ?? null,
    [lessons, activeId]
  );

  // lt- ids land in the "Program" analytics bucket alongside the course
  useEffect(() => {
    if (active?.id) track("lesson_view", active.id);
  }, [active?.id]);

  const isDone = active ? completed.has(active.id) : false;
  const locked = active ? !canCompleteLesson(active.id) && !isDone : false;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[250px_1fr]">
      <aside className="space-y-1.5">
        {lessons.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/45">
            {editing
              ? "No lessons yet — add the first one."
              : "Content for this lead type is coming soon."}
          </p>
        )}
        {lessons.map((l) => (
          <div key={l.id} className="flex items-center gap-1">
            <button
              onClick={() => setActiveId(l.id)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                active?.id === l.id
                  ? "bg-nonstop/15 font-semibold text-nonstop"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              {completed.has(l.id) && (
                <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
              )}
              <span className="truncate">{l.title}</span>
            </button>
            {editing && (
              <button
                onClick={() => removeTrackLesson(l.id)}
                title="Remove lesson"
                className="shrink-0 rounded p-1.5 text-white/30 hover:text-red-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {editing && (
          <button
            onClick={() => setActiveId(addTrackLesson(t.id))}
            className="w-full rounded-xl border border-dashed border-white/20 px-3 py-2.5 text-xs font-semibold text-white/55 transition hover:border-nonstop hover:text-white"
          >
            <Plus className="mr-1 inline h-3.5 w-3.5" /> Add lesson
          </button>
        )}
      </aside>

      <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
        {!active ? (
          <p className="py-16 text-center text-sm text-white/45">
            {editing ? "Add a lesson to get started." : "Lessons appear here soon."}
          </p>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              {editing ? (
                <input
                  value={active.title}
                  onChange={(e) => updateLessonTitle(active.id, e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 font-display text-xl font-bold text-white outline-none focus:border-nonstop"
                />
              ) : (
                <h2 className="font-display text-2xl font-bold text-white">
                  {active.title}
                </h2>
              )}
              {!editing && (
                <LiquidButton
                  onClick={() => toggleComplete(active.id)}
                  disabled={locked}
                  size="sm"
                  title={locked ? "Watch the video first to complete this lesson" : undefined}
                  className={`rounded-full font-semibold ${
                    isDone
                      ? "text-nonstop shadow-[0_0_26px_-6px_rgba(255,150,70,0.5)]"
                      : locked
                        ? "cursor-not-allowed text-white/30"
                        : "text-white shadow-[0_0_22px_-8px_rgba(255,150,70,0.35)] hover:text-nonstop"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  {isDone ? "Completed" : "Mark complete"}
                </LiquidButton>
              )}
            </div>

            <div className="space-y-6">
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

            {editing && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5">
                {(
                  [
                    ["video", Play, "Video"],
                    ["image", ImageIcon, "Image"],
                    ["text", Type, "Text"],
                    ["quiz", ListChecks, "Quiz"],
                  ] as [BlockType, typeof Play, string][]
                ).map(([type, Icon, label]) => (
                  <button
                    key={type}
                    onClick={() => addBlock(active.id, type)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/70 transition hover:border-nonstop hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" /> Add {label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

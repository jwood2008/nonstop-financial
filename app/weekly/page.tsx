"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ContentBlockView } from "@/components/ContentBlockView";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { useStore } from "@/lib/store";
import { supabase, isSupabaseConfigured, track } from "@/lib/supabase";
import type { BlockType } from "@/lib/types";
import {
  CalendarDays,
  Check,
  ImageIcon,
  ListChecks,
  Megaphone,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
  Type,
  X,
} from "lucide-react";

/* Weekly Training — each manager runs their own program for their team,
   organized as Week 1, Week 2, … (same lesson/block shape as the course,
   so the same editors and quizzes work). Includes the team chat, where
   manager messages can be posted as pinned UPDATES. */

type Message = {
  id: number;
  team_id: string;
  user_id: string;
  body: string;
  is_update: boolean;
  created_at: string;
  profiles?: { name: string | null; email: string | null } | null;
};

export default function WeeklyPage() {
  return (
    <AppShell>
      <Weekly />
    </AppShell>
  );
}

function Weekly() {
  const {
    userId,
    teamId,
    setTeamId,
    teamCourse,
    canBeAdmin,
    profile,
    completed,
    toggleComplete,
    canCompleteLesson,
    addWeek,
    removeWeek,
    updateWeekTitle,
    addWeekLesson,
    removeWeekLesson,
    addBlock,
    updateLessonTitle,
  } = useStore();

  const isManager = (profile.role || "").toLowerCase() === "manager";
  const canEdit = canBeAdmin || (isManager && teamId === userId);

  const [editing, setEditing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // admins pick which manager's program to view/edit
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!canBeAdmin || !isSupabaseConfigured || !supabase) return;
    supabase.rpc("list_managers").then(({ data, error }) => {
      if (error || !data) return;
      const list = data as { id: string; name: string }[];
      setManagers(list);
      if (!teamId && list.length > 0) setTeamId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canBeAdmin]);

  const weeks = teamCourse?.modules ?? [];
  const lessons = useMemo(() => weeks.flatMap((w) => w.lessons), [weeks]);
  const active = lessons.find((l) => l.id === activeId) ?? lessons[0] ?? null;

  // record weekly lesson views (ids are wt- prefixed → analytics "Weekly")
  useEffect(() => {
    if (active?.id) track("lesson_view", active.id);
  }, [active?.id]);

  if (!teamId) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <CalendarDays className="mx-auto h-10 w-10 text-zinc-400" />
        <h1 className="mt-4 font-display text-2xl font-bold text-white">
          Weekly Training
        </h1>
        <p className="mt-2 text-sm text-muted">
          {canBeAdmin
            ? "No managers yet — promote one in Analytics → Users and their weekly program appears here."
            : "You're not on a team yet. Pick your manager in Settings and your team's weekly training shows up here."}
        </p>
      </div>
    );
  }

  const isDone = active ? completed.has(active.id) : false;
  const completeLocked = active ? !canCompleteLesson(active.id) && !isDone : false;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      <PageHeader
        label={canEdit ? "Your team's program" : "From your manager"}
        title="Weekly Training"
        meta="Week by week — videos, drills, and quizzes from your manager."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canBeAdmin && managers.length > 0 && (
              <select
                value={teamId ?? ""}
                onChange={(e) => {
                  setTeamId(e.target.value || null);
                  setActiveId(null);
                }}
                title="Whose team's program to view"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-nonstop"
              >
                {managers.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#15161a]">
                    Team · {m.name}
                  </option>
                ))}
              </select>
            )}
            {canEdit && (
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
                    <Pencil className="h-3.5 w-3.5" /> Edit program
                  </>
                )}
              </button>
            )}
          </div>
        }
      />

      <Updates teamId={teamId} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[230px_1fr_300px]">
        {/* ── weeks sidebar ── */}
        <aside className="space-y-3">
          {weeks.length === 0 && (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/45">
              {canEdit
                ? "No weeks yet — add Week 1 to start the program."
                : "Your manager hasn't posted training yet."}
            </p>
          )}
          {weeks.map((w) => (
            <div key={w.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={w.title}
                    onChange={(e) => updateWeekTitle(w.id, e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-2 py-1 text-sm font-bold text-white outline-none focus:border-nonstop"
                  />
                  <button
                    onClick={() => removeWeek(w.id)}
                    title="Remove week"
                    className="shrink-0 rounded-lg p-1.5 text-white/40 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="px-1 text-sm font-bold text-white">{w.title}</p>
              )}
              <ul className="mt-2 space-y-1">
                {w.lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveId(l.id)}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                        active?.id === l.id
                          ? "bg-nonstop/15 font-semibold text-nonstop"
                          : "text-white/65 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {completed.has(l.id) && (
                        <Check className="h-3 w-3 shrink-0 text-green-400" />
                      )}
                      <span className="truncate">{l.title}</span>
                    </button>
                    {editing && (
                      <button
                        onClick={() => removeWeekLesson(l.id)}
                        title="Remove lesson"
                        className="shrink-0 rounded p-1 text-white/30 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {editing && (
                <button
                  onClick={() => setActiveId(addWeekLesson(w.id))}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-white/45 hover:text-nonstop"
                >
                  <Plus className="h-3 w-3" /> Add lesson
                </button>
              )}
            </div>
          ))}
          {editing && (
            <button
              onClick={() => addWeek()}
              className="w-full rounded-2xl border border-dashed border-white/20 px-3 py-2.5 text-xs font-semibold text-white/55 transition hover:border-nonstop hover:text-white"
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" /> Add week
            </button>
          )}
        </aside>

        {/* ── lesson content ── */}
        <section className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
          {!active ? (
            <p className="py-16 text-center text-sm text-white/45">
              {weeks.length === 0
                ? "Training appears here as your manager posts it."
                : "Pick a lesson on the left."}
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
                  /* liquid-glass complete button — warm glow, matches /learn */
                  <LiquidButton
                    onClick={() => toggleComplete(active.id)}
                    disabled={completeLocked}
                    size="sm"
                    title={
                      completeLocked
                        ? "Watch the video first to complete this lesson"
                        : undefined
                    }
                    className={`rounded-full font-semibold ${
                      isDone
                        ? "text-nonstop shadow-[0_0_26px_-6px_rgba(255,150,70,0.5)]"
                        : completeLocked
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

        {/* ── team chat ── */}
        <TeamChat teamId={teamId} canPostUpdates={canEdit} myId={userId} />
      </div>
    </div>
  );
}

/* ── pinned manager updates ── */
function Updates({ teamId }: { teamId: string }) {
  const [updates, setUpdates] = useState<Message[]>([]);
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    const load = () =>
      supabase!
        .from("team_messages")
        .select("*, profiles:user_id(name, email)")
        .eq("team_id", teamId)
        .eq("is_update", true)
        .order("created_at", { ascending: false })
        .limit(3)
        .then(({ data, error }) => {
          if (!cancelled && !error && data) setUpdates(data as Message[]);
        });
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [teamId]);

  if (updates.length === 0) return null;
  return (
    <div className="mt-6 space-y-2">
      {updates.map((u) => (
        <div
          key={u.id}
          className="flex items-start gap-3 rounded-2xl border border-nonstop/30 bg-nonstop/[0.07] px-4 py-3"
        >
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-nonstop" />
          <div className="min-w-0">
            <p className="text-sm leading-relaxed text-white">{u.body}</p>
            <p className="mt-0.5 text-[11px] text-white/40">
              {senderName(u)} · {timeAgo(u.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── team chat panel ── */
function TeamChat({
  teamId,
  canPostUpdates,
  myId,
}: {
  teamId: string;
  canPostUpdates: boolean;
  myId: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [asUpdate, setAsUpdate] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    const load = () =>
      supabase!
        .from("team_messages")
        .select("*, profiles:user_id(name, email)")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true })
        .limit(200)
        .then(({ data, error }) => {
          if (cancelled || error || !data) return;
          setMessages(data as Message[]);
        });
    load();
    const t = setInterval(load, 5000); // simple polling keeps it dependency-free
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [teamId]);

  // stick to the bottom when new messages arrive
  useEffect(() => {
    if (messages.length !== countRef.current) {
      countRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !supabase || sending) return;
    setSending(true);
    setError(null);
    const { error: err } = await supabase
      .from("team_messages")
      .insert({ team_id: teamId, body, is_update: canPostUpdates && asUpdate });
    setSending(false);
    if (err) {
      // surface WHY instead of failing silently (e.g. migration not run yet)
      setError(
        /PGRST205|schema cache/i.test(err.message)
          ? "Chat isn't set up yet — run supabase/weekly-training.sql in the SQL Editor."
          : err.message
      );
      return;
    }
    {
      setDraft("");
      setAsUpdate(false);
      const { data } = await supabase
        .from("team_messages")
        .select("*, profiles:user_id(name, email)")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMessages(data as Message[]);
    }
  };

  return (
    <aside className="flex h-[560px] flex-col rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-sm font-bold text-white">Team chat</p>
        <p className="text-[11px] text-white/40">
          Just your team — ask questions, share wins.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-xs text-white/35">
            No messages yet — say hi 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  m.is_update
                    ? "border border-nonstop/40 bg-nonstop/15"
                    : mine
                      ? "bg-nonstop/90 text-white"
                      : "bg-white/[0.07]"
                }`}
              >
                {!mine && (
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                    {senderName(m)}
                    {m.is_update && <span className="ml-1 text-nonstop">· update</span>}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm leading-snug text-white">
                  {m.body}
                </p>
                <p className={`mt-0.5 text-[10px] ${mine ? "text-white/60" : "text-white/35"}`}>
                  {timeAgo(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 p-3">
        {error && (
          <p className="mb-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-[11px] leading-snug text-red-300">
            {error}
          </p>
        )}
        {canPostUpdates && (
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-[11px] text-white/55">
            <input
              type="checkbox"
              checked={asUpdate}
              onChange={(e) => setAsUpdate(e.target.checked)}
              className="accent-[#ff5f1f]"
            />
            <Megaphone className="h-3 w-3" /> Post as team update (pinned above)
          </label>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Message your team…"
            className="max-h-28 min-h-[2.5rem] w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-nonstop"
          />
          <button
            onClick={() => void send()}
            disabled={sending || !draft.trim()}
            className="shrink-0 rounded-xl bg-nonstop p-2.5 text-white transition hover:bg-nonstop-dark disabled:opacity-40"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function senderName(m: Message) {
  return (
    m.profiles?.name?.trim() ||
    m.profiles?.email?.split("@")[0] ||
    "Teammate"
  );
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

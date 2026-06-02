"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/types";
import {
  readLesson,
  summarizeLesson,
  explainTopConcept,
  lessonCoachState,
} from "@/lib/coach";
import { TranscriptFetchButton } from "./TranscriptFetchButton";
import {
  Sparkles,
  ListChecks,
  Wand2,
  FileText,
  Type,
  Captions,
  AlertTriangle,
} from "lucide-react";

/**
 * AI Coach — reads THIS lesson's actual content (video transcript + text blocks
 * + media captions) and generates a summary / quiz / explanation from it. No
 * generic filler: if there's no transcript, it says so (in production the
 * transcript auto-generates from the video).
 */
export function AICoachTab({ lesson }: { lesson: Lesson }) {
  const [view, setView] = useState<"summary" | "explain" | null>(null);
  const k = readLesson(lesson);
  const vid = lessonCoachState(lesson);

  return (
    <div className="space-y-4">
      {/* what the coach is analyzing */}
      <div className="flex flex-wrap items-center gap-2 border border-line bg-surface-2 px-3 py-2 text-xs">
        <span className="font-semibold text-white">Analyzing this lesson:</span>
        <Chip
          icon={Captions}
          ok={k.sources.hasTranscript && vid.transcriptMatches}
          label={
            !k.sources.hasTranscript
              ? "No transcript"
              : vid.transcriptMatches
              ? "Video transcript"
              : "Transcript ≠ current video"
          }
        />
        <Chip icon={Type} ok={k.sources.textCount > 0} label={`${k.sources.textCount} text`} />
        <Chip
          icon={FileText}
          ok={k.sources.mediaCount > 0}
          label={`${k.sources.mediaCount} captions`}
        />
      </div>

      {vid.hasRealVideo && !vid.transcriptMatches ? (
        <div className="flex flex-col items-center gap-2 border border-dashed border-amber-500/40 bg-amber-500/5 py-8 text-center">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
          <p className="text-sm text-white">This video has no matching transcript.</p>
          <p className="max-w-md text-xs text-muted-2">
            The coach can only analyze the <b>actual video</b> through its
            transcript — and this lesson&apos;s transcript wasn&apos;t written for
            the video that&apos;s loaded now. Open the <b>Transcript</b> tab and
            either pull its transcript or paste the real one. Then the summary
            &amp; quiz will be built from this video&apos;s contents.
          </p>
          <TranscriptFetchButton lessonId={lesson.id} className="mt-1" />
        </div>
      ) : !k.hasContent ? (
        <div className="flex flex-col items-center gap-2 border border-dashed border-amber-500/40 bg-amber-500/5 py-8 text-center">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
          <p className="text-sm text-white">No content to analyze yet.</p>
          <p className="max-w-sm text-xs text-muted-2">
            The coach reads this lesson&apos;s <b>video transcript</b> and text to
            build summaries and quizzes. Add a transcript (Transcript tab) or text
            blocks. In production the transcript is generated from the video
            automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView("summary")}
              className="inline-flex items-center gap-1.5 bg-nonstop px-3 py-2 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
            >
              <Sparkles className="h-4 w-4" /> Summarize Lesson
            </button>
            <button
              onClick={() => setView("explain")}
              className="inline-flex items-center gap-1.5 border border-line-2 px-3 py-2 text-sm font-semibold text-white transition hover:border-zinc-500"
            >
              <Wand2 className="h-4 w-4" /> Explain This
            </button>
          </div>

          {!view && (
            <div className="flex flex-col items-center gap-2 border border-dashed border-line-2 py-10 text-center">
              <Sparkles className="h-8 w-8 text-zinc-300" />
              <p className="text-sm text-muted">
                Coach has read this lesson&apos;s content. Pick an action above.
              </p>
            </div>
          )}

          {view === "summary" && <SummaryView lesson={lesson} />}
          {view === "explain" && <ExplainView lesson={lesson} />}
        </>
      )}
    </div>
  );
}

function Chip({
  icon: Icon,
  ok,
  label,
}: {
  icon: typeof FileText;
  ok: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-0.5 ${
        ok
          ? "border-green-500/30 bg-green-500/10 text-green-300"
          : "border-line-2 text-muted-2"
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function SummaryView({ lesson }: { lesson: Lesson }) {
  const s = summarizeLesson(lesson);
  return (
    <div className="space-y-4 border border-line bg-surface p-5">
      <Section icon={ListChecks} title="Key Takeaways" items={s.takeaways} />
      <Section icon={ListChecks} title="Action Steps" items={s.actions} />
      <div>
        <h4 className="mb-2 font-display text-sm font-semibold text-white">
          Key Concepts (pulled from the lesson)
        </h4>
        <div className="flex flex-wrap gap-2">
          {s.concepts.map((c) => (
            <span
              key={c}
              className="border border-line-2 bg-surface-3 px-3 py-1 text-xs font-semibold text-zinc-300"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-2">
        Generated from this lesson&apos;s transcript &amp; content. Connect OpenAI
        for deeper analysis (pass the transcript to the model).
      </p>
    </div>
  );
}

function ExplainView({ lesson }: { lesson: Lesson }) {
  const e = explainTopConcept(lesson);
  if (!e)
    return (
      <div className="border border-line bg-surface p-5 text-sm text-muted">
        Nothing to explain yet — add lesson content.
      </div>
    );
  return (
    <div className="space-y-3 border border-line bg-surface p-5">
      <h4 className="font-display text-sm font-semibold text-white">
        Explaining: <span className="text-zinc-300">{e.term}</span>
      </h4>
      {e.context && (
        <blockquote className="border-l-2 border-line-2 pl-3 text-sm italic text-muted">
          “{e.context}”
        </blockquote>
      )}
      <p className="text-sm leading-relaxed text-zinc-200">{e.plain}</p>
      <p className="text-[11px] text-muted-2">Drawn from the lesson transcript.</p>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof ListChecks;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-white">
        <Icon className="h-4 w-4 text-zinc-300" /> {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm text-zinc-200">
            <span className="text-zinc-300">›</span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}


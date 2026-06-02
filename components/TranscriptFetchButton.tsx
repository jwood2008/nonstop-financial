"use client";

import { useState } from "react";
import { useStore, allLessons } from "@/lib/store";
import { lessonCoachState } from "@/lib/coach";
import { isYouTube, fetchYouTubeTranscript } from "@/lib/youtube";
import { transcribeVideo } from "@/lib/transcribe";
import { Youtube, Mic, Loader2, CheckCircle2 } from "lucide-react";

/**
 * One-click "get this video's transcript so the AI Coach can read it".
 * YouTube → pull captions (instant). Uploaded file → whisper-flow.
 * Admin-only; shows wherever a lesson has a video but no matching transcript.
 */
export function TranscriptFetchButton({
  lessonId,
  className = "",
}: {
  lessonId: string;
  className?: string;
}) {
  const { role, course, updateTranscript } = useStore();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const lesson = allLessons(course).find((l) => l.id === lessonId);
  if (!lesson) return null;
  const vid = lessonCoachState(lesson);
  if (!vid.hasRealVideo) return null;

  if (role !== "admin") {
    return (
      <p className={`text-xs text-muted-2 ${className}`}>
        Ask an admin to pull this video&apos;s transcript.
      </p>
    );
  }

  const yt = isYouTube(vid.primaryVideoSrc);

  const run = async () => {
    setBusy(true);
    setDone(false);
    setMsg(yt ? "Fetching transcript from YouTube…" : "Transcribing via Whisper…");
    try {
      const text = yt
        ? await fetchYouTubeTranscript(vid.primaryVideoSrc)
        : await transcribeVideo(vid.primaryVideoSrc, (p) => setMsg(p));
      if (!text.trim()) throw new Error("No transcript text came back.");
      updateTranscript(lessonId, text);
      setDone(true);
      setMsg("Done — the AI Coach now reads this video's transcript.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't get the transcript.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 bg-nonstop px-3 py-2 text-sm font-semibold text-white transition hover:bg-nonstop-dark disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : yt ? (
          <Youtube className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        {busy
          ? yt
            ? "Fetching…"
            : "Transcribing…"
          : yt
          ? "Fetch transcript from YouTube"
          : "Transcribe with Whisper"}
      </button>
      {msg && (
        <p className={`mt-2 text-xs ${done ? "text-green-400" : "text-muted-2"}`}>{msg}</p>
      )}
    </div>
  );
}

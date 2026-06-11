"use client";

import { AppShell } from "@/components/AppShell";
import { Mic, Sparkles } from "lucide-react";

/* Practice is not launched yet — the nav tab is removed, and anyone who
   hits this URL directly just sees a coming-soon note. The roleplay
   feature (components/ColdCall) stays in the codebase for when it ships. */
export default function PracticePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-md px-6 py-28 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-nonstop/30 bg-nonstop/10">
          <Mic className="h-6 w-6 text-nonstop" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold text-white">
          Practice
        </h1>
        <p className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/55">
          <Sparkles className="h-3 w-3 text-nonstop" /> Coming soon
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Live-fire cold-call roleplay scored in real time is on the way.
          Keep working through your training — we&apos;ll let you know the
          moment it opens.
        </p>
      </div>
    </AppShell>
  );
}

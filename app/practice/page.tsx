"use client";

import { AppShell } from "@/components/AppShell";
import { ColdCall } from "@/components/ColdCall";
import { useStore } from "@/lib/store";
import { Mic, Sparkles } from "lucide-react";

export default function PracticePage() {
  return (
    <AppShell>
      <Practice />
    </AppShell>
  );
}

function Practice() {
  const { canBeAdmin } = useStore();

  // Practice is coming soon for the team — admins can still preview it.
  if (!canBeAdmin) {
    return (
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
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
      <header className="mb-8">
        <span className="text-[11px] font-medium uppercase tracking-widest text-white/40">
          Practice · admin preview — users see &ldquo;coming soon&rdquo;
        </span>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
          Sales roleplay
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Live-fire cold calls — close the deal before you&apos;re in front of a
          real client.
        </p>
      </header>
      <ColdCall />
    </div>
  );
}

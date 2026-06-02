"use client";

import { AppShell } from "@/components/AppShell";
import { ColdCall } from "@/components/ColdCall";

export default function PracticePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <header className="mb-8">
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/40">
            Practice
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
    </AppShell>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Logo, NonstopMark } from "@/components/Brand";
import {
  ArrowRight,
  GraduationCap,
  BadgeCheck,
  Bot,
  PhoneCall,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: GraduationCap,
    title: "Structured training",
    body: "Video-first modules from licensing to advanced production, organized into a single producer path.",
  },
  {
    icon: BadgeCheck,
    title: "Certification",
    body: "Assessments with a configurable passing score (default 80%) and a tracked certification history.",
  },
  {
    icon: Bot,
    title: "AI coaching",
    body: "Lesson summaries and quizzes generated from each video's transcript — grounded in your own content.",
  },
  {
    icon: PhoneCall,
    title: "Cold-call practice",
    body: "Voice roleplay against unscripted prospects, scored on opener, rapport, technique, and outcome.",
  },
];

const AUDIENCES = [
  ["Agency owners", "Stand up training, monitor performance, and certify producers."],
  ["Sales managers", "Assign curriculum, spot struggling agents, and drive accountability."],
  ["Agents", "Onboard fast, build product knowledge, and practice before live calls."],
];

export default function Landing() {
  const { ready, loggedIn, login } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && loggedIn) router.replace("/dashboard");
  }, [ready, loggedIn, router]);

  const enter = () => {
    login();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen">
      {/* top bar */}
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-2 sm:inline">
              Private preview
            </span>
            <button
              onClick={enter}
              className="border border-line-2 px-3 py-1.5 text-sm font-medium text-white transition hover:border-zinc-500"
            >
              Log in
            </button>
          </div>
        </div>
      </header>

      {/* hero — left-aligned, restrained */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 border border-line-2 px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest text-muted">
              <NonstopMark className="h-3.5 w-4" />
              NonStop Financial · Producer OS
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.02] text-white sm:text-5xl">
              Build elite producers faster
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted">
              The operating system insurance agencies use to onboard, train,
              certify, and develop high-performing agents — training, coaching,
              and performance in one place.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={enter}
                className="group inline-flex items-center gap-2 bg-nonstop px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
              >
                Enter platform
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
              <span className="text-xs text-muted-2">
                Preview access — no password required.
              </span>
            </div>
          </div>

          {/* capability list — dense, bordered, no oversized cards */}
          <div className="divide-y divide-line border border-line">
            {CAPABILITIES.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="flex gap-3 p-4">
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                    strokeWidth={1.75}
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {c.title}
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-muted">
                      {c.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* who it's for */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-2">
            Built for the whole agency
          </h2>
          <div className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-3">
            {AUDIENCES.map(([role, desc]) => (
              <div key={role} className="bg-ink p-5">
                <div className="font-display text-base font-semibold text-white">
                  {role}
                </div>
                <p className="mt-1.5 text-sm leading-snug text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-8 text-xs text-muted-2 sm:flex-row sm:items-center">
        <span>© 2026 NonStop Financial. All rights reserved.</span>
        <span>
          Multi-tenant SaaS · Built for life insurance agencies, IMOs, and FMOs.
        </span>
      </footer>
    </div>
  );
}

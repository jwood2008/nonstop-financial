"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ExpandablePanel } from "@/components/ui/expandable-card";
import { Gallery4 } from "@/components/ui/gallery4";
import { useStore, allLessons } from "@/lib/store";
import { LEADERBOARD } from "@/lib/data";
import { certificateDataUrl, downloadCertificatePdf } from "@/lib/certificate";
import { ArrowRight, ArrowUpRight, Award, Download } from "lucide-react";

const MODULE_IMAGES = [
  "https://images.unsplash.com/photo-1551250928-243dc937c49d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1551250928-e4a05afaed1e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1536735561749-fc87494598cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1548324215-9133768e4094?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
];

// Continue-training background slideshow. Scenic placeholders for now — to use
// Jay Maska / NonStop photos, drop files in /public/hero and swap these paths
// (e.g. "/hero/1.jpg", "/hero/2.jpg", …).
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80",
];

const SPOTLIGHT = [
  { id: "objection", title: "Advanced Objection Handling", description: "Reframe price and risk so prospects sell themselves.", href: "/learn", image: MODULE_IMAGES[0] },
  { id: "iul", title: "How IUL Works", description: "Position indexed universal life with confidence.", href: "/learn", image: MODULE_IMAGES[1] },
  { id: "closing", title: "Closing with Confidence", description: "Turn a great presentation into a signed application.", href: "/learn", image: MODULE_IMAGES[2] },
  { id: "recruiting", title: "Recruiting Elite Producers", description: "Multiply your impact by building a team.", href: "/learn", image: MODULE_IMAGES[3] },
];

/* ── completion certificate ── */
function CourseCertificate({ done, total }: { done: number; total: number }) {
  const { course, profile, email } = useStore();
  const complete = total > 0 && done === total;

  const name = (profile.name || email?.split("@")[0] || "Producer").replace(
    /\b\w/g,
    (c) => c.toUpperCase()
  );
  const first = name.split(" ")[0];
  const courseTitle = course.title || "Producer Development Path";
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const data = { name, course: courseTitle, date };

  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (complete) setUrl(certificateDataUrl(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, name, courseTitle, date]);

  if (!complete) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-nonstop/40 bg-[#33343a] p-6 shadow-lg shadow-black/30 sm:p-9">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-nonstop/40 bg-nonstop/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-nonstop">
          <Award className="h-3.5 w-3.5" /> Course complete
        </span>
        <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
          Congratulations, {first}! 🎉
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-white/55">
          You&apos;ve completed the {courseTitle}. Your certificate is ready —
          download it below.
        </p>

        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Certificate of completion"
            className="w-full max-w-xl rounded-xl border border-white/10 shadow-2xl shadow-black/50"
          />
        )}

        <button
          onClick={() => downloadCertificatePdf(data)}
          className="group inline-flex items-center gap-2 rounded-full bg-nonstop px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-nonstop-dark"
        >
          <Download className="h-4 w-4" /> Download certificate (PDF)
        </button>
      </div>
    </section>
  );
}

function DualRing({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function ThinCheck({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ThinRing({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
    </svg>
  );
}

const MILESTONES = (progress: number) => [
  { t: "Complete Insurance Foundations", done: true },
  { t: "Pass your first product quiz (IUL)", done: true },
  { t: "Finish Sales Training module", done: progress > 60 },
  { t: "Earn Producer Certification", done: false },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const { course, completed } = useStore();
  const lessons = allLessons(course);
  const done = lessons.filter((l) => completed.has(l.id)).length;
  const total = lessons.length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const next = lessons.find((l) => !completed.has(l.id)) ?? lessons[0];
  const upcoming = lessons.filter((l) => !completed.has(l.id));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      {/* ── certificate (shown when the whole course is complete) ── */}
      <CourseCertificate done={done} total={total} />

      {/* ── Introduction hero (top) ── */}
      <IntroHero next={next} progress={progress} done={done} total={total} />

      {/* ── module cards — finished modules drop out; the rest shift over
             into an "up next" queue ── */}
      {(() => {
        const remaining = course.modules
          .map((m, i) => ({ m, i }))
          .filter(
            ({ m }) =>
              !(
                m.lessons.length > 0 &&
                m.lessons.every((l) => completed.has(l.id))
              )
          );

        if (remaining.length === 0) {
          return (
            <div className="mt-6 rounded-3xl border border-white/10 bg-[#33343a] p-8 text-center">
              <p className="text-xl font-bold text-white">
                Every module complete 🎉
              </p>
              <p className="mt-1.5 text-sm text-white/55">
                You&apos;ve finished the whole path.{" "}
                <Link
                  href="/learn"
                  className="font-semibold text-nonstop underline-offset-4 hover:underline"
                >
                  Review lessons →
                </Link>
              </p>
            </div>
          );
        }

        return (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {remaining.map(({ m, i }) => {
              const md = m.lessons.filter((l) => completed.has(l.id)).length;
              return (
                <Link
                  key={m.id}
                  href="/learn"
                  className="group relative block min-h-[220px] overflow-hidden rounded-3xl border border-white/10 bg-[#33343a] p-5"
                >
                  <div className="relative z-10">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
                      Module {i + 1}
                    </p>
                    <h3 className="mt-1 max-w-[80%] text-xl font-bold leading-tight text-white">
                      {m.title}
                    </h3>
                  </div>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={MODULE_IMAGES[i % MODULE_IMAGES.length]}
                      alt=""
                      className="h-32 w-full max-w-[150px] rounded-xl object-cover opacity-25 transition-all duration-500 group-hover:scale-110 group-hover:opacity-40"
                    />
                  </div>
                  <div className="absolute bottom-4 left-5 z-10 font-mono text-xs tabular-nums text-white/55">
                    {md}/{m.lessons.length} lessons
                  </div>
                  <div className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-nonstop">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </Link>
              );
            })}
          </div>
        );
      })()}

      {/* ── widgets ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpandablePanel
            label="Up next"
            title="Up next"
            tone="light"
            preview={<LessonList lessons={upcoming.slice(0, 5)} linked={false} />}
          >
            <LessonList lessons={upcoming} linked />
          </ExpandablePanel>
        </div>
        <div className="space-y-6">
          <ExpandablePanel
            label="Team leaderboard"
            title="Team leaderboard"
            tone="light"
            preview={<Leaderboard />}
          >
            <Leaderboard expanded />
          </ExpandablePanel>
          <ExpandablePanel
            label="Milestones"
            title="Milestones"
            tone="light"
            preview={<Milestones progress={progress} />}
          >
            <Milestones progress={progress} expanded />
          </ExpandablePanel>
        </div>
      </div>

      <section className="mt-10">
        <Gallery4
          title="Spotlight"
          description="Featured training and what your team is working on this week."
          items={SPOTLIGHT}
          autoScroll
        />
      </section>
    </div>
  );
}

/* ── speed-blur background slideshow ──
   Photos don't crossfade — each one whips out into horizontal light streaks,
   swaps at peak blur, then resolves sharp from the other side (a "warp" /
   high-speed pan). The streak look needs *anisotropic* blur, so we drive an
   SVG horizontal Gaussian blur with rAF (CSS blur() is uniform = just a fade). */
function HeroSlideshow({ images }: { images: string[] }) {
  const [i, setI] = useState(0);
  const iRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (images.length < 2) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const MAX_BLUR = 120; // peak horizontal streak length (px) — long light trails
    const SHIFT = 22; // peak horizontal travel (%)
    const STRETCH = 0.5; // peak horizontal overscan/stretch (must cover 2*SHIFT)
    const GLOW = 0.85; // peak extra brightness (the "light" surge)
    const PUNCH = 0.3; // peak extra contrast
    const SAT = 0.7; // peak extra saturation (warms the trails)
    const OUT_MS = 750; // whip-out into streaks (slower, more streak time)
    const IN_MS = 1650; // long, drawn-out settle of the new photo
    const HOLD_MS = 6000; // time each photo rests sharp

    // p: 0 = sharp at rest, 1 = peak streak. dir: which side it travels to.
    const frame = (p: number, dir: number) => {
      if (blurRef.current)
        blurRef.current.setAttribute("stdDeviation", `${MAX_BLUR * p} 0`);
      if (wrapRef.current) {
        wrapRef.current.style.transform = `translate3d(${dir * SHIFT * p}%,0,0) scaleX(${1 + STRETCH * p})`;
        // brightness/contrast/saturation surge at peak = glowing light trails
        wrapRef.current.style.filter = `url(#hero-speedblur) brightness(${1 + GLOW * p}) contrast(${1 + PUNCH * p}) saturate(${1 + SAT * p})`;
      }
    };

    const easeIn = (t: number) => t * t * t;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const now = () => performance.now();

    let interval: number;

    const run = () => {
      const next = (iRef.current + 1) % images.length;

      if (reduced) {
        iRef.current = next;
        setI(next);
        return;
      }

      const t0 = now();
      const whipOut = () => {
        const t = Math.min((now() - t0) / OUT_MS, 1);
        frame(easeIn(t), -1); // streak off to the left
        if (t < 1) {
          rafRef.current = requestAnimationFrame(whipOut);
          return;
        }
        // swap at peak blur — the heavy streak hides the cut
        iRef.current = next;
        setI(next);
        const t1 = now();
        const whipIn = () => {
          const t2 = Math.min((now() - t1) / IN_MS, 1);
          frame(1 - easeOut(t2), 1); // fly in from the right, resolve sharp
          if (t2 < 1) rafRef.current = requestAnimationFrame(whipIn);
        };
        rafRef.current = requestAnimationFrame(whipIn);
      };
      rafRef.current = requestAnimationFrame(whipOut);
    };

    interval = window.setInterval(run, HOLD_MS);
    return () => {
      window.clearInterval(interval);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [images.length]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* horizontal-only blur filter — the streaking comes from blurring x, not y */}
      <svg
        aria-hidden
        className="pointer-events-none absolute h-0 w-0"
        width="0"
        height="0"
      >
        <filter
          id="hero-speedblur"
          x="-25%"
          y="-5%"
          width="150%"
          height="110%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur ref={blurRef} stdDeviation="0 0" edgeMode="duplicate" />
        </filter>
      </svg>

      <div
        ref={wrapRef}
        className="absolute inset-0"
        style={{ filter: "url(#hero-speedblur)", willChange: "transform, filter" }}
      >
        {images.map((src, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            className={`absolute inset-0 h-full w-full object-cover ${
              idx === i ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      {/* legibility scrim + brand glow */}
      <div className="absolute inset-0 bg-[#0d0e11]/72" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(120% 130% at 50% 0%, rgba(255,95,31,0.30), rgba(255,95,31,0.06) 42%, rgba(13,14,17,0) 75%)",
        }}
      />
    </div>
  );
}

/* ── Introduction hero ── */
function IntroHero({
  next,
  progress,
  done,
  total,
}: {
  next: { title: string; moduleTitle?: string } | undefined;
  progress: number;
  done: number;
  total: number;
}) {
  return (
    <section
      className="on-media relative overflow-hidden rounded-3xl border border-white/10 px-6 py-16 sm:px-10 sm:py-20"
      style={{ backgroundColor: "#15161a" }}
    >
      <HeroSlideshow images={HERO_IMAGES} />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-white/55">
          Continue training · {next?.moduleTitle}
        </span>
        <div className="relative mt-8 flex items-center justify-center">
          {/* the flock-of-arrows mark woven behind the headline */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/mark-white.png"
            alt=""
            className="pointer-events-none absolute z-0 h-44 w-auto opacity-[0.16] md:h-64"
          />
          <h1 className="relative z-10 text-4xl italic uppercase leading-[0.9] tracking-tight md:text-6xl">
            <span className="font-black text-white">Nonstop-able</span>{" "}
            <span className="font-light text-white/70">Nation</span>
          </h1>
        </div>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/55">
          You&apos;re {progress}% through the Producer Development Path — {total - done}{" "}
          lessons from your next certification.
        </p>

        <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-4">
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="uppercase tracking-wider text-white/40">Path progress</span>
              <span className="font-mono tabular-nums text-white/70">
                {done}/{total} · {progress}%
              </span>
            </div>
            <div className="relative h-[3px] w-full rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-nonstop"
                style={{ width: `${progress}%`, boxShadow: "0 0 10px 1px rgba(255,95,31,0.55)" }}
              />
            </div>
          </div>
          <Link
            href="/learn"
            className="group inline-flex items-center gap-2 rounded-full bg-nonstop px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:bg-nonstop-dark hover:shadow-[0_0_28px_-4px_rgba(255,95,31,0.6)]"
          >
            Resume training
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── widget bodies (white text on grey cards) ── */
function LessonList({
  lessons,
  linked,
}: {
  lessons: { id: string; title: string; duration: string; moduleTitle?: string }[];
  linked: boolean;
}) {
  if (lessons.length === 0)
    return <p className="py-2 text-sm text-white/50">Every lesson is complete.</p>;
  return (
    <div>
      {lessons.map((l) => {
        const inner = (
          <>
            <DualRing className="h-[18px] w-[18px] shrink-0 text-white/55" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{l.title}</span>
              <span className="block truncate text-xs font-medium text-white/60">{l.moduleTitle}</span>
            </span>
            <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-white/40">
              {l.duration}
            </span>
          </>
        );
        return linked ? (
          <Link
            key={l.id}
            href="/learn"
            className="-mx-2 flex items-center gap-3 rounded-lg border-b border-white/10 px-2 py-3 transition-colors last:border-0 hover:bg-white/5"
          >
            {inner}
          </Link>
        ) : (
          <div key={l.id} className="flex items-center gap-3 border-b border-white/10 py-3 last:border-0">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

function Leaderboard({ expanded }: { expanded?: boolean }) {
  const { profile, email } = useStore();
  return (
    <div>
      {LEADERBOARD.map((a, i) => {
        const me = a.name === "James Wood";
        const displayName = me && profile.name ? profile.name : a.name;
        const initials =
          displayName
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || (email ?? "?")[0].toUpperCase();
        return (
          <div key={a.name} className="flex items-center gap-3 border-b border-white/10 py-2.5 last:border-0">
            <span className="w-3 shrink-0 font-mono text-[11px] tabular-nums text-white/40">{i + 1}</span>
            {me && profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-nonstop/40" />
            ) : (
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  me ? "bg-nonstop/15 text-nonstop ring-1 ring-nonstop/30" : "bg-white/10 text-white/80"
                }`}
              >
                {initials}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
              {displayName}
              {me && (
                <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wider text-nonstop">You</span>
              )}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-white/45">{a.streak}d</span>
            <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-white">
              {a.completion}%
            </span>
          </div>
        );
      })}
      {expanded && (
        <p className="mt-3 text-xs text-white/40">Ranked by course completion · streak shown in days.</p>
      )}
    </div>
  );
}

function Milestones({ progress, expanded }: { progress: number; expanded?: boolean }) {
  return (
    <div className="space-y-3.5">
      {MILESTONES(progress).map((m, i) => (
        <div key={i} className="flex items-start gap-3 text-sm">
          {m.done ? (
            <ThinCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-nonstop" />
          ) : (
            <ThinRing className="mt-0.5 h-[18px] w-[18px] shrink-0 text-white/40" />
          )}
          <span>
            <span className={`font-medium ${m.done ? "text-white" : "text-white/60"}`}>{m.t}</span>
            {expanded && (
              <span className="block text-xs text-white/40">
                {m.done ? "Completed" : "In progress / not started"}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

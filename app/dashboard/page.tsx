"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ExpandablePanel } from "@/components/ui/expandable-card";
import { Gallery4 } from "@/components/ui/gallery4";
import { useStore, allLessons } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { LEADERBOARD } from "@/lib/data";
import { certificateDataUrl, downloadCertificatePdf } from "@/lib/certificate";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Download,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

const MODULE_IMAGES = [
  "https://images.unsplash.com/photo-1551250928-243dc937c49d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1551250928-e4a05afaed1e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1536735561749-fc87494598cb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  "https://images.unsplash.com/photo-1548324215-9133768e4094?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
];

// Continue-training background slideshow — NonStop photos behind the
// "Nonstopable Nation" hero. Drop files in /public/hero and list them here.
// `pos` is the CSS object-position: the hero band is wide and short, so
// portrait shots need a top bias or heads get cropped out of frame.
const HERO_IMAGES: { src: string; pos: string }[] = [
  { src: "/hero/jay-8.jpg", pos: "center 35%" }, // group photo — heads at ~40% of frame
  { src: "/hero/jay-9.jpg", pos: "center 42%" }, // aerial — crowd is mid-frame
  { src: "/hero/jay-4.png", pos: "center 20%" }, // podcast (landscape) — face upper third
  { src: "/hero/jay-7.png", pos: "center 22%" }, // podcast (landscape) — face upper third
  { src: "/hero/jay-6.png", pos: "center 38%" }, // portrait — Jay's face at ~39% of frame
  { src: "/hero/jay-1.png", pos: "center 35%" }, // portrait — Jay's face at ~36% of frame
];

// Spotlight cards now live in the store (admin-editable, synced to Supabase) —
// see the SpotlightSection below for the in-place editor.

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

// Milestones are derived from the user's REAL progress (module completion,
// quiz passes) — never hardcoded, so a brand-new user starts at zero.

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
            preview={<Milestones />}
          >
            <Milestones expanded />
          </ExpandablePanel>
        </div>
      </div>

      <SpotlightSection />
    </div>
  );
}

/* ── speed-blur background slideshow ──
   Photos don't crossfade — each one whips out into horizontal light streaks,
   swaps at peak blur, then resolves sharp from the other side (a "warp" /
   high-speed pan). The streak look needs *anisotropic* blur, so we drive an
   SVG horizontal Gaussian blur with rAF (CSS blur() is uniform = just a fade). */
function HeroSlideshow({ images }: { images: { src: string; pos: string }[] }) {
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
        {images.map((img, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.src}
            src={img.src}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            style={{ objectPosition: img.pos }}
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
  const { profile, email, course } = useStore();
  const totalLessons = allLessons(course).length;

  // Live data when Supabase is connected (last 30 days, same RPC as the
  // analytics page); the hardcoded sample is only for the no-backend preview.
  const [rows, setRows] = useState<typeof LEADERBOARD>(
    isSupabaseConfigured ? [] : LEADERBOARD
  );
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    const day = (offset: number) =>
      new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
    supabase
      .rpc("leaderboard", { p_from: day(29), p_to: day(0) })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const live = data as {
          name: string;
          completed: number;
          passes: number;
          active_days: number;
        }[];
        setRows(
          live.map((r) => ({
            name: r.name,
            streak: r.active_days,
            certs: r.passes,
            completion:
              totalLessons > 0
                ? Math.min(100, Math.round((r.completed / totalLessons) * 100))
                : 0,
          }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, [totalLessons]);

  if (rows.length === 0)
    return (
      <p className="py-2 text-sm text-white/50">
        No completed lessons yet — the board fills in as the team trains.
      </p>
    );

  return (
    <div>
      {rows.map((a, i) => {
        const me = Boolean(profile.name) && a.name === profile.name;
        const displayName = a.name;
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

/* ── Spotlight (admin-editable cards: photo, copy, click-through URL) ── */
function SpotlightSection() {
  // editing spotlights is admin-only (managers are analytics-only)
  const { spotlights, canBeAdmin, addSpotlight, updateSpotlight, removeSpotlight } =
    useStore();
  const [editing, setEditing] = useState(false);

  // uploaded photos become data-URLs; keep them small so the set still syncs
  const onUpload = (id: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > 1_500_000) {
      alert("Keep spotlight photos under 1.5 MB — or paste an image URL instead.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateSpotlight(id, { image: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <section className="mt-10">
      <div className="relative">
        {canBeAdmin && (
          <button
            onClick={() => setEditing((e) => !e)}
            className={`absolute right-0 top-0 z-10 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              editing
                ? "border-nonstop bg-nonstop text-white"
                : "border-white/15 bg-white/[0.04] text-white/70 hover:text-white"
            }`}
          >
            {editing ? (
              <>
                <X className="h-3.5 w-3.5" /> Done
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5" /> Edit spotlights
              </>
            )}
          </button>
        )}
        <Gallery4
          title="Spotlight"
          description="Featured training and what your team is working on this week."
          items={spotlights}
          autoScroll={!editing}
        />
      </div>

      {canBeAdmin && editing && (
        <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs text-white/45">
            Changes publish to everyone automatically. Links can go anywhere — a
            lesson (<span className="font-mono">/learn</span>), an Instagram post, a
            story, an article… External links open in a new tab.
          </p>
          {spotlights.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              {/* photo + upload */}
              <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wide text-white/35">
                    No photo
                  </div>
                )}
                <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center gap-1 bg-black/65 py-1 text-[10px] font-semibold text-white/85 hover:text-white">
                  <ImagePlus className="h-3 w-3" /> Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUpload(s.id, e.target.files?.[0])}
                  />
                </label>
              </div>

              {/* fields */}
              <div className="grid min-w-[16rem] flex-1 gap-2">
                <input
                  value={s.title}
                  onChange={(e) => updateSpotlight(s.id, { title: e.target.value })}
                  placeholder="Title"
                  className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white placeholder:text-white/35 outline-none focus:border-nonstop"
                />
                <input
                  value={s.description}
                  onChange={(e) =>
                    updateSpotlight(s.id, { description: e.target.value })
                  }
                  placeholder="Short description"
                  className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-nonstop"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={s.href}
                    onChange={(e) => updateSpotlight(s.id, { href: e.target.value })}
                    placeholder="Link — https://instagram.com/… or /learn"
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/35 outline-none focus:border-nonstop"
                  />
                  <input
                    value={s.image.startsWith("data:") ? "" : s.image}
                    onChange={(e) => updateSpotlight(s.id, { image: e.target.value })}
                    placeholder={
                      s.image.startsWith("data:")
                        ? "Uploaded photo (paste a URL to replace)"
                        : "Image URL — https://…"
                    }
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder:text-white/35 outline-none focus:border-nonstop"
                  />
                </div>
              </div>

              <button
                onClick={() => removeSpotlight(s.id)}
                title="Remove this spotlight"
                className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/45 transition hover:border-red-400/40 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addSpotlight()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs font-semibold text-white/60 transition hover:border-nonstop hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" /> Add spotlight
          </button>
        </div>
      )}
    </section>
  );
}

function Milestones({ expanded }: { expanded?: boolean }) {
  const { course, completed, quizResults } = useStore();
  const lessons = allLessons(course);
  const done = lessons.filter((l) => completed.has(l.id)).length;
  const total = lessons.length;

  const moduleDone = (m: { lessons: { id: string }[] } | undefined) =>
    Boolean(m && m.lessons.length > 0 && m.lessons.every((l) => completed.has(l.id)));
  const firstModule = course.modules[0];
  const salesModule = course.modules.find((m) => /sales/i.test(m.title));
  const quizPassed = Object.values(quizResults).some((attempts) =>
    attempts.some((a) => a.percent >= 80)
  );

  const milestones = [
    {
      t: firstModule ? `Complete ${firstModule.title}` : "Complete your first module",
      done: moduleDone(firstModule),
    },
    { t: "Pass your first quiz", done: quizPassed },
    {
      t: salesModule ? `Finish ${salesModule.title}` : "Reach 60% of the path",
      done: salesModule ? moduleDone(salesModule) : total > 0 && done / total > 0.6,
    },
    { t: "Earn Producer Certification", done: total > 0 && done === total },
  ];

  return (
    <div className="space-y-3.5">
      {milestones.map((m, i) => (
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

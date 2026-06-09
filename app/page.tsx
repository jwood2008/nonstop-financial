"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { Logo, NonstopMark } from "@/components/Brand";
import { ArrowRight, Check } from "lucide-react";
import { Text_03 } from "@/components/ui/wave-text";
import { IntroOverlay } from "@/components/IntroOverlay";

const PRICE = process.env.NEXT_PUBLIC_PRICE_LABEL || "$497";

// Landing alternates ink (near-black) and paper (warm off-white) bands for a
// professional, editorial feel. Colors are explicit so the page reads the same
// regardless of the in-app theme. Orange is the single accent.
const INK = "#0d0e11";
const PAPER = "#f5f4f1";

/**
 * Mentor photos that crossfade behind the hero. Drop more shots of Jay (and
 * other mentors) into `public/hero/` and add their paths here — they cycle
 * automatically.
 *
 *   const HERO_PHOTOS = ["/hero/jay-1.jpg", "/hero/jay-2.jpg"];
 */
const HERO_PHOTOS: string[] = [
  "/hero/jay-1.jpg",
  "/hero/jay-2.jpg",
  "/hero/jay-3.jpg",
];

// soft edge-fade so a rectangular photo blends into the band (no hard box)
const PHOTO_MASK =
  "radial-gradient(112% 92% at 50% 36%, #000 54%, transparent 100%)";

const PILLARS = [
  [
    "For mentors",
    "Build a legacy, multiply your performance, and certify the next generation of producers.",
  ],
  [
    "For mentees",
    "Get paired with a mentor, absorb the curriculum, and grow with real accountability.",
  ],
  [
    "For the agency",
    "Onboard fast, build deep product knowledge, and practice before every live call.",
  ],
];

const INCLUDED = [
  "9 modules — Welcome, Mindset, Licensing, Contracting, Product, Sales, Systems, Recruiting, Scale",
  "AI coaching grounded in each lesson",
  "Cold-call roleplay scored in real time",
  "Certification + tracked progress",
  "Downloadable scripts, checklists & worksheets",
];

export default function Landing() {
  const { ready, loggedIn } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && loggedIn) router.replace("/dashboard");
  }, [ready, loggedIn, router]);

  return (
    <div className="min-h-screen" style={{ background: INK }}>
      <IntroOverlay />

      {/* top bar (over the dark hero) */}
      <header>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-4">
            <a
              href="#mentorship"
              className="hidden px-2 py-1.5 text-sm font-medium text-white/55 transition hover:text-white sm:inline"
            >
              Mentorship
            </a>
            <a
              href="#academy"
              className="hidden px-2 py-1.5 text-sm font-medium text-white/55 transition hover:text-white sm:inline"
            >
              Academy
            </a>
            <Link
              href="/login"
              className="px-2 py-1.5 text-sm font-medium text-white/55 transition hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-nonstop px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
            >
              Apply for Academy
            </Link>
          </nav>
        </div>
      </header>

      {/* hero — cycling mentor photos as the background, text over the left */}
      <section
        id="home"
        className="relative isolate flex min-h-[calc(94svh-3.5rem)] items-center overflow-hidden"
      >
        <HeroSlideshow />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#0d0e11] via-[#0d0e11]/90 to-[#0d0e11]/20 lg:to-transparent" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#0d0e11] via-[#0d0e11]/30 to-transparent" />

        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              <NonstopMark className="h-3.5 w-4" />
              NonStop Financial
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[0.98] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:text-6xl">
              Forging legacies.
              <br />
              Building elite
              <br />
              producers.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
              The human-centered agency network. Invest in mentorship, hand down
              expertise, and grow together.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 bg-nonstop px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-nonstop-dark"
              >
                <Text_03 text="Sign up for mentorship" className="w-auto text-sm" />
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="text-sm text-white/55 transition hover:text-white"
              >
                Already part of the family?{" "}
                <span className="font-semibold text-white underline-offset-4 hover:underline">
                  Log in
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* mentorship — PAPER band, Jay blended in */}
      <section id="mentorship" style={{ background: PAPER }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-[0.8fr_1.2fr] lg:py-32">
          <div className="w-full max-w-sm">
            <div
              className="relative aspect-[4/5] w-full"
              style={{ WebkitMaskImage: PHOTO_MASK, maskImage: PHOTO_MASK }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero/jay-1.jpg"
                alt="Jay — NonStop Financial"
                className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
              />
            </div>
            <div className="mt-4">
              <p className="font-display text-xl font-bold text-zinc-900">Jay</p>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Founder &amp; Mentor
              </p>
            </div>
          </div>

          <div className="max-w-xl">
            <Eyebrow>Mentorship</Eyebrow>
            <p className="mt-6 font-display text-3xl font-bold leading-[1.05] text-zinc-900 sm:text-5xl">
              Talent is everywhere. Mentorship is rare.
            </p>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-zinc-600">
              <p>
                Jay founded NonStop Financial as a way to help his friends access
                a world of success. Over the past half-decade the business has
                accelerated like a fractal — helping thousands become independent
                advisors and salespeople.
              </p>
              <p>
                When you join NonStop, you don&apos;t get a course and a
                &ldquo;good luck.&rdquo; You get a mentor in your corner, the exact
                systems that work, and a team that wants you to win.
              </p>
            </div>
            <p className="mt-7 text-xs uppercase tracking-[0.2em] text-zinc-400">
              Field-tested · Carrier-appointed · Team-built
            </p>
          </div>
        </div>
      </section>

      {/* how NonStop works — INK band */}
      <section style={{ background: INK }}>
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Eyebrow>How it works</Eyebrow>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {PILLARS.map(([title, desc]) => (
              <div key={title}>
                <h3 className="font-display text-xl font-bold text-white">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* academy — PAPER band: course, price, free-for-NonStop hook */}
      <section id="academy" style={{ background: PAPER }}>
        <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
          <div className="max-w-2xl">
            <Eyebrow>The Academy</Eyebrow>
            <p className="mt-6 font-display text-3xl font-bold leading-[1.05] text-zinc-900 sm:text-5xl">
              Everything you need to produce.
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-zinc-600">
              The NonStop Academy is the full producer path — nine modules from
              licensing to advanced production, plus AI coaching, cold-call
              roleplay, and certification. Learn it once, use it for a career.
            </p>
          </div>

          <div className="mt-14 grid gap-14 lg:grid-cols-2">
            {/* what's inside */}
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-900">
                What&apos;s inside
              </h3>
              <ul className="mt-5 space-y-3.5 text-sm text-zinc-600">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-nonstop" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* pricing + the hook */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold text-zinc-900">
                  {PRICE}
                </span>
                <span className="text-sm text-zinc-500">
                  one-time · full access
                </span>
              </div>

              <div className="mt-7 border-l-2 border-nonstop pl-5">
                <p className="font-display text-xl font-bold text-nonstop">
                  Free for the team.
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-600">
                  Agents on the NonStop team get the entire Academy included —{" "}
                  <span className="text-zinc-900 line-through">{PRICE}</span>{" "}
                  <span className="font-semibold text-zinc-900">$0</span>. Join
                  the network, get mentored, and the course is on us.
                </p>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-6">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 bg-nonstop px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-nonstop-dark"
                >
                  <Text_03
                    text="A part of NonStop? It's free"
                    className="w-auto text-sm"
                  />
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/signup"
                  className="text-sm text-zinc-500 transition hover:text-zinc-900"
                >
                  Or buy the Academy — {PRICE}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* quote band — Jay, full-bleed */}
      <QuoteBand
        quote="I believe there's a NonStop-able version of each and every one of us. I'm here to unlock it."
        author="Jay Maska"
        photo="/hero/jay-1.jpg"
      />

      {/* closing CTA — PAPER band */}
      <section style={{ background: PAPER }}>
        <div className="mx-auto max-w-6xl px-6 py-28 text-center">
          <h2 className="font-display text-4xl font-bold leading-[1.05] text-zinc-900 sm:text-6xl">
            A part of NonStop?
            <br />
            Sign up for free.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-600">
            Join Jay&apos;s network and the Academy is included — no {PRICE}, just
            mentorship and the tools to produce.
          </p>
          <div className="mt-9 flex flex-col items-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-nonstop px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-nonstop-dark"
            >
              <Text_03 text="Sign up for free" className="w-auto text-sm" />
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="text-sm text-zinc-500 transition hover:text-zinc-900"
            >
              Already have an account?{" "}
              <span className="font-semibold text-zinc-900 underline-offset-4 hover:underline">
                Log in
              </span>
            </Link>
          </div>
        </div>
      </section>

      <footer
        className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-10 text-xs text-white/40 sm:flex-row sm:items-center"
        style={{ background: INK }}
      >
        <span>© 2026 NonStop Financial. All rights reserved.</span>
        <span>Mentorship-first agency network for life insurance producers.</span>
      </footer>
    </div>
  );
}

/* ---------- full-bleed quote band: photo of Jay + a big quote ---------- */
function QuoteBand({
  quote,
  author,
  photo,
}: {
  quote: string;
  author: string;
  photo: string;
}) {
  return (
    <section
      className="relative isolate flex min-h-[72svh] items-center overflow-hidden"
      style={{ background: INK }}
    >
      {/* photo on the left */}
      <div className="absolute inset-0 lg:right-auto lg:w-[54%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt={author}
          className="h-full w-full object-cover object-[center_18%]"
        />
      </div>
      {/* scrim: dark on the right (for the quote), photo shows on the left */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[#0d0e11] via-[#0d0e11]/85 to-[#0d0e11]/10 lg:via-[#0d0e11]/80 lg:to-transparent" />

      <div className="relative mx-auto w-full max-w-6xl px-6 py-24">
        <blockquote className="ml-auto max-w-2xl text-right">
          <p className="font-display text-3xl font-bold uppercase italic leading-[1.12] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.6)] sm:text-5xl">
            &ldquo;{quote}&rdquo;
          </p>
          <footer className="mt-6 text-xs font-bold uppercase tracking-[0.35em] text-nonstop">
            — {author}
          </footer>
        </blockquote>
      </div>
    </section>
  );
}

/* ---------- editorial eyebrow (orange rule + label) ---------- */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-10 bg-nonstop/60" />
      <span className="text-xs font-bold uppercase tracking-[0.22em] text-nonstop">
        {children}
      </span>
    </div>
  );
}

/* ---------- crossfading mentor photos as the hero background ---------- */
function HeroSlideshow() {
  const [i, setI] = useState(0);
  const slides = HERO_PHOTOS;

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div className="absolute inset-0 -z-20" style={{ background: INK }}>
      <div className="absolute inset-0 lg:left-auto lg:w-[62%]">
        {slides.map((src, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt="NonStop mentor"
            className={`absolute inset-0 h-full w-full object-cover object-[center_25%] transition-opacity duration-[1200ms] ease-in-out ${
              idx === i ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-5 right-5 z-10 flex gap-1.5">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                idx === i ? "bg-nonstop" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

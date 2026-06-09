"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Logo, NonstopMark } from "@/components/Brand";
import { ArrowRight } from "lucide-react";

/**
 * Mentor photos that crossfade behind the hero. Drop more shots of Jay (and
 * other mentors) into `public/hero/` and add their paths here — they cycle
 * automatically. Each should read well on the right with text over the left.
 *
 *   const HERO_PHOTOS = ["/hero/jay-1.jpg", "/hero/jay-2.jpg", "/hero/jay-3.jpg"];
 */
const HERO_PHOTOS: string[] = ["/hero/jay-1.jpg"];

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

export default function Landing() {
  const { ready, loggedIn } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && loggedIn) router.replace("/dashboard");
  }, [ready, loggedIn, router]);

  return (
    <div className="min-h-screen bg-ink">
      {/* top bar */}
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-3">
            <a
              href="#mentorship"
              className="hidden px-3 py-1.5 text-sm font-medium text-muted transition hover:text-white sm:inline"
            >
              Mentorship
            </a>
            <a
              href="#academy"
              className="hidden px-3 py-1.5 text-sm font-medium text-muted transition hover:text-white sm:inline"
            >
              Academy
            </a>
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm font-medium text-muted transition hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-nonstop px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
            >
              Apply for Academy
            </Link>
          </nav>
        </div>
      </header>

      {/* hero — cycling mentor photos as the background, text over the left */}
      <section
        id="mentorship"
        className="relative isolate overflow-hidden border-b border-line"
      >
        <HeroSlideshow />
        {/* scrims: dark on the left for legible text, soft fade up from bottom */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/20 lg:to-transparent" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/30 to-transparent" />

        <div className="mx-auto max-w-6xl px-6 py-24 lg:py-36">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 border border-line-2 bg-ink/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest text-muted backdrop-blur-sm">
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
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 bg-nonstop px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-nonstop-dark"
              >
                Sign up for mentorship
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

      {/* pillars */}
      <section id="academy" className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-px border-x border-line bg-line sm:grid-cols-3">
          {PILLARS.map(([title, desc]) => (
            <div key={title} className="bg-ink p-7">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-nonstop">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-8 text-xs text-muted-2 sm:flex-row sm:items-center">
        <span>© 2026 NonStop Financial. All rights reserved.</span>
        <span>Mentorship-first agency network for life insurance producers.</span>
      </footer>
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
    <div className="absolute inset-0 -z-20 bg-ink">
      {/* photo layer: full-bleed on mobile, anchored to the right on desktop */}
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

      {/* slide dots */}
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

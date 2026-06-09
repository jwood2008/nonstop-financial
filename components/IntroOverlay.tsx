"use client";

import { useEffect, useRef, useState } from "react";
import { GooeyText } from "@/components/ui/gooey-text-morphing";

/**
 * First-visit intro. Minimalist words morph on a white screen (GooeyText), the
 * last word then morphs — same gooey blur/threshold effect — into the NonStop
 * logo, and the whole panel slides up like a garage door to reveal the landing.
 *
 * NOTE: currently plays on every visit so it's easy to design. Before launch,
 * gate it with sessionStorage ("nf.introSeen") to show only once per session.
 */
const WORDS = ["Obsession", "Mastery", "Mentorship", "Legacy", "Family"];
const SECONDS_PER_WORD = 1.5;
// cut to the logo morph while the last word is still up, before the loop wraps
const WORDS_MS = (WORDS.length - 0.5) * SECONDS_PER_WORD * 1000;
const MORPH_MS = 1100; // last word → logo gooey morph
const LOGO_MS = 1700; // logo hold
const DOOR_MS = 1100; // garage-door slide
const LOGO_SRC = "/brand/logo-vertical-black.png";

export function IntroOverlay() {
  const [stage, setStage] = useState<"words" | "logo">("words");
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);

  const lift = () => {
    setLeaving(true);
    window.setTimeout(() => setDone(true), DOOR_MS);
  };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDone(true);
      return;
    }
    const t1 = window.setTimeout(() => setStage("logo"), WORDS_MS);
    const t2 = window.setTimeout(
      () => setLeaving(true),
      WORDS_MS + MORPH_MS + LOGO_MS
    );
    const t3 = window.setTimeout(
      () => setDone(true),
      WORDS_MS + MORPH_MS + LOGO_MS + DOOR_MS
    );
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  if (done) return null;

  return (
    <div
      onClick={lift}
      aria-label="Enter the site"
      className="fixed inset-0 z-[80] flex cursor-pointer flex-col items-center justify-center bg-white"
      style={{
        transform: leaving ? "translateY(-100%)" : "translateY(0)",
        transition: `transform ${DOOR_MS}ms cubic-bezier(0.76, 0, 0.24, 1)`,
        willChange: "transform",
      }}
    >
      {/* branding */}
      <div className="absolute top-9 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark-color.png" alt="" className="h-6 w-auto" />
        <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-black/70">
          NonStop Financial
        </span>
      </div>

      {/* words → (gooey morph) → logo */}
      {stage === "words" ? (
        <GooeyText
          texts={WORDS}
          morphTime={0.8}
          cooldownTime={SECONDS_PER_WORD - 0.8}
          className="h-[140px] w-full"
          textClassName="text-black font-display tracking-tight text-6xl sm:text-8xl"
        />
      ) : (
        <GooeyMorphToLogo
          word={WORDS[WORDS.length - 1]}
          logo={LOGO_SRC}
          duration={MORPH_MS}
        />
      )}

      <span className="absolute bottom-10 text-[11px] font-medium uppercase tracking-[0.3em] text-black/40">
        Click to enter →
      </span>
    </div>
  );
}

/**
 * Morphs the last word into the logo with the same gooey effect as GooeyText:
 * both layers blur under an SVG alpha-threshold filter, the word melting out as
 * the logo congeals in. Holds the sharp logo after the morph completes.
 */
function GooeyMorphToLogo({
  word,
  logo,
  duration,
}: {
  word: string;
  logo: string;
  duration: number;
}) {
  const wordRef = useRef<HTMLSpanElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const apply = (f: number) => {
      const inF = Math.max(f, 0.0001); // logo coming in
      if (logoRef.current) {
        logoRef.current.style.filter = `blur(${Math.min(8 / inF - 8, 100)}px)`;
        logoRef.current.style.opacity = `${Math.pow(inF, 0.4) * 100}%`;
      }
      const outF = Math.max(1 - f, 0.0001); // word going out
      if (wordRef.current) {
        wordRef.current.style.filter = `blur(${Math.min(8 / outF - 8, 100)}px)`;
        wordRef.current.style.opacity = `${Math.pow(outF, 0.4) * 100}%`;
      }
    };
    apply(0);
    const tick = () => {
      const f = Math.min((performance.now() - t0) / duration, 1);
      apply(f);
      if (f < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  return (
    <div
      className="relative h-[140px] w-full"
      style={{ filter: "url(#introThreshold)" }}
    >
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="introThreshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
      {/* word and logo share the exact same center so the morph stays put */}
      <span
        ref={wordRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center font-display text-6xl tracking-tight text-black sm:text-8xl"
      >
        {word}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={logoRef}
        src={logo}
        alt="NonStop Financial"
        className="absolute left-1/2 top-1/2 h-32 w-auto -translate-x-1/2 -translate-y-1/2 sm:h-40"
        style={{ opacity: 0 }}
      />
    </div>
  );
}

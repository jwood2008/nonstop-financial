"use client";

import { useEffect, useState } from "react";
import { GooeyText } from "@/components/ui/gooey-text-morphing";

/**
 * First-visit intro. A white screen shows minimalist words morphing inside a
 * modern card (GooeyText), ends on the NonStop logo, then the whole panel
 * slides up like a garage door to reveal the landing page.
 *
 * NOTE: currently plays on every visit so it's easy to design. Before launch,
 * gate it with sessionStorage ("nf.introSeen") to show only once per session.
 */
const WORDS = ["Welcome", "Mentorship", "Legacy", "Family"];
const WORDS_MS = 7000; // how long the words morph before the logo
const LOGO_MS = 2400; // logo hold
const DOOR_MS = 1100; // garage-door slide

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
    const t2 = window.setTimeout(() => setLeaving(true), WORDS_MS + LOGO_MS);
    const t3 = window.setTimeout(
      () => setDone(true),
      WORDS_MS + LOGO_MS + DOOR_MS
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
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-center bg-white transition-transform ease-[cubic-bezier(0.76,0,0.24,1)] ${
        leaving ? "-translate-y-full" : "translate-y-0"
      }`}
      style={{ transitionDuration: `${DOOR_MS}ms` }}
    >
      {/* branding */}
      <div className="absolute top-9 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark-color.png" alt="" className="h-6 w-auto" />
        <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-black/70">
          NonStop Financial
        </span>
      </div>

      {/* words / logo, directly on the white page */}
      {stage === "words" ? (
        <GooeyText
          texts={WORDS}
          morphTime={1.1}
          cooldownTime={1.1}
          className="h-[140px] w-full"
          textClassName="text-black font-display tracking-tight text-6xl sm:text-8xl"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/logo-vertical-black.png"
          alt="NonStop Financial"
          className="h-32 w-auto sm:h-40"
          style={{ animation: "introFade 600ms ease both" }}
        />
      )}

      <button
        onClick={lift}
        className="absolute bottom-10 text-[11px] font-medium uppercase tracking-[0.3em] text-black/40 transition hover:text-black/70"
      >
        Enter →
      </button>
    </div>
  );
}

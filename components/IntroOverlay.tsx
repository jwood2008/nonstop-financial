"use client";

import { useEffect, useState } from "react";
import { GooeyText } from "@/components/ui/gooey-text-morphing";

/**
 * First-visit intro. A white "welcome" screen morphs through a few minimalist
 * words (GooeyText), then the panel slides up like a garage door to reveal the
 * landing page. Shows once per browser session; respects reduced-motion and
 * lets the visitor click to skip.
 */
const WORDS = ["Welcome", "Mentorship", "Legacy", "Family", "NonStop"];
const HOLD_MS = 5200; // time the words play before the door lifts
const DOOR_MS = 950; // garage-door slide duration

export function IntroOverlay() {
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const finish = () => {
    try {
      sessionStorage.setItem("nf.introSeen", "1");
    } catch {
      /* ignore */
    }
    setLeaving(true);
    window.setTimeout(() => setDone(true), DOOR_MS);
  };

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("nf.introSeen") === "1";
    } catch {
      /* ignore */
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) {
      setDone(true);
      return;
    }
    const t = window.setTimeout(finish, HOLD_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;

  return (
    <div
      onClick={finish}
      role="button"
      tabIndex={-1}
      aria-label="Enter the site"
      className={`fixed inset-0 z-[80] flex cursor-pointer flex-col items-center justify-center bg-white transition-transform ease-[cubic-bezier(0.76,0,0.24,1)] ${
        leaving ? "-translate-y-full" : "translate-y-0"
      }`}
      style={{ transitionDuration: `${DOOR_MS}ms` }}
    >
      <GooeyText
        texts={WORDS}
        morphTime={1}
        cooldownTime={0.35}
        className="h-[120px] w-full"
        textClassName="text-black font-display tracking-tight text-5xl sm:text-7xl"
      />
      <p className="absolute bottom-10 text-[11px] font-medium uppercase tracking-[0.3em] text-black/40">
        Click to enter
      </p>
    </div>
  );
}

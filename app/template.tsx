"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Page-transition warp. A `template` (unlike a `layout`) re-mounts on every
 * navigation, so this runs once per page switch: the incoming page flies in
 * from the side, resolving out of horizontal light streaks into sharp — the
 * same "high-speed pan" effect used on the dashboard hero.
 *
 * Scope: this is the *entry* experience only — it plays when a transition
 * touches the landing / auth pages (the click into sign-up/login, and the
 * moment you log in or create an account). Navigation that stays inside the
 * app (dashboard ↔ learn ↔ settings …) gets no effect.
 *
 * The streak look needs *anisotropic* blur (horizontal only), so we drive an
 * SVG horizontal Gaussian blur with requestAnimationFrame — CSS blur() is
 * uniform and would just look like a fade. The filter/transform are applied
 * only while animating and cleared at rest, so the wrapper never holds a
 * `filter` (which would create a containing block and break `position: fixed`).
 */
const AUTH_PATHS = ["/", "/login", "/signup", "/reset-password"];
const isAuthPath = (p?: string | null) => !!p && AUTH_PATHS.includes(p);

// remembered across template re-mounts (same JS module) to know the prior route
let prevPath: string | null = null;

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const wrapRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const blur = blurRef.current;
    if (!wrap) return;

    // only warp when entering/leaving the auth+landing flow
    const prev = prevPath;
    prevPath = pathname;
    if (!isAuthPath(prev) && !isAuthPath(pathname)) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // honor reduced-motion — no warp

    const MAX_BLUR = 90; // peak horizontal streak length (px)
    const SHIFT = 12; // peak horizontal travel (%)
    const STRETCH = 0.32; // peak horizontal stretch
    const GLOW = 0.5; // peak extra brightness (the light surge)
    const PUNCH = 0.18; // peak extra contrast
    const SAT = 0.4; // peak extra saturation
    const DURATION = 620; // snappy settle

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    // p: 1 = peak streak (warped), 0 = sharp at rest. Comes in from the right.
    const frame = (p: number) => {
      if (blur) blur.setAttribute("stdDeviation", `${MAX_BLUR * p} 0`);
      if (p <= 0.001) {
        // settled — drop the filter/transform so fixed positioning works again
        wrap.style.filter = "";
        wrap.style.transform = "";
        return;
      }
      wrap.style.transform = `translate3d(${SHIFT * p}%,0,0) scaleX(${1 + STRETCH * p})`;
      wrap.style.filter = `url(#page-speedblur) brightness(${1 + GLOW * p}) contrast(${1 + PUNCH * p}) saturate(${1 + SAT * p})`;
    };

    wrap.style.willChange = "transform, filter";
    const t0 = performance.now();
    const tick = () => {
      const t = Math.min((performance.now() - t0) / DURATION, 1);
      frame(1 - easeOut(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        frame(0);
        wrap.style.willChange = "";
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (wrap) {
        wrap.style.filter = "";
        wrap.style.transform = "";
        wrap.style.willChange = "";
      }
    };
  }, [pathname]);

  return (
    <>
      {/* horizontal-only blur filter (streaking comes from blurring x, not y) */}
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0" width="0" height="0">
        <filter
          id="page-speedblur"
          x="-20%"
          y="-5%"
          width="140%"
          height="110%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur ref={blurRef} stdDeviation="0 0" edgeMode="duplicate" />
        </filter>
      </svg>

      <div ref={wrapRef}>{children}</div>
    </>
  );
}

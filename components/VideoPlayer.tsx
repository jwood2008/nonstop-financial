"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  embedUrl,
  isEmbed,
  isMux,
  isYouTube,
  muxPlaybackId,
  youtubeId,
  WATCH_THRESHOLD,
} from "@/lib/video";

// Mux plays through its web component (a real media element in OUR page), not
// a cross-origin iframe — that's what makes seek-blocking possible. Loaded on
// demand so lessons without Mux video don't pay for the bundle.
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });

/**
 * Video player that measures genuine watch progress and reports the fraction
 * watched (0–1) via `onProgress`. Counts each second of the video only once it
 * has actually played, so scrubbing to the end earns no credit, and seeking
 * past the furthest point genuinely reached snaps back.
 *
 * Enforced identically for every role — Lead, Agent, Manager, Admin. The only
 * unrestricted path is an admin previewing a block inside the editor.
 *
 * Third-party embeds we can't drive (e.g. a raw Vimeo link) render as a plain
 * iframe and cannot be gated — `isUngatedEmbed` flags those for admins.
 */
export function VideoPlayer({
  src,
  initialProgress = 0,
  onProgress,
  enforce = true,
}: {
  src: string;
  initialProgress?: number;
  onProgress: (fraction: number) => void;
  /** When false (this video already watched through), seeking is unrestricted. */
  enforce?: boolean;
}) {
  if (isMux(src)) {
    return (
      <MuxWatch
        playbackId={muxPlaybackId(src)!}
        initialProgress={initialProgress}
        onProgress={onProgress}
        enforce={enforce}
      />
    );
  }
  if (isYouTube(src)) {
    return <YouTubeWatch videoId={youtubeId(src)!} onProgress={onProgress} enforce={enforce} />;
  }
  if (isEmbed(src)) {
    // Unknown third-party embed — no way to measure or restrict it.
    return (
      <div className="aspect-video">
        <iframe
          src={embedUrl(src)}
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <Html5Watch
      src={src}
      initialProgress={initialProgress}
      onProgress={onProgress}
      enforce={enforce}
    />
  );
}

/* ---------- shared gate for anything with the HTMLMediaElement API ---------- */

type MediaLike = {
  duration: number;
  currentTime: number;
  paused: boolean;
  seeking: boolean;
};

/**
 * The watch rules, in one place so <video> and <mux-player> can't drift apart:
 * count only positions genuinely played, snap back on forward seeks, report the
 * furthest point reached as the watched fraction.
 */
function useWatchGate({
  initialProgress,
  onProgress,
  enforce,
  resetKey,
}: {
  initialProgress: number;
  onProgress: (f: number) => void;
  enforce: boolean;
  /** changing this (new src) starts a fresh measurement */
  resetKey: string;
}) {
  const maxReached = useRef(0); // furthest position genuinely reached (sec)
  const lastSent = useRef(0);
  // keep the latest callback / flags in refs so progress updates never restart
  // the player mid-lesson
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const initRef = useRef(initialProgress);
  const enforceRef = useRef(enforce);
  enforceRef.current = enforce;

  useEffect(() => {
    maxReached.current = 0;
    lastSent.current = 0;
  }, [resetKey]);

  const report = (el: MediaLike) => {
    const dur = el.duration || 0;
    if (!dur) return;
    // progress = how far through the video you've genuinely reached → tracks
    // the scrubber, so the end reads ~100% (no dropped-second drift)
    const f = Math.min(1, Math.max(0, maxReached.current / dur));
    if (f >= WATCH_THRESHOLD || f >= lastSent.current + 0.01) {
      lastSent.current = f;
      cb.current(f);
    }
  };

  return {
    // let returning learners resume up to where they'd already watched
    onMeta: (el: MediaLike) => {
      if (initRef.current > 0 && el.duration) {
        maxReached.current = Math.max(maxReached.current, initRef.current * el.duration);
      }
    },
    onTime: (el: MediaLike) => {
      if (!enforceRef.current) return; // already watched through — free seeking
      if (!el.paused && !el.seeking && el.currentTime > maxReached.current) {
        maxReached.current = el.currentTime;
      }
      report(el);
    },
    onEnded: (el: MediaLike) => {
      if (!enforceRef.current) return;
      maxReached.current = el.duration || maxReached.current;
      report(el);
    },
    // Block fast-forwarding: snap back if they seek beyond what they've reached.
    onSeeking: (el: MediaLike) => {
      if (!enforceRef.current) return;
      const allowed = maxReached.current + 1.5;
      if (el.currentTime > allowed) el.currentTime = Math.max(0, allowed);
    },
  };
}

/* ---------- Mux: <mux-player> drives the same gate as a plain <video> ---------- */
function MuxWatch({
  playbackId,
  initialProgress,
  onProgress,
  enforce,
}: {
  playbackId: string;
  initialProgress: number;
  onProgress: (f: number) => void;
  enforce: boolean;
}) {
  const gate = useWatchGate({
    initialProgress,
    onProgress,
    enforce,
    resetKey: playbackId,
  });
  // events carry the element, so no ref forwarding through next/dynamic
  const el = (e: { currentTarget?: unknown; target?: unknown }) =>
    (e.currentTarget ?? e.target) as MediaLike;

  return (
    <div className="aspect-video w-full bg-black">
      <MuxPlayer
        playbackId={playbackId}
        streamType="on-demand"
        onLoadedMetadata={(e) => gate.onMeta(el(e))}
        onTimeUpdate={(e) => gate.onTime(el(e))}
        onEnded={(e) => gate.onEnded(el(e))}
        onSeeking={(e) => gate.onSeeking(el(e))}
        style={{ height: "100%", width: "100%", aspectRatio: "16 / 9" }}
      />
    </div>
  );
}

/* ---------- HTML5 <video>: bucket-count watched seconds, block seek-ahead ---------- */
function Html5Watch({
  src,
  initialProgress,
  onProgress,
  enforce,
}: {
  src: string;
  initialProgress: number;
  onProgress: (f: number) => void;
  enforce: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const gate = useWatchGate({ initialProgress, onProgress, enforce, resetKey: src });
  const gateRef = useRef(gate);
  gateRef.current = gate;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const onMeta = () => gateRef.current.onMeta(v);
    const onTime = () => gateRef.current.onTime(v);
    const onEnded = () => gateRef.current.onEnded(v);
    const onSeeking = () => gateRef.current.onSeeking(v);

    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    v.addEventListener("seeking", onSeeking);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("seeking", onSeeking);
    };
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      controls
      controlsList="nodownload"
      onContextMenu={(e) => e.preventDefault()}
      className="aspect-video w-full bg-black"
    />
  );
}

/* ---------- YouTube via the IFrame API: count watched seconds while playing ---------- */
let ytApi: Promise<YouTubeNamespace> | null = null;
function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as unknown as { YT?: YouTubeNamespace; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (ytApi) return ytApi;
  ytApi = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT!);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApi;
}

function YouTubeWatch({
  videoId,
  onProgress,
  enforce,
}: {
  videoId: string;
  onProgress: (f: number) => void;
  enforce: boolean;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const maxReached = useRef(0); // furthest position genuinely played (sec)
  const lastSent = useRef(0);
  // latest callback in a ref so progress updates never re-run the effect (which
  // would rebuild the player and restart the video)
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const enforceRef = useRef(enforce);
  enforceRef.current = enforce;

  useEffect(() => {
    let player: YouTubePlayer | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const report = (f: number) => {
      const v = Math.min(1, Math.max(0, f));
      if (v >= WATCH_THRESHOLD || v >= lastSent.current + 0.01) {
        lastSent.current = v;
        cb.current(v);
      }
    };

    loadYouTubeApi().then((YT) => {
      if (cancelled || !holder.current) return;
      // Mount the player into a child element React doesn't render, so React
      // never reconciles (and disturbs) YouTube's iframe on re-renders.
      const inner = document.createElement("div");
      inner.className = "h-full w-full";
      holder.current.appendChild(inner);
      player = new YT.Player(inner, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e: YouTubeStateEvent) => {
            if (e.data === YT.PlayerState.ENDED) {
              const dur = player?.getDuration?.() ?? 0;
              if (dur > 0) {
                maxReached.current = dur;
                report(1);
              }
            }
            if (e.data === YT.PlayerState.PLAYING) {
              timer && clearInterval(timer);
              // poll often enough to catch (and block) forward seeks
              timer = setInterval(() => {
                if (!enforceRef.current) return; // lesson done — free seeking
                const dur = player?.getDuration?.() ?? 0;
                const t = player?.getCurrentTime?.() ?? 0;
                if (dur <= 0) return;
                // a jump well past the furthest point watched = fast-forward →
                // snap back. Rewinding (t < maxReached) is fine.
                if (t > maxReached.current + 1.25) {
                  player?.seekTo?.(maxReached.current, true);
                  return;
                }
                if (t > maxReached.current) maxReached.current = t;
                report(maxReached.current / dur);
              }, 500);
            } else if (timer) {
              clearInterval(timer);
              timer = null;
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      try {
        player?.destroy?.();
      } catch {
        /* ignore */
      }
      // remove any leftover player node so a video change starts clean
      if (holder.current) holder.current.innerHTML = "";
    };
  }, [videoId]);

  return (
    <div className="aspect-video">
      <div ref={holder} className="h-full w-full" />
    </div>
  );
}

/* ---------- minimal YouTube IFrame API types ---------- */
interface YouTubePlayer {
  getDuration?: () => number;
  getCurrentTime?: () => number;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  destroy?: () => void;
}
interface YouTubeStateEvent {
  data: number;
}
interface YouTubeNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars?: Record<string, number>;
      events?: { onStateChange?: (e: YouTubeStateEvent) => void };
    }
  ) => YouTubePlayer;
  PlayerState: { PLAYING: number; ENDED: number };
}

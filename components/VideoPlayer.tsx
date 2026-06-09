"use client";

import { useEffect, useRef } from "react";
import { embedUrl, isEmbed, isYouTube, youtubeId, WATCH_THRESHOLD } from "@/lib/video";

/**
 * Video player that measures genuine watch progress and reports the fraction
 * watched (0–1) via `onProgress`. Counts each second of the video only once it
 * has actually played, so scrubbing to the end earns no credit. HTML5 video
 * also blocks fast-forwarding past the furthest point watched.
 *
 * Untrackable embeds (Vimeo, Mux) render as a plain iframe with no gating.
 */
export function VideoPlayer({
  src,
  initialProgress = 0,
  onProgress,
}: {
  src: string;
  initialProgress?: number;
  onProgress: (fraction: number) => void;
}) {
  if (isYouTube(src)) {
    return <YouTubeWatch videoId={youtubeId(src)!} onProgress={onProgress} />;
  }
  if (isEmbed(src)) {
    // Vimeo / Mux / other — can't measure progress, render normally.
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
  return <Html5Watch src={src} initialProgress={initialProgress} onProgress={onProgress} />;
}

/* ---------- HTML5 <video>: bucket-count watched seconds, block seek-ahead ---------- */
function Html5Watch({
  src,
  initialProgress,
  onProgress,
}: {
  src: string;
  initialProgress: number;
  onProgress: (f: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const maxReached = useRef(0); // furthest position genuinely reached (sec)
  const lastSent = useRef(0);
  // keep latest callback / initial value in refs so the effect runs once per
  // src — progress updates must NOT re-run it (that would reset the player)
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const initRef = useRef(initialProgress);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const report = () => {
      const dur = v.duration || 0;
      if (!dur) return;
      // progress = how far through the video you've genuinely reached → tracks
      // the scrubber, so the end reads ~100% (no dropped-second drift)
      const f = Math.min(1, Math.max(0, maxReached.current / dur));
      if (f >= WATCH_THRESHOLD || f >= lastSent.current + 0.01) {
        lastSent.current = f;
        cb.current(f);
      }
    };

    const onMeta = () => {
      // let returning learners resume up to where they'd already watched
      if (initRef.current > 0 && v.duration) {
        maxReached.current = initRef.current * v.duration;
      }
    };
    const onTime = () => {
      if (!v.paused && !v.seeking && v.currentTime > maxReached.current) {
        maxReached.current = v.currentTime;
      }
      report();
    };
    const onEnded = () => {
      maxReached.current = v.duration || maxReached.current;
      report();
    };
    // Block fast-forwarding: snap back if they seek beyond what they've reached.
    const onSeeking = () => {
      const allowed = maxReached.current + 1.5;
      if (v.currentTime > allowed) v.currentTime = Math.max(0, allowed);
    };

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
}: {
  videoId: string;
  onProgress: (f: number) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const maxReached = useRef(0); // furthest position genuinely played (sec)
  const lastSent = useRef(0);
  // latest callback in a ref so progress updates never re-run the effect (which
  // would rebuild the player and restart the video)
  const cb = useRef(onProgress);
  cb.current = onProgress;

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

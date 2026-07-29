/**
 * Video helpers shared by the player and the completion gate.
 *
 * A lesson that contains a "trackable" video can only be marked complete once
 * the learner has actually watched ~95% of it — watched seconds are counted
 * individually, so scrubbing to the end doesn't earn credit.
 */

/** Fraction of a video that must be watched before the lesson can complete. */
export const WATCH_THRESHOLD = 0.95;

/** True when the src is an embedded player (iframe), not a direct media file. */
export function isEmbed(src: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com|player\.|mux\.com\/embed/i.test(src);
}

/**
 * Extract a Mux playback id from a player/stream URL, or null.
 * Mux videos play through <mux-player> (a real media element in our own page),
 * so they get the same watch tracking and seek-blocking as an .mp4 — they are
 * NOT bare iframes.
 */
export function muxPlaybackId(src: string): string | null {
  const m = src.match(/(?:player|stream)\.mux\.com\/([\w-]+)/i);
  if (!m) return null;
  return m[1].replace(/\.(m3u8|mp4)$/i, "");
}

export function isMux(src: string): boolean {
  return muxPlaybackId(src) !== null;
}

/** Extract a YouTube video id, or null if the src isn't YouTube. */
export function youtubeId(src: string): string | null {
  const m = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  return m ? m[1] : null;
}

export function isYouTube(src: string): boolean {
  return youtubeId(src) !== null;
}

/** Normalize a video src to an embeddable URL (YouTube/Vimeo → /embed). */
export function embedUrl(src: string): string {
  const yt = youtubeId(src);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vm = src.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return src;
}

/**
 * Can we measure how much of this video was watched? True for direct media
 * files (HTML5 <video>), Mux (<mux-player>) and YouTube (IFrame API) — all
 * three are gated. Anything else (a Vimeo link, a random embed) can't be
 * measured, so it can't be gated: see `isUngatedEmbed`.
 */
export function isTrackableVideo(src: string): boolean {
  if (!src) return false;
  return isMux(src) || isYouTube(src) || !isEmbed(src);
}

/**
 * True for a video the player CANNOT enforce watch-through on — it renders as
 * a plain third-party iframe with its own controls. Admins get a warning on
 * these so an ungated lesson can't be published by accident.
 */
export function isUngatedEmbed(src: string): boolean {
  return !!src && !isTrackableVideo(src);
}

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
 * files (HTML5 <video>) and YouTube (IFrame API). Other embeds (Vimeo, Mux)
 * can't be tracked, so they aren't gated.
 */
export function isTrackableVideo(src: string): boolean {
  if (!src) return false;
  return isYouTube(src) || !isEmbed(src);
}

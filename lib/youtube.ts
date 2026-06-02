"use client";

export function isYouTube(src: string): boolean {
  return /youtube\.com|youtu\.be/i.test(src);
}

/** Pull a YouTube video's transcript via our server route (avoids CORS). */
export async function fetchYouTubeTranscript(src: string): Promise<string> {
  const res = await fetch(`/api/youtube-transcript?url=${encodeURIComponent(src)}`);
  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok || !data.text) {
    throw new Error(data.error || "Couldn't fetch the YouTube transcript.");
  }
  return data.text;
}

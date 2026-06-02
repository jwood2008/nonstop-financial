import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Fetch a YouTube video's transcript (its caption track) server-side, so the AI
 * Coach can analyze the actual video an admin pasted in. Runs in the Next.js
 * app — no database/auth backend, just a serverless function that avoids the
 * browser's CORS block on YouTube's caption endpoints.
 *
 * GET /api/youtube-transcript?url=<youtube url or id>
 *   → { id, lang, text }  on success
 *   → { error }           if the video has no captions / fetch failed
 */

function extractId(input: string): string | null {
  if (/^[\w-]{11}$/.test(input)) return input;
  const m = input.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

const KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"; // public InnerTube web key

interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
}

async function playerResponse(id: string, client: "WEB" | "ANDROID") {
  const ctx =
    client === "ANDROID"
      ? { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 34 }
      : { clientName: "WEB", clientVersion: "2.20240101.00.00" };
  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    },
    body: JSON.stringify({ context: { client: ctx }, videoId: id }),
  });
  return res.json();
}

function tracksFrom(player: unknown): CaptionTrack[] {
  const p = player as {
    captions?: {
      playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
    };
  };
  return p?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

async function getTranscript(id: string): Promise<{ text: string; lang?: string }> {
  // try WEB then ANDROID — different clients surface captions in different cases
  let tracks: CaptionTrack[] = [];
  for (const client of ["WEB", "ANDROID"] as const) {
    tracks = tracksFrom(await playerResponse(id, client));
    if (tracks.length) break;
  }
  if (!tracks.length)
    throw new Error("This video has no captions/transcript available to pull.");

  const track =
    tracks.find((t) => t.languageCode?.startsWith("en") && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode?.startsWith("en")) ||
    tracks[0];

  const r = await fetch(track.baseUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  const xml = await r.text();
  // caption XML uses <p> (format 3) or <text> (legacy) entries
  const text = [...xml.matchAll(/<(?:p|text)\b[^>]*>([\s\S]*?)<\/(?:p|text)>/g)]
    .map((m) => decodeEntities(m[1]))
    .filter((s) => s && !/^\[.*\]$/.test(s)) // drop pure [music]/[applause] cues
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) throw new Error("Caption track was empty.");
  return { text, lang: track.languageCode };
}

function decodeEntities(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export async function GET(req: NextRequest) {
  const input =
    req.nextUrl.searchParams.get("url") || req.nextUrl.searchParams.get("v") || "";
  const id = extractId(input);
  if (!id)
    return NextResponse.json({ error: "Not a valid YouTube URL or ID." }, { status: 400 });

  try {
    const { text, lang } = await getTranscript(id);
    return NextResponse.json({ id, lang, text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch transcript." },
      { status: 502 }
    );
  }
}

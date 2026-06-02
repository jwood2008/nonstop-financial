"use client";

/**
 * VOICE LAYER
 * -----------
 * One small interface, two backends:
 *   • "browser"      — Web Speech API (works today in Chrome/Edge, no setup)
 *   • "whisperflow"  — streams to your whisper-flow server (lib/whisperflow.ts)
 *
 * Selection via env (see .env.local.example):
 *   NEXT_PUBLIC_VOICE_PROVIDER = browser | whisperflow   (default: browser)
 *   NEXT_PUBLIC_WHISPERFLOW_URL = ws://localhost:8181/ws
 *
 * Output speech (the prospect's voice) uses the browser's SpeechSynthesis.
 */

export interface Recognizer {
  start(): Promise<void>;
  stop(): void;
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (e: unknown) => void;
}

export function voiceProvider(): "browser" | "whisperflow" {
  const p = process.env.NEXT_PUBLIC_VOICE_PROVIDER;
  return p === "whisperflow" ? "whisperflow" : "browser";
}

type SR = typeof window extends never ? never : any; // eslint-disable-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SR;
    webkitSpeechRecognition?: SR;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** True if we can capture the agent's voice in this environment. */
export function isVoiceSupported(): boolean {
  if (voiceProvider() === "whisperflow") return true;
  return !!getSpeechRecognition();
}

/** Browser Web Speech API recognizer (one utterance, ends on a pause). */
class BrowserRecognizer implements Recognizer {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (e: unknown) => void;
  private rec: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private gotFinal = false;

  start(): Promise<void> {
    const SR = getSpeechRecognition();
    if (!SR) {
      this.onError?.(new Error("speech-unsupported"));
      return Promise.reject(new Error("speech-unsupported"));
    }
    const rec = new SR();
    this.rec = rec;
    this.gotFinal = false;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          this.gotFinal = true;
          this.onFinal?.(r[0].transcript.trim());
        } else {
          interim += r[0].transcript;
        }
      }
      if (interim) this.onPartial?.(interim);
    };
    rec.onerror = (e: unknown) => this.onError?.(e);
    rec.start();
    return Promise.resolve();
  }

  stop(): void {
    try {
      this.rec?.stop();
    } catch {
      /* noop */
    }
  }
}

export function createRecognizer(): Recognizer {
  if (voiceProvider() === "whisperflow") {
    const url = process.env.NEXT_PUBLIC_WHISPERFLOW_URL || "ws://localhost:8181/ws";
    // lazy import to keep it out of the browser bundle unless used
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WhisperFlowRecognizer } = require("./whisperflow") as typeof import("./whisperflow");
    return new WhisperFlowRecognizer(url);
  }
  return new BrowserRecognizer();
}

/* ----------------------------- Output speech ----------------------------- */

let voicesCache: SpeechSynthesisVoice[] = [];
function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  voicesCache = window.speechSynthesis.getVoices();
}
if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/** Speak text as the prospect. pitch/rate let each persona sound a bit different. */
export function speak(
  text: string,
  opts: { pitch?: number; rate?: number; voiceSeed?: number } = {}
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = opts.pitch ?? 1;
    u.rate = opts.rate ?? 1;
    if (!voicesCache.length) loadVoices();
    const en = voicesCache.filter((v) => v.lang.startsWith("en"));
    if (en.length && opts.voiceSeed != null) {
      u.voice = en[opts.voiceSeed % en.length];
    }
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function cancelSpeech(): void {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

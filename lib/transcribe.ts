"use client";

import { voiceProvider } from "./voice";

/**
 * Transcribe a lesson video so the AI Coach actually knows its contents.
 * Uses your whisper-flow server (the same one the cold-call voice uses): plays
 * the video's audio and streams 16 kHz mono PCM to the websocket, collecting the
 * final transcript.
 *
 * If whisper-flow isn't configured, it throws with guidance — the admin can
 * paste the transcript manually instead. In production you'd transcribe on
 * upload (Whisper/Mux) and store it; this is the no-backend stand-in.
 */
export async function transcribeVideo(
  src: string,
  onProgress?: (partial: string) => void
): Promise<string> {
  if (voiceProvider() !== "whisperflow") {
    throw new Error(
      "Auto-transcribe needs whisper-flow. Set NEXT_PUBLIC_VOICE_PROVIDER=whisperflow in .env.local (see .env.local.example), or paste the transcript below manually."
    );
  }
  const url = process.env.NEXT_PUBLIC_WHISPERFLOW_URL || "ws://localhost:8181/ws";

  const media = document.createElement("video");
  media.src = src;
  media.crossOrigin = "anonymous";

  const ctx = new AudioContext({ sampleRate: 16000 });
  const source = ctx.createMediaElementSource(media);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  source.connect(proc);
  proc.connect(ctx.destination);

  const ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";
  let finalText = "";

  const cleanup = () => {
    try {
      proc.disconnect();
      source.disconnect();
      ctx.close();
      ws.close();
      media.pause();
    } catch {
      /* noop */
    }
  };

  return new Promise<string>((resolve, reject) => {
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data as string) as {
          Transcript?: string;
          IsPartial?: boolean;
        };
        const t = (m.Transcript ?? "").trim();
        if (t && !m.IsPartial) {
          finalText += (finalText ? " " : "") + t;
          onProgress?.(finalText);
        }
      } catch {
        /* ignore */
      }
    };
    ws.onerror = () => {
      cleanup();
      reject(new Error("Couldn't reach the whisper-flow server."));
    };
    proc.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      ws.send(pcm.buffer);
    };
    media.onended = () => {
      cleanup();
      resolve(finalText.trim());
    };
    media.play().catch((e) => {
      cleanup();
      reject(e);
    });
  });
}

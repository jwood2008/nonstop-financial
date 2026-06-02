"use client";

import type { Recognizer } from "./voice";

/**
 * whisper-flow client  (https://github.com/dimastatz/whisper-flow)
 * ---------------------------------------------------------------
 * Streams mic audio to the whisper-flow websocket server and emits
 * transcripts. Protocol per the repo:
 *   • endpoint : ws://<host>:8181/ws
 *   • send     : binary frames, 16 kHz mono 16-bit signed PCM (int16)
 *   • receive  : JSON { Transcript, EndTime, IsPartial }
 *
 * Run the server with `./run.sh -run-server`, then set
 *   NEXT_PUBLIC_VOICE_PROVIDER=whisperflow
 *   NEXT_PUBLIC_WHISPERFLOW_URL=ws://localhost:8181/ws
 * (see .env.local.example). If unset, the app falls back to the browser's
 * built-in Web Speech API so voice still works out of the box.
 */
export class WhisperFlowRecognizer implements Recognizer {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (e: unknown) => void;

  private ws?: WebSocket;
  private stream?: MediaStream;
  private audioCtx?: AudioContext;
  private node?: ScriptProcessorNode;
  private finalText = "";

  constructor(private url: string) {}

  async start(): Promise<void> {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = "arraybuffer";
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            Transcript?: string;
            IsPartial?: boolean;
          };
          const text = (msg.Transcript ?? "").trim();
          if (!text) return;
          if (msg.IsPartial) {
            this.onPartial?.(text);
          } else {
            this.finalText = text;
            this.onFinal?.(text);
          }
        } catch (e) {
          this.onError?.(e);
        }
      };
      this.ws.onerror = (e) => this.onError?.(e);

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 16 kHz capture so we send exactly what whisper-flow expects
      this.audioCtx = new AudioContext({ sampleRate: 16000 });
      const src = this.audioCtx.createMediaStreamSource(this.stream);
      this.node = this.audioCtx.createScriptProcessor(4096, 1, 1);
      src.connect(this.node);
      this.node.connect(this.audioCtx.destination);

      this.node.onaudioprocess = (e) => {
        if (this.ws?.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0); // Float32 [-1,1]
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.ws.send(pcm.buffer);
      };
    } catch (e) {
      this.onError?.(e);
      throw e;
    }
  }

  stop(): void {
    try {
      this.node?.disconnect();
      this.audioCtx?.close();
      this.stream?.getTracks().forEach((t) => t.stop());
      this.ws?.close();
    } catch {
      /* noop */
    }
    if (this.finalText) this.finalText = "";
  }
}

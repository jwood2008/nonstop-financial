"use client";

import { useEffect, useRef, useState } from "react";
import {
  randomPersona,
  randomNumber,
  hashString,
  type Persona,
  type Turn,
} from "@/lib/personas";
import {
  initCallState,
  coldCallReply,
  scoreColdCall,
  type CallState,
  type CallResult,
} from "@/lib/coldcall";
import {
  createRecognizer,
  speak,
  cancelSpeech,
  isVoiceSupported,
  voiceProvider,
  type Recognizer,
} from "@/lib/voice";
import { ringback, pickup, hangupTone } from "@/lib/sfx";
import { useResizableWidth, useMediaQuery } from "@/lib/useResizable";
import {
  Phone,
  PhoneOff,
  Mic,
  Square,
  Star,
  Trophy,
  RotateCcw,
  Loader2,
  Volume2,
  AlertTriangle,
  User,
  Headset,
  Check,
  Gauge,
  Shuffle,
} from "lucide-react";

type Phase = "idle" | "ringing" | "incall" | "ended";
type Activity = "greeting" | "waiting" | "listening" | "thinking" | "speaking";

export function ColdCall() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [activity, setActivity] = useState<Activity>("greeting");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [number, setNumber] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [interim, setInterim] = useState("");
  const [secs, setSecs] = useState(0);
  const [result, setResult] = useState<CallResult | null>(null);
  const [spin, setSpin] = useState(1);
  const [err, setErr] = useState<string | null>(null);

  const stateRef = useRef<CallState | null>(null);
  const usedRef = useRef<Set<string>>(new Set());
  const turnsRef = useRef<Turn[]>([]);
  const recRef = useRef<Recognizer | null>(null);
  const ringRef = useRef<{ stop: () => void } | null>(null);
  const interimRef = useRef("");
  const gotFinalRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supported = typeof window !== "undefined" ? isVoiceSupported() : true;

  // resizable call card
  const isLg = useMediaQuery("(min-width: 1024px)");
  const { ref, width, setWidth, startDrag } = useResizableWidth({
    storageKey: "nf.callW",
    initial: 760,
    min: 460,
    max: 1180,
  });

  // call timer
  useEffect(() => {
    if (phase !== "incall") return;
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [turns, interim]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      ringRef.current?.stop();
      recRef.current?.stop();
      cancelSpeech();
    };
  }, []);

  const voiceParams = (p: Persona) => ({
    voiceSeed: hashString(p.name),
    pitch: p.age >= 55 ? 0.92 : p.age <= 30 ? 1.08 : 1.0,
    rate: 0.98,
  });

  /* -------- start the call: ring, then the prospect picks up -------- */
  const startCall = async () => {
    setErr(null);
    const seed = hashString(`call-${spin}-${Math.floor(performance.now())}`);
    const p = randomPersona(seed);
    setSpin((s) => s + 1);
    setPersona(p);
    setNumber(randomNumber(seed));
    setTurns([]);
    setInterim("");
    setSecs(0);
    stateRef.current = initCallState(p);
    usedRef.current = new Set();
    turnsRef.current = [];
    setResult(null);
    setActivity("greeting");
    setPhase("ringing");

    ringRef.current = ringback();
    window.setTimeout(async () => {
      ringRef.current?.stop();
      pickup();
      setPhase("incall");
      turnsRef.current = [{ from: "consumer", text: p.opener }];
      setTurns(turnsRef.current);
      await speak(p.opener, voiceParams(p));
      setActivity("waiting");
    }, 4200);
  };

  /* -------- push-to-talk -------- */
  const startListening = async () => {
    if (activity !== "waiting" || !persona) return;
    setErr(null);
    setInterim("");
    interimRef.current = "";
    gotFinalRef.current = false;

    const rec = createRecognizer();
    recRef.current = rec;
    rec.onPartial = (t) => {
      interimRef.current = t;
      setInterim(t);
    };
    rec.onFinal = (t) => {
      gotFinalRef.current = true;
      handleAgentTurn(t);
    };
    rec.onError = () => {
      setErr(
        "Couldn't access the mic / speech recognition. Use Chrome or Edge, allow the mic, or connect a whisper-flow server."
      );
      setActivity("waiting");
    };
    try {
      await rec.start();
      setActivity("listening");
    } catch {
      /* onError already fired */
    }
  };

  const stopListening = () => {
    recRef.current?.stop();
    // if the engine didn't emit a final, use the last interim
    window.setTimeout(() => {
      if (!gotFinalRef.current && interimRef.current.trim()) {
        handleAgentTurn(interimRef.current);
      } else if (!gotFinalRef.current) {
        setActivity("waiting");
        setInterim("");
      }
    }, 200);
  };

  const handleAgentTurn = async (text: string) => {
    if (!persona || !text.trim() || !stateRef.current) {
      setActivity("waiting");
      return;
    }
    recRef.current?.stop();
    setInterim("");
    turnsRef.current = [...turnsRef.current, { from: "agent", text }];
    setTurns(turnsRef.current);
    setActivity("thinking");

    const { text: reply, state: next, techniqueIds } = coldCallReply(
      persona,
      text,
      stateRef.current
    );
    stateRef.current = next;
    techniqueIds.forEach((id) => usedRef.current.add(id));

    window.setTimeout(async () => {
      setActivity("speaking");
      turnsRef.current = [...turnsRef.current, { from: "consumer", text: reply }];
      setTurns(turnsRef.current);
      await speak(reply, voiceParams(persona));
      if (next.ended) {
        hangupTone();
        setResult(scoreColdCall(turnsRef.current, next, usedRef.current));
        setPhase("ended");
      } else {
        setActivity("waiting");
      }
    }, 500);
  };

  /* -------- hang up -------- */
  const hangUp = () => {
    recRef.current?.stop();
    ringRef.current?.stop();
    cancelSpeech();
    hangupTone();
    if (stateRef.current)
      setResult(scoreColdCall(turnsRef.current, stateRef.current, usedRef.current));
    setPhase("ended");
  };

  const reset = () => {
    setPhase("idle");
    setPersona(null);
    setTurns([]);
    turnsRef.current = [];
    usedRef.current = new Set();
    setResult(null);
  };

  const rapport = stateRef.current?.rapport ?? 0;
  const meter = Math.round((rapport / 10) * 100);
  const clock = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(
    secs % 60
  ).padStart(2, "0")}`;

  /* =============================== RENDER =============================== */

  // launch screen
  if (phase === "idle") {
    return (
      <div className="relative mx-auto max-w-2xl">
        {/* ambient glow */}
        <div className="pointer-events-none absolute left-1/2 -top-10 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[110px]" />

        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-10 text-center shadow-2xl shadow-black/40 backdrop-blur-xl">
          {/* concentric-ring phone icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.03] ring-1 ring-white/10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] shadow-[0_0_30px_-6px_rgba(16,185,129,0.55)] ring-1 ring-white/10">
              <Phone className="h-6 w-6 text-emerald-400" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Cold call roleplay
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            Hit dial and a brand-new prospect picks up. You know nothing about
            them — open the call, handle objections, and try to close. It&apos;s a
            live voice call: you talk, they talk back.
          </p>

          {!supported && (
            <div className="mx-auto mt-5 flex max-w-md items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3 text-left text-xs text-amber-300/90">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Voice input needs Chrome/Edge (Web Speech API) or a connected
                whisper-flow server. You can still dial to preview the flow.
              </span>
            </div>
          )}

          <button
            onClick={startCall}
            className="group mt-8 inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all duration-300 hover:from-emerald-300 hover:to-emerald-500 hover:shadow-[0_8px_30px_-6px_rgba(16,185,129,0.5)] focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-2 focus:ring-offset-[#0d0e11]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden
            >
              <path d="M6.6 10.8a15.6 15.6 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.5.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.2.2 2.4.57 3.5a1 1 0 0 1-.25 1l-2.2 2.3Z" />
            </svg>
            Start cold call roleplay
          </button>

          <p className="mt-4 text-xs text-slate-500">
            A new persona is hashed every dial ·{" "}
            {voiceProvider() === "whisperflow" ? "whisper-flow voice" : "browser voice"}
          </p>
        </div>

        {/* supporting elements */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              icon: Shuffle,
              title: "Unknown prospect",
              body: "A fresh persona is hashed on every dial.",
            },
            {
              icon: Mic,
              title: "Talk it out",
              body: "Real voice call — or type your responses.",
            },
            {
              icon: Gauge,
              title: "Scored live",
              body: "Opener · rapport · technique · outcome.",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-left backdrop-blur-sm"
              >
                <Icon className="h-4 w-4 text-emerald-400/80" strokeWidth={1.75} />
                <div className="mt-2 text-sm font-medium text-white/90">
                  {s.title}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {s.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ringing screen
  if (phase === "ringing") {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="border border-line bg-surface p-10">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center bg-surface-3">
            <Phone className="h-10 w-10 animate-pulse text-zinc-300" />
          </div>
          <p className="font-display text-xl font-bold text-white">Dialing…</p>
          <p className="mt-1 text-sm text-muted-2">{number}</p>
          <p className="mt-6 text-xs text-muted-2">Ringing — the prospect is about to pick up.</p>
          <button
            onClick={() => {
              ringRef.current?.stop();
              cancelSpeech();
              reset();
            }}
            className="mt-6 inline-flex items-center gap-1.5 bg-red-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            <PhoneOff className="h-4 w-4" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  // ended → debrief
  if (phase === "ended" && result && persona) {
    return <CallDebrief result={result} persona={persona} onAgain={reset} />;
  }

  // in-call
  return (
    <div className="flex items-stretch">
      <div
        ref={ref}
        style={isLg ? { width } : undefined}
        className="flex h-[calc(100vh-11rem)] min-h-[460px] w-full min-w-0 max-w-full flex-col border border-line bg-surface"
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-line p-4">
          <span className="relative flex h-11 w-11 items-center justify-center bg-surface-3">
            <Phone className="h-5 w-5 text-zinc-300" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse bg-green-500" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold leading-tight text-white">Unknown Caller</p>
            <p className="truncate text-xs text-muted-2">
              {number} · <span className="text-zinc-300">{clock}</span> · blind call
            </p>
          </div>
          <div className="hidden w-40 sm:block">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-muted-2">
              <span>Rapport</span>
              <span>{meter}%</span>
            </div>
            <div className="h-2 overflow-hidden bg-surface-3">
              <div
                className={`h-full transition-all ${
                  rapport >= 7
                    ? "bg-green-500"
                    : rapport <= 2
                    ? "bg-red-500"
                    : "bg-nonstop"
                }`}
                style={{ width: `${meter}%` }}
              />
            </div>
          </div>
          <button
            onClick={hangUp}
            className="flex items-center gap-1.5 bg-red-500/90 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            <PhoneOff className="h-4 w-4" /> Hang up
          </button>
        </div>

        {/* live captions */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 scroll-thin">
          <p className="mx-auto w-fit bg-surface-2 px-3 py-1 text-[11px] text-muted-2">
            Live voice call — captions shown below
          </p>
          {turns.map((t, i) => (
            <Caption key={i} turn={t} />
          ))}
          {interim && (
            <div className="flex flex-row-reverse gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-surface-3 text-zinc-400">
                <Headset className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="max-w-[78%] bg-surface-3 px-3.5 py-2.5 text-sm italic text-white">
                {interim}…
              </div>
            </div>
          )}
        </div>

        {/* mic control */}
        <div className="border-t border-line p-4">
          <div className="flex flex-col items-center gap-2">
            <MicControl
              activity={activity}
              onStart={startListening}
              onStop={stopListening}
              persona={persona}
            />
            {err && <p className="text-center text-xs text-red-400">{err}</p>}
          </div>
        </div>
      </div>

      {/* drag-to-resize */}
      <div
        onMouseDown={startDrag}
        onDoubleClick={() => setWidth(760)}
        title="Drag to resize · double-click to reset"
        className="group ml-1 hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-line transition-colors hover:bg-nonstop lg:flex"
      >
        <span className="h-10 w-1 bg-line-2 transition-colors group-hover:bg-nonstop" />
      </div>
    </div>
  );
}

/* ----------------------------- bits ----------------------------- */

function Caption({ turn }: { turn: Turn }) {
  const isAgent = turn.from === "agent";
  return (
    <div className={`flex gap-2 ${isAgent ? "flex-row-reverse" : ""}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-surface-3 text-zinc-400">
        {isAgent ? (
          <Headset className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <User className="h-4 w-4" strokeWidth={1.75} />
        )}
      </span>
      <div
        className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed ${
          isAgent ? "bg-nonstop text-white" : "border border-line-2 bg-surface-2 text-zinc-200"
        }`}
      >
        {turn.text}
      </div>
    </div>
  );
}

function MicControl({
  activity,
  onStart,
  onStop,
  persona,
}: {
  activity: Activity;
  onStart: () => void;
  onStop: () => void;
  persona: Persona | null;
}) {
  if (activity === "speaking") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Volume2 className="h-5 w-5 animate-pulse text-zinc-300" />
        {persona?.name.split(" ")[0] ?? "Prospect"} is talking…
      </div>
    );
  }
  if (activity === "thinking" || activity === "greeting") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        {activity === "greeting" ? "Connecting…" : "…"}
      </div>
    );
  }
  if (activity === "listening") {
    return (
      <>
        <button
          onClick={onStop}
          className="flex h-16 w-16 items-center justify-center bg-red-500 text-white ring-4 ring-red-500/30 transition hover:bg-red-400"
        >
          <Square className="h-6 w-6 fill-white" />
        </button>
        <p className="text-xs text-red-400">Listening… tap to send</p>
      </>
    );
  }
  // waiting
  return (
    <>
      <button
        onClick={onStart}
        className="flex h-16 w-16 items-center justify-center bg-nonstop text-white transition hover:bg-nonstop-dark"
      >
        <Mic className="h-7 w-7" />
      </button>
      <p className="text-xs text-muted-2">Tap to talk</p>
    </>
  );
}

/* ----------------------------- debrief ----------------------------- */
const OUTCOME_META: Record<
  CallResult["outcome"],
  { label: string; cls: string }
> = {
  "next-step": {
    label: "You earned a next step",
    cls: "border-green-500/40 bg-green-500/10 text-green-300",
  },
  "hung-up": {
    label: "They hung up on you",
    cls: "border-red-500/40 bg-red-500/10 text-red-300",
  },
  open: {
    label: "Call ended — no commitment",
    cls: "border-line-2 bg-surface-2 text-muted",
  },
};

function CallDebrief({
  result,
  persona,
  onAgain,
}: {
  result: CallResult;
  persona: Persona;
  onAgain: () => void;
}) {
  const o = OUTCOME_META[result.outcome];
  return (
    <div className="mx-auto max-w-xl">
      <div className="border border-line bg-surface p-6">
        {/* who you actually called */}
        <div className="mb-4 flex items-center gap-3 border border-line-2 bg-surface-2 p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-line-2 bg-surface-3 text-zinc-400">
            <User className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-muted-2">
              You were actually talking to
            </p>
            <p className="font-display font-bold text-white">
              {persona.name}{" "}
              <span className="font-normal text-muted">· {persona.role}</span>
            </p>
            <p className="text-xs text-muted-2">
              Mood: <span className="text-zinc-300">{persona.temperament}</span> ·{" "}
              {persona.difficulty}
            </p>
          </div>
        </div>

        {/* outcome of THIS call */}
        <div className={`mb-4 border px-3 py-2 text-sm font-semibold ${o.cls}`}>
          {o.label}
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-zinc-300" />
          <div>
            <h3 className="font-display text-lg font-bold text-white">Call Debrief</h3>
            <p className="text-xs text-muted">Overall {result.overall}/5</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {result.scores.map((s) => (
            <div key={s.label} className="border border-line bg-surface-2 p-3">
              <p className="text-[11px] text-muted-2">{s.label}</p>
              <div className="mt-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${
                      n <= s.value ? "fill-zinc-300 text-zinc-300" : "text-line-2"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* techniques actually detected in this call */}
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-2">
            Techniques you used
          </p>
          {result.used.length ? (
            <div className="flex flex-wrap gap-2">
              {result.used.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-300"
                >
                  <Check className="h-3 w-3" /> {t.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              None detected — you didn&apos;t use any of the playbook techniques.
            </p>
          )}
        </div>

        {result.missed.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-2">
              Missed opportunities
            </p>
            <div className="flex flex-wrap gap-2">
              {result.missed.map((t) => (
                <span
                  key={t.id}
                  className="border border-line-2 px-2.5 py-1 text-xs text-muted-2"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-2">
            What happened on this call
          </p>
          <ul className="space-y-1.5">
            {result.tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-200">
                <span className="text-zinc-300">›</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onAgain}
          className="mt-5 inline-flex items-center gap-1.5 bg-green-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-400"
        >
          <RotateCcw className="h-4 w-4" /> Dial a new prospect
        </button>
      </div>
    </div>
  );
}

import type { Persona, Turn } from "./personas";
import { readAgentMessage, TECHNIQUES } from "./techniques";

/**
 * COLD-CALL ENGINE
 * ----------------
 * Hyper-realistic: the prospect answered an unknown number and has NO idea why
 * you're calling. They are suspicious / busy / dismissive by default and will
 * reject unless you earn it. They only react to insurance once YOU reveal it.
 * Good technique (see techniques.ts) makes them play along; pressure or pitching
 * before context gets you brushed off — or hung up on.
 */

export interface CallState {
  rapport: number; // 0..10
  suspicion: number; // 0..10
  patience: number; // goodwill turns left before they bail
  knowsPurpose: boolean; // have you told them why you're calling?
  turns: number;
  ended: boolean; // they hung up
  outcome: "open" | "hung-up" | "next-step";
}

export function initCallState(persona: Persona): CallState {
  // temperament sets the starting mood
  const t = persona.temperament ?? "";
  const hostile = /hostile|burned/i.test(t);
  const busy = /busy|impatient/i.test(t);
  const friendly = /friendly|curious|willing/i.test(t);
  return {
    rapport: friendly ? 2 : 1,
    suspicion: hostile ? 8 : busy ? 6 : 5,
    patience: hostile ? 2 : busy ? 2 : 3,
    knowsPurpose: false,
    turns: 1,
    ended: false,
    outcome: "open",
  };
}

/* ---- generic prospect lines: a normal person, NOT an insurance lead ---- */
const SAY = {
  suspicious: [
    "Who is this?",
    "I'm sorry, do I know you?",
    "How did you get this number?",
    "What's this regarding?",
    "Is this some kind of sales call?",
    "Hello? What do you want?",
  ],
  defensive: [
    "Whoa — why do you want to know that? Who is this?",
    "I'm not telling a stranger that. What is this about?",
    "That's a weird thing to ask. Who am I talking to?",
  ],
  busy: [
    "Look, I'm right in the middle of something.",
    "Now's really not a good time.",
    "Make it fast, I'm working.",
  ],
  soften: [
    "…Okay. You've got thirty seconds, go.",
    "Huh. At least you're upfront. What is it?",
    "Alright, I'm listening — barely.",
    "Fine, you've got a sec. What's this about?",
  ],
  needPurpose: [
    "Wait — what are you even calling about?",
    "You're losing me. What is this?",
    "I have no idea what you're getting at.",
  ],
  rejectCold: [
    "Yeah, I'm not interested, thanks.",
    "Whatever you're offering, I'm good.",
    "Not interested. Please take me off your list.",
    "No thanks, I've got to go.",
  ],
  warmListen: [
    "Okay… that's not the usual pitch. Go on.",
    "Hm. Keep talking, you've got a minute.",
    "Alright, that's a little different. What do you mean?",
  ],
  engage: [
    "Honestly? Things have been a little tight lately.",
    "I mean… I do have a family, so. Go on.",
    "I haven't really thought about that stuff, no.",
    "Yeah, I guess that's been on my mind a bit.",
  ],
  closeReject: [
    "Whoa, I'm not agreeing to anything on a cold call.",
    "You're moving way too fast for me.",
    "Slow down — I just picked up the phone.",
  ],
  closeAccept: [
    "…Alright. Send me something and we'll talk.",
    "Okay, you've earned a few minutes later this week.",
    "Fine. Text me a time and I'll think about it.",
  ],
  angry: [
    "Don't tell me what I need.",
    "Yeah, we're done here.",
    "I knew it was a sales call. Goodbye.",
  ],
  hangup: ["Yeah, I'm gonna go. *click*", "Nope. *click*", "Lose this number. *click*"],
};

const pick = (arr: string[], seed: number) => arr[((seed % arr.length) + arr.length) % arr.length];
const clamp = (n: number) => Math.max(0, Math.min(10, n));

export interface CallReply {
  text: string;
  state: CallState;
  techniqueIds: string[];
}

export function coldCallReply(
  persona: Persona,
  msg: string,
  prev: CallState
): CallReply {
  const read = readAgentMessage(msg);
  const seed = prev.turns * 7 + msg.length;
  const first = persona.name.split(" ")[0];

  const s: CallState = { ...prev, turns: prev.turns + 1 };
  s.rapport = clamp(s.rapport + read.rapportDelta);
  if (read.techniques.some((t) => /permission|pattern-interrupt|empathy/.test(t.id))) {
    s.suspicion = clamp(s.suspicion - 2);
    s.patience += 1;
  }
  if (read.marksPurpose) s.knowsPurpose = true;

  let text = "";

  // ---- 1. pressure: cold prospects shut down fast ----
  if (read.pushy) {
    s.rapport = clamp(s.rapport - 2);
    s.suspicion = clamp(s.suspicion + 2);
    s.patience -= 1;
    if (s.rapport <= 1 || s.patience <= 0) {
      s.ended = true;
      s.outcome = "hung-up";
      text = pick(SAY.hangup, seed);
    } else {
      text = pick(SAY.angry, seed);
    }
    return { text, state: s, techniqueIds: read.techniques.map((t) => t.id) };
  }

  // ---- 2. invasive personal question with no context ----
  if (read.asksPersonal && !prev.knowsPurpose) {
    s.suspicion = clamp(s.suspicion + 2);
    s.patience -= 1;
    text = pick(SAY.defensive, seed);
  }
  // ---- 3. trying to close ----
  else if (read.isClose) {
    if (s.rapport >= 7 && s.knowsPurpose) {
      s.outcome = "next-step";
      text = pick(SAY.closeAccept, seed);
    } else {
      s.rapport = clamp(s.rapport - 1);
      text = pick(SAY.closeReject, seed);
    }
  }
  // ---- 4. they still don't know why you're calling ----
  else if (!s.knowsPurpose) {
    // pitching value before saying why = confusion
    if (/\b(save|protect|benefit|help you|offer|deal)\b/i.test(msg)) {
      text = pick(SAY.needPurpose, seed);
    } else if (read.techniques.length && s.suspicion <= 5) {
      text = pick(SAY.soften, seed); // good technique earns a moment
    } else if (s.suspicion >= 7) {
      s.patience -= 1;
      text = pick(seed % 2 ? SAY.suspicious : SAY.busy, seed);
    } else {
      text = pick(SAY.suspicious, seed);
    }
  }
  // ---- 5. they know the purpose now — react to the pitch ----
  else {
    if (s.rapport >= 6 && read.isQuestion) {
      // open up about THEIR life — makes each prospect personal
      const situ = persona.situation;
      const personal = situ
        ? [
            `Honestly… ${situ}, so yeah — that's been on my mind.`,
            `I mean, ${situ}. I haven't really dealt with it.`,
            `Between you and me, ${situ}. So go on.`,
          ]
        : SAY.engage;
      text = pick(personal, seed);
    } else if (s.rapport >= 5) {
      text = pick(SAY.warmListen, seed);
    } else {
      s.patience -= 1;
      text = pick(SAY.rejectCold, seed);
    }
  }

  // ---- ran out of goodwill: they bail ----
  if (!s.ended && s.patience <= 0 && s.rapport < 3) {
    s.ended = true;
    s.outcome = "hung-up";
    text = `${pick(SAY.rejectCold, seed)} ${pick(SAY.hangup, seed + 1)}`;
  }

  // occasionally use their name when warming
  if (s.rapport >= 5 && seed % 3 === 0) text = text.replace(/\.$/, `, ${first}.`);

  return { text, state: s, techniqueIds: read.techniques.map((t) => t.id) };
}

/* ----------------------------- scoring ----------------------------- */
export interface CallResult {
  scores: { label: string; value: number }[];
  overall: number;
  outcome: CallState["outcome"];
  used: { id: string; name: string }[];
  missed: { id: string; name: string }[];
  tips: string[];
}

export function scoreColdCall(
  turns: Turn[],
  state: CallState,
  usedIds: Set<string>
): CallResult {
  const clampS = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
  const agentTurns = turns.filter((t) => t.from === "agent");

  const used = TECHNIQUES.filter((t) => usedIds.has(t.id) && !t.pushy).map((t) => ({
    id: t.id,
    name: t.name,
  }));
  const missed = TECHNIQUES.filter((t) => !t.pushy && !usedIds.has(t.id)).map((t) => ({
    id: t.id,
    name: t.name,
  }));
  const wasPushy = usedIds.has("pushy");

  const opener = clampS(
    1 +
      (usedIds.has("pattern-interrupt") ? 2 : 0) +
      (usedIds.has("permission") ? 1 : 0) +
      (usedIds.has("intro-self") ? 1 : 0)
  );
  const rapport = clampS(1 + state.rapport / 2.2);
  const technique = clampS(1 + used.length - (wasPushy ? 1 : 0));
  const close = clampS(
    state.outcome === "next-step" ? 5 : state.knowsPurpose ? 2 + state.rapport / 4 : 1
  );

  const tips: string[] = [];
  if (!usedIds.has("reason") && !state.knowsPurpose)
    tips.push("You never told them why you were calling — they stayed confused and suspicious.");
  if (!usedIds.has("pattern-interrupt"))
    tips.push("Open by disarming the cold call (\"I know you don't know me…\") to drop their guard.");
  if (!usedIds.has("permission"))
    tips.push("Ask permission for a few seconds before launching in.");
  if (wasPushy) tips.push("You applied pressure — cold prospects shut down. Stay calm and curious.");
  if (state.outcome === "hung-up") tips.push("They hung up. Slow down and earn the next sentence.");
  if (state.outcome === "next-step") tips.push("You earned a next step on a cold call — excellent.");
  if (!tips.length) tips.push("Solid call. Keep stacking techniques to convert more cold prospects.");

  return {
    scores: [
      { label: "Opener", value: opener },
      { label: "Rapport", value: rapport },
      { label: "Technique", value: technique },
      { label: "Outcome", value: close },
    ],
    overall: clampS((opener + rapport + technique + close) / 4),
    outcome: state.outcome,
    used,
    missed: missed.slice(0, 4),
    tips,
  };
}

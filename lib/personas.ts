/**
 * AI ROLEPLAY — consumer personas the agent practices selling against.
 * Each persona is a "consumer agent" with a voice, a primary objection, and
 * lines for discovery / objection / stalling / warming up.
 *
 * There is no LLM wired up yet (Phase 2). `nextConsumerLine()` is a deterministic
 * mock engine so the simulator is fully demoable today. When OpenAI is added,
 * swap that one function for a chat completion seeded with `persona.systemPrompt`.
 *
 * Personas are editable by admins and persisted to localStorage (see store) —
 * add as many or as few as you want.
 */

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Persona {
  id: string;
  name: string;
  age: number;
  /** one-line "who they are", e.g. "Retired teacher, mother of three" */
  role: string;
  emoji: string;
  difficulty: Difficulty;
  /** the objection they lead with, e.g. "Price / fixed income" */
  primaryObjection: string;
  /** cold-call disposition — how they answer an unknown number */
  temperament?: string;
  /** first-person life situation they reveal once they warm up */
  situation?: string;
  bio: string;
  /** first thing they say when the call opens */
  opener: string;
  /** signature objection phrasings (their "voice") */
  objections: string[];
  /** what they say once the agent has earned trust */
  warmLines: string[];
  /** concerns they reveal during discovery */
  concerns: string[];
}

export const SEED_PERSONAS: Persona[] = [
  {
    id: "p-linda",
    name: "Linda Foster",
    age: 60,
    role: "Retired teacher, mother of three, on a fixed income",
    emoji: "👩‍🦳",
    difficulty: "Hard",
    primaryObjection: "Price / fixed income",
    bio: "Cautious and warm but watches every dollar since retiring. Has been burned by a pushy advisor before, so she needs to feel respected, not sold.",
    opener: "Hi… my daughter said I should look into this, but I'll be honest, money's tight since I retired. What is this going to cost me?",
    objections: [
      "That sounds like a lot for someone on a fixed income.",
      "My late husband always said insurance was a waste of money.",
      "I just don't want to sign up for another monthly bill I can't keep up with.",
    ],
    warmLines: [
      "Hm. When you put it that way, it does sound like it would help the kids.",
      "Okay, you're not being pushy like the last fellow. Tell me a little more.",
    ],
    concerns: [
      "Honestly, I just don't want to be a burden on my children when I'm gone.",
      "I worry about leaving enough to cover my funeral so the kids don't have to.",
    ],
  },
  {
    id: "p-marcus",
    name: "Marcus Chen",
    age: 30,
    role: "Software engineer, analytical DIY investor",
    emoji: "👨‍💻",
    difficulty: "Medium",
    primaryObjection: "Skeptical / 'I can invest it myself'",
    bio: "Numbers-driven and skeptical of sales pitches. Will push back on fees and ask for data. Respects clear, honest reasoning over emotion.",
    opener: "Before we start — I already invest in index funds. Convince me why I'd want whole life instead of just buying term and investing the difference.",
    objections: [
      "The internal rate of return on that looks worse than the S&P. Walk me through the math.",
      "That sounds like it's mostly fees for you. What's the catch?",
      "I can buy term for way less and invest the rest. Why wouldn't I?",
    ],
    warmLines: [
      "Okay, the tax-advantaged angle is actually interesting. Keep going.",
      "Fair point on the guaranteed floor — I hadn't modeled it that way.",
    ],
    concerns: [
      "I guess if I'm honest, my portfolio is 100% market risk right now.",
      "My fiancée and I are buying a house, so protecting income matters more than it used to.",
    ],
  },
  {
    id: "p-diane",
    name: "Diane Whitfield",
    age: 45,
    role: "Small-business owner, always short on time",
    emoji: "👩‍💼",
    difficulty: "Medium",
    primaryObjection: "No time / 'send me something'",
    bio: "Runs a busy salon. Decisive when she sees value, but allergic to wasted time. If you ramble, she's gone.",
    opener: "I've got a client in ten minutes, so make it quick — what exactly are you offering and why should I care?",
    objections: [
      "Can you just email me a quote? I really don't have time for this.",
      "I've got payroll and rent — I can't add another expense right now.",
      "My accountant handles all this stuff. Talk to him.",
    ],
    warmLines: [
      "Okay, that's actually relevant to my business. You've got two more minutes.",
      "Key-person coverage? Nobody's framed it like that. Go on.",
    ],
    concerns: [
      "If something happened to me, the shop would close and my staff would be out of work.",
      "I've put everything into this business — there's no safety net behind it.",
    ],
  },
  {
    id: "p-carlos",
    name: "Carlos Rivera",
    age: 52,
    role: "Pre-retirement, risk-averse, distrusts advisors",
    emoji: "🧔",
    difficulty: "Hard",
    primaryObjection: "Distrust / 'been burned before'",
    bio: "Lost money in 2008 and got sold a bad annuity once. Slow to trust, but deeply loyal once he does. Values straight talk and patience.",
    opener: "Look, no offense, but the last guy who sat across from me cost me twenty grand. So why should I believe a word you say?",
    objections: [
      "That's exactly what the last advisor told me right before it blew up.",
      "How do I know you're not just chasing a commission?",
      "I've heard all the pitches. What makes you any different?",
    ],
    warmLines: [
      "Alright. You're the first one who didn't dodge that question.",
      "I appreciate you slowing down. Maybe walk me through it once more.",
    ],
    concerns: [
      "I'm ten years from retiring and I can't afford another mistake.",
      "I want to make sure my wife is taken care of if I'm not around.",
    ],
  },
  {
    id: "p-ashley",
    name: "Ashley Brooks",
    age: 28,
    role: "New parent buying her first policy",
    emoji: "👩",
    difficulty: "Easy",
    primaryObjection: "Overwhelmed / doesn't know where to start",
    bio: "Just had her first baby and knows she 'should' get life insurance but finds it confusing. Eager but easily overwhelmed by jargon.",
    opener: "Hi! So, we just had our daughter and everyone keeps saying we need life insurance… but honestly I have no idea where to even start.",
    objections: [
      "Wait, what's the difference between term and whole life again?",
      "Is this going to be really expensive? We're on a new-baby budget.",
      "There are so many options, it's kind of stressing me out.",
    ],
    warmLines: [
      "Oh, okay — that actually makes a lot of sense when you explain it like that.",
      "That would give me so much peace of mind. What's the next step?",
    ],
    concerns: [
      "I just want to know my daughter would be okay no matter what.",
      "My husband and I have some student debt I wouldn't want to leave behind.",
    ],
  },
];

/* ===================== RANDOM "HASHED" PERSONAS =====================
   The Dialer spins up a brand-new prospect every call. Identity is HIDDEN
   from the agent (blind cold call) — it's only revealed in the debrief.
   Seeded from the dialed number so the same number always reaches the same
   person, like a real contact. No preset personas involved. */

const FIRST = [
  "James", "Maria", "Robert", "Linda", "David", "Sarah", "Mike", "Angela",
  "Tom", "Nicole", "Frank", "Denise", "Greg", "Karen", "Luis", "Pam",
  "Derek", "Tanya", "Hank", "Rosa", "Bill", "Joyce", "Omar", "Brenda",
];
const LAST = [
  "Sullivan", "Nguyen", "Carter", "Patel", "Brooks", "Romano", "Fisher",
  "Owens", "Walsh", "Diaz", "Cole", "Reed", "Hughes", "Park", "Boyd", "Mata",
];
const SITU = [
  "works two jobs and has nothing saved",
  "just bought their first home",
  "recently divorced with two kids",
  "owns a struggling small business",
  "is five years from retirement",
  "is a brand-new college grad",
  "is caring for an aging parent",
  "is a single parent of three",
  "just had a health scare",
  "got a big promotion last year",
];
// first-person versions (same order) — used when the prospect opens up
const SITU_FP = [
  "I work two jobs and I've got nothing saved",
  "I just bought my first house",
  "I'm going through a divorce — two kids",
  "my business has been really struggling",
  "I'm about five years out from retiring",
  "I just graduated, I'm honestly broke",
  "I'm taking care of my mom right now",
  "I'm raising three kids on my own",
  "I had a bit of a health scare recently",
  "I got a big promotion last year",
];
const EMOJI = ["🧑", "👩", "👨", "🧔", "👱", "👵", "🧓", "👨‍🦱", "👩‍🦰", "🧑‍🦳"];
const OBJ_LABEL = [
  "Not interested",
  "No time right now",
  "Too expensive",
  "Already covered at work",
  "Doesn't trust salespeople",
  "Has to ask their spouse",
];

const TEMPERAMENTS = [
  "Suspicious of unknown numbers",
  "Busy and impatient",
  "Friendly but guarded",
  "Burned by salespeople, hostile",
  "Curious, willing to chat",
  "Skeptical and blunt",
];

const COLD_OPENERS = [
  "Hello? ...Who is this?",
  "Yeah, this is {first}. Who's calling?",
  "Hello? ...I don't recognize this number.",
  "Hello? If this is a robocall I'm hanging up.",
  "{first} speaking. Make it quick, I'm at work.",
  "Yeah? What do you want?",
];
const COLD_OBJECTIONS = [
  "Look, I'm really not interested in buying anything right now.",
  "How did you even get this number?",
  "I already have coverage through my job, so... no thanks.",
  "This sounds expensive and money's tight.",
  "I don't have time for this, I'm in the middle of something.",
  "I'd have to talk to my spouse before I decide anything.",
  "I've been burned by salespeople before, no offense.",
];
const COLD_CONCERNS = [
  "I mean... I do worry about leaving my family with debt, if I'm honest.",
  "I've been meaning to get something in place for the kids.",
  "I'm not getting any younger and nothing's set up yet.",
  "If something happened to me tomorrow, they'd be in trouble.",
];
const COLD_WARM = [
  "Huh. Okay, that actually makes sense. Tell me more.",
  "Alright, you've got my attention for a minute.",
  "I hadn't really thought about it like that.",
  "Okay, you're not as pushy as I expected. Go on.",
];

/** Tiny deterministic string hash → positive int. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const at = <T,>(arr: T[], n: number) => arr[n % arr.length];

/** Build a fresh, unique prospect from a numeric seed (e.g. hashed phone #). */
export function randomPersona(seed: number): Persona {
  const first = at(FIRST, seed);
  const last = at(LAST, seed >> 3);
  const situIdx = (seed >> 5) % SITU.length;
  const situ = SITU[situIdx];
  const age = 24 + ((seed >> 2) % 48);
  const diff: Difficulty = (["Easy", "Medium", "Hard"] as Difficulty[])[seed % 3];

  return {
    id: `dial-${seed}`,
    name: `${first} ${last}`,
    age,
    role: `${age}, ${situ}`,
    emoji: at(EMOJI, seed >> 4),
    difficulty: diff,
    primaryObjection: at(OBJ_LABEL, seed >> 1),
    temperament: at(TEMPERAMENTS, seed >> 6),
    situation: SITU_FP[situIdx],
    bio: `A cold prospect who ${situ}.`,
    opener: at(COLD_OPENERS, seed).replace(/\{first\}/g, first),
    objections: COLD_OBJECTIONS,
    warmLines: COLD_WARM,
    concerns: COLD_CONCERNS,
  };
}

/** A random, US-style phone number string for auto-fill. */
export function randomNumber(seed: number): string {
  const n = (off: number, len: number) =>
    String((seed >> off) % Math.pow(10, len)).padStart(len, "0");
  return `(${(200 + (seed % 800)).toString()}) ${n(3, 3)}-${n(6, 4)}`;
}

/* ============================ MOCK ENGINE ============================ */

export type Speaker = "agent" | "consumer";
export interface Turn {
  from: Speaker;
  text: string;
}

export interface RoleplayState {
  rapport: number; // -3..+6, starts 0
  stage: number; // how many consumer turns have happened
}

type Category = "discovery" | "price" | "close" | "value" | "smalltalk";

function classify(msg: string): Category {
  const m = msg.toLowerCase();
  if (/(sign|today|get started|apply|move forward|enroll|paperwork|next step|set.?up|go ahead)/.test(m))
    return "close";
  if (/(price|cost|expensive|cheap|afford|premium|per month|monthly|pay|budget|fee)/.test(m))
    return "price";
  if (/\?|family|kids|child|goal|retire|worried|concern|tell me|how do you|what do you|why|feel/.test(m))
    return "discovery";
  if (/(value|protect|benefit|guarantee|tax|cash value|peace of mind|legacy|income|future)/.test(m))
    return "value";
  return "smalltalk";
}

const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length];

/** Returns the consumer's next line + how rapport shifts. Deterministic-ish. */
export function nextConsumerLine(
  persona: Persona,
  agentMsg: string,
  state: RoleplayState
): { text: string; rapportDelta: number; nextState: RoleplayState } {
  const cat = classify(agentMsg);
  const seed = state.stage + agentMsg.length;
  let text = "";
  let rapportDelta = 0;

  // good discovery / listening builds rapport; pushing the close early hurts it
  switch (cat) {
    case "discovery":
      rapportDelta = +1;
      text = pick(persona.concerns, seed);
      break;
    case "value":
      rapportDelta = +1;
      text =
        state.rapport >= 2
          ? pick(persona.warmLines, seed)
          : pick(persona.objections, seed);
      break;
    case "price":
      rapportDelta = state.rapport >= 3 ? 0 : -1;
      text = pick(persona.objections, seed);
      break;
    case "close":
      if (state.rapport >= 4) {
        rapportDelta = +1;
        text = `${pick(persona.warmLines, seed)} Okay — let's talk about what that looks like.`;
      } else {
        rapportDelta = -1;
        text =
          "Whoa, slow down — you haven't even really heard what matters to me yet. I'm not ready to sign anything.";
      }
      break;
    default:
      rapportDelta = 0;
      text = pick(persona.objections, seed);
  }

  const nextRapport = Math.max(-3, Math.min(6, state.rapport + rapportDelta));
  return {
    text,
    rapportDelta,
    nextState: { rapport: nextRapport, stage: state.stage + 1 },
  };
}

/** End-of-session coaching scorecard (PRD: confidence, accuracy, objection handling, closing). */
export function scoreSession(turns: Turn[], finalRapport: number) {
  const agentTurns = turns.filter((t) => t.from === "agent");
  const questions = agentTurns.filter((t) => t.text.includes("?")).length;
  const attemptedClose = agentTurns.some((t) =>
    classify(t.text) === "close"
  );
  const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

  const confidence = clamp(2 + agentTurns.length / 3);
  const accuracy = clamp(2 + finalRapport / 2);
  const objection = clamp(1 + (finalRapport + 3) / 1.8);
  const closing = clamp((attemptedClose ? 3 : 1) + (finalRapport >= 4 ? 2 : 0));

  const tips: string[] = [];
  if (questions < 2)
    tips.push("Ask more discovery questions before pitching — you led with product, not their needs.");
  if (finalRapport < 2)
    tips.push("Slow down and build trust first; this persona pushes back when rushed.");
  if (!attemptedClose)
    tips.push("You never asked for the business — always attempt a soft close.");
  if (finalRapport >= 4 && attemptedClose)
    tips.push("Strong rapport and a clean close. Nicely done.");
  if (tips.length === 0) tips.push("Solid call. Tighten your objection responses for a higher score.");

  return {
    scores: [
      { label: "Confidence", value: confidence },
      { label: "Accuracy", value: accuracy },
      { label: "Objection Handling", value: objection },
      { label: "Closing", value: closing },
    ],
    overall: clamp((confidence + accuracy + objection + closing) / 4),
    tips,
  };
}

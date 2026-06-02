/**
 * COLD-CALL TECHNIQUES
 * --------------------
 * This is the plug-in point for Jay's playbook. Each technique is something a
 * good agent SAYS or DOES; the cold-call engine detects it in the agent's words
 * and the prospect "plays into it" (warms up) or pushes back (pressure/pitching
 * too early). Replace / extend this list with Jay's exact techniques + phrasing
 * when the document arrives — the engine reads from here, so nothing else needs
 * to change.
 *
 * rapport: how much this moves the prospect (+ good, - bad)
 * marksPurpose: true if using this reveals WHY you're calling
 * pushy: true if this is pressure the prospect resents
 */
export interface Technique {
  id: string;
  name: string;
  hint: string;
  patterns: RegExp[];
  rapport: number;
  marksPurpose?: boolean;
  pushy?: boolean;
}

export const TECHNIQUES: Technique[] = [
  {
    id: "pattern-interrupt",
    name: "Pattern interrupt / disarming honesty",
    hint: "Acknowledge it's a cold call before they do (\"I know you don't know me…\").",
    patterns: [
      /out of the blue/i,
      /you don'?t know me/i,
      /this is a cold call/i,
      /be (honest|upfront|straight)/i,
      /random (call|number)/i,
      /caught you (off guard|by surprise)/i,
    ],
    rapport: 2,
  },
  {
    id: "permission",
    name: "Permission-based opener",
    hint: "Ask for a small slice of time (\"Can I have 30 seconds?\").",
    patterns: [
      /(30|thirty) seconds/i,
      /a (minute|moment|sec)\b/i,
      /is now a (bad|good|terrible) time/i,
      /can i (steal|borrow|have|grab)/i,
      /do you have (a|time)/i,
      /mind if i/i,
    ],
    rapport: 2,
  },
  {
    id: "intro-self",
    name: "Clear self-introduction",
    hint: "Say your name and where you're calling from.",
    patterns: [/my name('?s| is)/i, /this is \w+/i, /i'?m \w+ (with|from|at)/i, /calling (from|with)/i],
    rapport: 1,
  },
  {
    id: "reason",
    name: "States a clear reason for the call",
    hint: "Tell them why you're calling — don't make them guess.",
    patterns: [
      /reason (i'?m|for) (calling|the call|reaching)/i,
      /calling (you )?(about|regarding|because)/i,
      /reaching out (because|about|to)/i,
      /the reason i('?m| am)/i,
    ],
    rapport: 1,
    marksPurpose: true,
  },
  {
    id: "curiosity",
    name: "Curiosity / open question",
    hint: "Ask an open question about them instead of pitching.",
    patterns: [/\b(how|what|why|tell me|have you)\b[^?]*\?/i],
    rapport: 1,
  },
  {
    id: "empathy-label",
    name: "Labeling / empathy",
    hint: "Name what they're feeling (\"Sounds like I caught you busy\").",
    patterns: [
      /it (sounds|seems) like/i,
      /i (get|understand|hear) (you|that)/i,
      /fair enough/i,
      /that makes sense/i,
      /i totally get/i,
    ],
    rapport: 1,
  },
  {
    id: "calm-tone",
    name: "Calm, low-pressure tone",
    hint: "Slow down, no rush.",
    patterns: [/no (rush|worries|pressure)/i, /real quick/i, /quick question/i, /promise i'?ll be quick/i],
    rapport: 1,
  },

  /* ---- negatives ---- */
  {
    id: "pushy",
    name: "Pushy / high pressure",
    hint: "Pressure tactics make cold prospects shut down.",
    patterns: [
      /buy (now|today)/i,
      /sign (up|now|here|today)/i,
      /today only/i,
      /limited time/i,
      /you (need|have) to/i,
      /trust me/i,
      /act (now|fast)/i,
      /(guarantee|guaranteed)/i,
    ],
    rapport: -2,
    pushy: true,
  },
];

/** Reveals WHY you're calling (any product/purpose mention). */
const PURPOSE = /\b(insurance|coverage|policy|life (insurance|policy)|protect(ion)?|financial|retirement|family'?s? (future|protected)|mortgage protection|final expense|benefits?)\b/i;

/** Personal questions that feel invasive before any context is established. */
const PERSONAL = /\b(where do you (work|live)|how much (do you|money)|what do you (make|do for)|are you married|your (income|salary|address|kids|children))\b/i;

const CLOSE = /\b(meet|meeting|appointment|schedule|sign|get started|next step|send you|set up a (call|time|meeting)|calendar|book (a|some) time|grab (a )?coffee)\b/i;

export interface AgentRead {
  techniques: Technique[];
  rapportDelta: number;
  marksPurpose: boolean;
  pushy: boolean;
  asksPersonal: boolean;
  isClose: boolean;
  isQuestion: boolean;
}

export function readAgentMessage(msg: string): AgentRead {
  const techniques = TECHNIQUES.filter((t) => t.patterns.some((re) => re.test(msg)));
  return {
    techniques,
    rapportDelta: techniques.reduce((n, t) => n + t.rapport, 0),
    marksPurpose: PURPOSE.test(msg) || techniques.some((t) => t.marksPurpose),
    pushy: techniques.some((t) => t.pushy),
    asksPersonal: PERSONAL.test(msg),
    isClose: CLOSE.test(msg),
    isQuestion: /\?/.test(msg),
  };
}

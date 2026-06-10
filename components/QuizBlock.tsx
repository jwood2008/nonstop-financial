"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type {
  ContentBlock,
  QuizData,
  QuizKind,
  QuizQuestion,
  MatchPair,
  QuizAttempt,
} from "@/lib/types";
import {
  Plus,
  Trash2,
  ListChecks,
  Shuffle,
  Trophy,
  Timer,
  RotateCcw,
  Check,
  X,
} from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 9);

const EMPTY: QuizData = { kind: "mcq", title: "Quiz", questions: [], pairs: [] };

/* ============================ ADMIN EDITOR ============================ */

export function QuizEditor({
  lessonId,
  block,
}: {
  lessonId: string;
  block: ContentBlock;
}) {
  const { updateBlock } = useStore();
  const quiz = block.quiz ?? EMPTY;
  const patch = (q: Partial<QuizData>) =>
    updateBlock(lessonId, block.id, { quiz: { ...quiz, ...q } });

  const setQuestions = (questions: QuizQuestion[]) => patch({ questions });
  const setPairs = (pairs: MatchPair[]) => patch({ pairs });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ListChecks className="h-4 w-4 text-zinc-300" />
        <input
          value={quiz.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Quiz title"
          className="min-w-0 flex-1 border border-line-2 bg-surface-2 px-3 py-2 text-sm font-medium text-white outline-none focus:border-nonstop"
        />
        <div className="flex border border-line-2">
          {(["mcq", "match"] as QuizKind[]).map((k) => (
            <button
              key={k}
              onClick={() => patch({ kind: k })}
              className={`px-3 py-2 text-xs font-semibold transition ${
                quiz.kind === k
                  ? "bg-nonstop text-white"
                  : "text-muted hover:text-white"
              }`}
            >
              {k === "mcq" ? "Multiple choice" : "Matching"}
            </button>
          ))}
        </div>
      </div>

      {quiz.kind === "mcq" ? (
        <McqEditor questions={quiz.questions} onChange={setQuestions} />
      ) : (
        <MatchEditor pairs={quiz.pairs} onChange={setPairs} />
      )}
    </div>
  );
}

function McqEditor({
  questions,
  onChange,
}: {
  questions: QuizQuestion[];
  onChange: (q: QuizQuestion[]) => void;
}) {
  const update = (i: number, q: Partial<QuizQuestion>) =>
    onChange(questions.map((x, idx) => (idx === i ? { ...x, ...q } : x)));

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={q.id} className="border border-line bg-surface-2 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-2">
              Q{i + 1}
            </span>
            <input
              value={q.prompt}
              onChange={(e) => update(i, { prompt: e.target.value })}
              placeholder="Question"
              className="min-w-0 flex-1 border border-line-2 bg-surface px-2.5 py-1.5 text-sm text-white outline-none focus:border-nonstop"
            />
            <button
              onClick={() => onChange(questions.filter((_, idx) => idx !== i))}
              className="p-1.5 text-muted-2 hover:text-red-400"
              title="Remove question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1.5 pl-7">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  onClick={() => update(i, { correct: oi })}
                  title="Mark correct"
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                    q.correct === oi
                      ? "border-nonstop bg-nonstop text-white"
                      : "border-line-2 text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </button>
                <input
                  value={opt}
                  onChange={(e) =>
                    update(i, {
                      options: q.options.map((o, idx) =>
                        idx === oi ? e.target.value : o
                      ),
                    })
                  }
                  placeholder={`Option ${oi + 1}`}
                  className="min-w-0 flex-1 border border-line-2 bg-surface px-2.5 py-1 text-sm text-zinc-200 outline-none focus:border-nonstop"
                />
                {q.options.length > 2 && (
                  <button
                    onClick={() =>
                      update(i, {
                        options: q.options.filter((_, idx) => idx !== oi),
                        correct: q.correct >= q.options.length - 1 ? 0 : q.correct,
                      })
                    }
                    className="p-1 text-muted-2 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => update(i, { options: [...q.options, ""] })}
              className="text-xs font-semibold text-zinc-300 hover:text-white"
            >
              + Add option
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() =>
          onChange([
            ...questions,
            { id: uid(), prompt: "", options: ["", ""], correct: 0 },
          ])
        }
        className="inline-flex items-center gap-1.5 border border-line-2 px-3 py-2 text-sm font-semibold text-white transition hover:border-nonstop"
      >
        <Plus className="h-4 w-4" /> Add question
      </button>
    </div>
  );
}

function MatchEditor({
  pairs,
  onChange,
}: {
  pairs: MatchPair[];
  onChange: (p: MatchPair[]) => void;
}) {
  const update = (i: number, p: Partial<MatchPair>) =>
    onChange(pairs.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-2">
        Add up to 10 term / definition pairs. Learners race to match them.
      </p>
      {pairs.map((p, i) => (
        <div key={p.id} className="flex items-center gap-2">
          <span className="w-5 text-[11px] text-muted-2">{i + 1}</span>
          <input
            value={p.term}
            onChange={(e) => update(i, { term: e.target.value })}
            placeholder="Term"
            className="w-1/3 min-w-0 border border-line-2 bg-surface-2 px-2.5 py-1.5 text-sm font-medium text-white outline-none focus:border-nonstop"
          />
          <input
            value={p.definition}
            onChange={(e) => update(i, { definition: e.target.value })}
            placeholder="Definition"
            className="min-w-0 flex-1 border border-line-2 bg-surface-2 px-2.5 py-1.5 text-sm text-zinc-200 outline-none focus:border-nonstop"
          />
          <button
            onClick={() => onChange(pairs.filter((_, idx) => idx !== i))}
            className="p-1.5 text-muted-2 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {pairs.length < 10 && (
        <button
          onClick={() => onChange([...pairs, { id: uid(), term: "", definition: "" }])}
          className="inline-flex items-center gap-1.5 border border-line-2 px-3 py-2 text-sm font-semibold text-white transition hover:border-nonstop"
        >
          <Plus className="h-4 w-4" /> Add term
        </button>
      )}
    </div>
  );
}

/* ============================ LEARNER PLAYER ============================ */

export function QuizPlayer({ block }: { block: ContentBlock }) {
  const quiz = block.quiz ?? EMPTY;
  const ready =
    quiz.kind === "mcq"
      ? quiz.questions.filter((q) => q.prompt.trim()).length > 0
      : quiz.pairs.filter((p) => p.term.trim() && p.definition.trim()).length >= 2;

  if (!ready) {
    return (
      <div className="flex flex-col items-center gap-2 border border-dashed border-line-2 py-8 text-center">
        <ListChecks className="h-7 w-7 text-muted-2" />
        <p className="text-sm text-muted">Quiz not set up yet.</p>
        <p className="text-xs text-muted-2">
          Turn on Edit (admin) to add {quiz.kind === "mcq" ? "questions" : "terms"}.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-line bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-nonstop" />
        <h3 className="font-display text-lg font-semibold text-white">{quiz.title}</h3>
        <span className="ml-auto border border-line-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-2">
          {quiz.kind === "mcq" ? "Quiz" : "Match"}
        </span>
      </div>
      {quiz.kind === "mcq" ? (
        <McqPlayer block={block} />
      ) : (
        <MatchPlayer block={block} />
      )}
    </div>
  );
}

function useMyName() {
  const { email } = useStore();
  return (email?.split("@")[0] ?? "You").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmt(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ---- MCQ ---- */
function McqPlayer({ block }: { block: ContentBlock }) {
  const quiz = block.quiz ?? EMPTY;
  const questions = quiz.questions.filter((q) => q.prompt.trim());
  const { addQuizResult, quizResults } = useStore();
  const myName = useMyName();
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState<QuizAttempt | null>(null);
  const start = useRef(Date.now());

  useEffect(() => {
    start.current = Date.now();
  }, [round]);

  // autosave: once taken, restore the completed result on revisit. One-shot so
  // a manual retry within the session isn't immediately re-locked.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || done) return;
    const prev = quizResults[block.id];
    if (prev && prev.length) {
      restored.current = true;
      setDone(prev[prev.length - 1]);
    }
  }, [quizResults, block.id, done]);

  const submit = () => {
    const correct = questions.filter((q) => answers[q.id] === q.correct).length;
    const percent = Math.round((correct / questions.length) * 100);
    const attempt: QuizAttempt = {
      name: myName,
      percent,
      timeMs: Date.now() - start.current,
      mistakes: questions.length - correct,
      kind: "mcq",
      at: Date.now(),
    };
    addQuizResult(block.id, attempt);
    setDone(attempt);
  };

  if (done) {
    return (
      <Results
        blockId={block.id}
        attempt={done}
        onRetry={() => {
          setAnswers({});
          setDone(null);
          setRound((r) => r + 1);
        }}
      />
    );
  }

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id}>
          <p className="mb-2 text-sm font-medium text-white">
            {i + 1}. {q.prompt}
          </p>
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                className={`block w-full border px-3 py-2 text-left text-sm transition ${
                  answers[q.id] === oi
                    ? "border-nonstop bg-nonstop/10 text-white"
                    : "border-line-2 text-muted hover:border-zinc-500 hover:text-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={submit}
        disabled={!allAnswered}
        className="bg-nonstop px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark disabled:opacity-40"
      >
        Submit quiz
      </button>
    </div>
  );
}

/* ---- Matching (Quizlet-style) ---- */
function MatchPlayer({ block }: { block: ContentBlock }) {
  const quiz = block.quiz ?? EMPTY;
  const pairs = useMemo(
    () => quiz.pairs.filter((p) => p.term.trim() && p.definition.trim()),
    [quiz.pairs]
  );
  const { addQuizResult, quizResults } = useStore();
  const myName = useMyName();

  const [round, setRound] = useState(0);
  const shuffledDefs = useMemo(
    () => [...pairs].sort(() => Math.random() - 0.5),
    [pairs, round]
  );

  const [selTerm, setSelTerm] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [started, setStarted] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    if (started === null || done) return;
    const id = window.setInterval(() => setElapsed(Date.now() - started), 100);
    return () => window.clearInterval(id);
  }, [started, done]);

  // autosave: restore the completed result on revisit (one-shot)
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || done) return;
    const prev = quizResults[block.id];
    if (prev && prev.length) {
      restored.current = true;
      setDone(prev[prev.length - 1]);
    }
  }, [quizResults, block.id, done]);

  const begin = () => {
    if (started === null) setStarted(Date.now());
  };

  const pickDef = (pairId: string) => {
    if (!selTerm) return;
    if (selTerm === pairId) {
      const next = new Set(matched).add(pairId);
      setMatched(next);
      setSelTerm(null);
      if (next.size === pairs.length && started !== null) {
        const timeMs = Date.now() - started;
        const percent = Math.round((pairs.length / (pairs.length + mistakes)) * 100);
        const attempt: QuizAttempt = {
          name: myName,
          percent,
          timeMs,
          mistakes,
          kind: "match",
          at: Date.now(),
        };
        addQuizResult(block.id, attempt);
        setDone(attempt);
      }
    } else {
      setMistakes((m) => m + 1);
      setWrong(pairId);
      window.setTimeout(() => setWrong(null), 350);
    }
  };

  if (done) {
    return (
      <Results
        blockId={block.id}
        attempt={done}
        onRetry={() => {
          setMatched(new Set());
          setSelTerm(null);
          setMistakes(0);
          setStarted(null);
          setElapsed(0);
          setDone(null);
          setRound((r) => r + 1);
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted">
          <Timer className="h-3.5 w-3.5" /> {fmt(elapsed)}
        </span>
        <span className="text-muted-2">
          {matched.size}/{pairs.length} matched · {mistakes} misses
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* terms */}
        <div className="space-y-2">
          {pairs.map((p) => {
            const isMatched = matched.has(p.id);
            const isSel = selTerm === p.id;
            return (
              <button
                key={p.id}
                disabled={isMatched}
                onClick={() => {
                  begin();
                  setSelTerm(p.id);
                }}
                className={`block w-full border px-3 py-2.5 text-left text-sm transition ${
                  isMatched
                    ? "border-line bg-surface-2 text-muted-2 opacity-40"
                    : isSel
                    ? "border-nonstop bg-nonstop/10 text-white"
                    : "border-line-2 text-white hover:border-zinc-500"
                }`}
              >
                {p.term}
              </button>
            );
          })}
        </div>
        {/* shuffled definitions */}
        <div className="space-y-2">
          {shuffledDefs.map((p) => {
            const isMatched = matched.has(p.id);
            const isWrong = wrong === p.id;
            return (
              <button
                key={p.id}
                disabled={isMatched}
                onClick={() => {
                  begin();
                  pickDef(p.id);
                }}
                className={`block w-full border px-3 py-2.5 text-left text-sm transition ${
                  isMatched
                    ? "border-green-500/40 bg-green-500/10 text-green-300 opacity-60"
                    : isWrong
                    ? "border-red-500/60 bg-red-500/10 text-red-300"
                    : "border-line-2 text-zinc-200 hover:border-zinc-500"
                }`}
              >
                {p.definition}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-2">
        Click a term, then its definition. Fastest time with fewest misses wins.
      </p>
    </div>
  );
}

/* ---- Results + leaderboard ---- */
function Results({
  blockId,
  attempt,
  onRetry,
}: {
  blockId: string;
  attempt: QuizAttempt;
  onRetry: () => void;
}) {
  const { quizResults } = useStore();
  const myName = useMyName();
  const all = quizResults[blockId] ?? [];

  // best attempt per person, then rank
  const best = new Map<string, QuizAttempt>();
  for (const a of all) {
    const cur = best.get(a.name);
    if (!cur || better(a, cur)) best.set(a.name, a);
  }
  const ranked = [...best.values()].sort(rank).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 border border-nonstop/30 bg-nonstop/5 p-4">
        <Trophy className="h-7 w-7 text-nonstop" />
        <div>
          <div className="font-display text-2xl font-bold text-white">
            {attempt.percent}%
            <span className="ml-2 text-sm font-normal text-muted">
              · {fmt(attempt.timeMs)} · {attempt.mistakes} misses
            </span>
          </div>
          <p className="text-xs text-muted-2">
            {attempt.kind === "match" ? "Match complete" : "Quiz submitted"}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="ml-auto inline-flex items-center gap-1.5 bg-nonstop px-4 py-2 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
        >
          <RotateCcw className="h-4 w-4" /> Retry
        </button>
      </div>

      <div>
        <h4 className="crosshead mb-2 text-[11px] text-muted-2">Leaderboard</h4>
        <div className="border-t border-line">
          {ranked.map((a, i) => {
            const me = a.name === myName;
            return (
              <div
                key={a.name}
                className={`flex items-center gap-3 border-b border-line py-2.5 text-sm ${
                  me ? "bg-surface-2" : ""
                }`}
              >
                <span className="w-4 shrink-0 tabular text-xs text-muted-2">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-white">
                  {a.name}
                  {me && <span className="ml-1.5 text-[11px] text-nonstop">You</span>}
                </span>
                <span className="shrink-0 tabular text-xs text-muted-2">
                  {fmt(a.timeMs)}
                </span>
                <span className="w-12 shrink-0 text-right tabular font-medium text-white">
                  {a.percent}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// higher percent wins; tiebreak faster time, then fewer mistakes
function better(a: QuizAttempt, b: QuizAttempt) {
  return rank(a, b) < 0;
}
function rank(a: QuizAttempt, b: QuizAttempt) {
  if (b.percent !== a.percent) return b.percent - a.percent;
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  return a.mistakes - b.mistakes;
}

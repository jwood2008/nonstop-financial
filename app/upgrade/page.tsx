"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Check, ShieldCheck, Loader2, BadgeCheck, ArrowRight } from "lucide-react";

const PRICE_LABEL = process.env.NEXT_PUBLIC_PRICE_LABEL ?? "$2,000";
const MONTHLY_LABEL = process.env.NEXT_PUBLIC_MONTHLY_LABEL ?? "$75";

const FEATURES = [
  "Full Producer Development Path",
  "Every training module & video lesson",
  "Quizzes, certification & downloadable certificate",
  "AI coaching and cold-call practice",
];

export default function UpgradePage() {
  return (
    <AppShell>
      <Upgrade />
    </AppShell>
  );
}

function Upgrade() {
  const { hasPaid, refreshPaid } = useStore();
  const [busy, setBusy] = useState<"full" | "monthly" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (s) {
      setStatus(s);
      if (s === "success") void refreshPaid();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pay = async (plan: "full" | "monthly") => {
    setError(null);
    setBusy(plan);
    try {
      if (!isSupabaseConfigured || !supabase)
        throw new Error("Payments aren't configured yet.");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in first.");
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok || !json.url)
        throw new Error(json.error || "Could not start checkout.");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      {hasPaid ? (
        <div className="rounded-3xl border border-nonstop/40 bg-[#33343a] p-8 text-center shadow-lg shadow-black/30">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nonstop/15 text-nonstop">
            <BadgeCheck className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            You&apos;re all set
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Your Producer Access is active. Everything in the platform is unlocked.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-nonstop px-6 py-3 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
          >
            Go to dashboard <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#33343a] shadow-lg shadow-black/30">
          <div className="border-b border-white/10 p-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-nonstop/40 bg-nonstop/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-nonstop">
              Producer Access
            </span>
            <div className="mt-4 flex items-end justify-center gap-1.5">
              <span className="font-display text-5xl font-bold text-white">
                {PRICE_LABEL}
              </span>
              <span className="mb-1.5 text-sm text-white/45">one-time</span>
            </div>
            <p className="mt-2 text-sm text-white/55">
              — or {MONTHLY_LABEL}/month. Same access either way.
            </p>
          </div>

          <div className="p-8">
            <ul className="space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/80">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nonstop/15 text-nonstop">
                    <Check className="h-3 w-3" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {status === "cancelled" && (
              <p className="mt-5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55">
                Checkout was cancelled — you haven&apos;t been charged.
              </p>
            )}
            {status === "success" && !hasPaid && (
              <p className="mt-5 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400">
                Payment received — unlocking your access…
              </p>
            )}
            {error && (
              <p className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => pay("full")}
                disabled={busy !== null}
                className="flex w-full flex-col items-center justify-center gap-0.5 rounded-2xl bg-nonstop px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark disabled:opacity-60"
              >
                {busy === "full" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Pay {PRICE_LABEL} once</span>
                    <span className="text-[11px] font-normal text-white/70">
                      full access, forever
                    </span>
                  </>
                )}
              </button>
              <button
                onClick={() => pay("monthly")}
                disabled={busy !== null}
                className="flex w-full flex-col items-center justify-center gap-0.5 rounded-2xl border border-nonstop/50 bg-nonstop/10 px-5 py-3.5 text-sm font-semibold text-nonstop transition hover:bg-nonstop/20 disabled:opacity-60"
              >
                {busy === "monthly" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{MONTHLY_LABEL}/month</span>
                    <span className="text-[11px] font-normal text-nonstop/80">
                      cancel anytime
                    </span>
                  </>
                )}
              </button>
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure checkout by Stripe · cards, Apple Pay & Google Pay
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, ageBracket, ageFromBirthdate, isNonstopEmail } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { AuthShell, AuthField, authInputCls } from "@/components/AuthShell";

const PRICE_LABEL = process.env.NEXT_PUBLIC_PRICE_LABEL ?? "$2,000";
const MONTHLY_LABEL = process.env.NEXT_PUBLIC_MONTHLY_LABEL ?? "$75";

export default function SignupPage() {
  const { ready, loggedIn, signUp, resendConfirmation } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [managerId, setManagerId] = useState("");
  const [plan, setPlan] = useState<"full" | "monthly">("full");
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);

  // Free access = a NonStop email OR an email on the admin-managed
  // free_emails list (agency people without a NonStop address).
  const nonstop = isNonstopEmail(email);
  const [freeListed, setFreeListed] = useState(false);
  const freeAccess = nonstop || freeListed;
  useEffect(() => {
    if (nonstop || !isSupabaseConfigured || !supabase) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setFreeListed(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      supabase!
        .rpc("is_free_email", { p_email: email })
        .then(({ data, error }) => {
          if (!cancelled) setFreeListed(!error && data === true);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [email, nonstop]);

  // Agents pick who they report to — managers see their team's analytics,
  // so this matters. The list loads once the email qualifies as free/team.
  useEffect(() => {
    if (!freeAccess || managers.length > 0 || !isSupabaseConfigured || !supabase) return;
    supabase.rpc("list_managers").then(({ data, error }) => {
      if (!error && data) setManagers(data as { id: string; name: string }[]);
    });
  }, [freeAccess, managers.length]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false); // confirmation email sent screen
  const [paid, setPaid] = useState(false); // back from Stripe, payment done
  const [choosing, setChoosing] = useState(false); // pick a plan step (paid signups)
  const [resent, setResent] = useState<string | null>(null);

  // Returning from Stripe checkout (?status=paid|cancelled)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const status = q.get("status");
    if (status === "paid") {
      setEmail(q.get("email") ?? "");
      setPaid(true);
      setSent(true);
    } else if (status === "cancelled") {
      setError("Checkout was cancelled — you haven't been charged. Pick a plan and try again whenever you're ready.");
    }
  }, []);

  useEffect(() => {
    if (ready && loggedIn) router.replace("/dashboard");
  }, [ready, loggedIn, router]);

  const ageNum = ageFromBirthdate(birthdate); // age is derived — never typed
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    // Free access (NonStop email or on the free list): normal signup,
    // confirmation email, no Stripe.
    if (freeAccess) {
      const res = await signUp({ name, email, password, birthdate, managerId });
      if (!res.ok) {
        setError(res.error);
        setBusy(false);
        return;
      }
      if (res.needsConfirmation) {
        setSent(true); // show "check your email"
        setBusy(false);
        return;
      }
      router.push("/dashboard"); // confirmation disabled → straight in
      return;
    }

    // Everyone else pays. Validate the form first, then show the
    // pick-your-plan step — Stripe opens from there.
    if (!name.trim()) {
      setError("Enter your name.");
      setBusy(false);
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      setBusy(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setBusy(false);
      return;
    }
    if (!birthdate || ageNum < 13 || ageNum > 120) {
      setError("Enter a valid birthday (you must be at least 13).");
      setBusy(false);
      return;
    }
    setBusy(false);
    setChoosing(true);
  };

  // Plan chosen → create the account quietly and hand off to Stripe.
  // The confirmation email goes out only after payment succeeds.
  const payWith = async (chosen: "full" | "monthly") => {
    setError(null);
    setPlan(chosen);
    setBusy(true);
    try {
      const res = await fetch("/api/signup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, birthdate, age: ageNum, plan: chosen }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Could not start checkout.");
      window.location.href = json.url; // off to Stripe
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  const resend = async () => {
    setResent(null);
    setError(null);
    const res = await resendConfirmation(email);
    if (res.ok) setResent("Confirmation email sent again.");
    else setError(res.error);
  };

  if (sent) {
    return (
      <AuthShell
        title={paid ? "Payment received" : "Confirm your email"}
        subtitle={paid ? "Welcome to NonStop Financial." : "One last step before you're in."}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nonstop/15 text-nonstop">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted">
            {paid && (
              <>
                <span className="font-semibold text-white">You&apos;re in — payment confirmed.</span>{" "}
              </>
            )}
            We sent a confirmation link to{" "}
            <span className="font-semibold text-white">{email}</span>. Click it to
            activate your account, then come back and log in.
          </p>

          {resent && <p className="mt-4 text-xs text-green-400">{resent}</p>}
          {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

          <Link
            href="/login"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-nonstop px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
          >
            Go to log in
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={resend}
            className="mt-3 text-xs text-muted-2 transition hover:text-white"
          >
            Didn&apos;t get it? Resend email
          </button>
        </div>
      </AuthShell>
    );
  }

  // Pick-your-plan step — shown after "Create account" for non-NonStop
  // emails. Choosing a plan creates the account and opens Stripe.
  if (choosing) {
    return (
      <AuthShell
        title="Choose how you pay"
        subtitle={`One account, two ways in — pick what works for you.`}
      >
        <div className="space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => payWith("full")}
            className="flex w-full items-center justify-between rounded-xl bg-nonstop px-5 py-4 text-left text-white transition hover:bg-nonstop-dark disabled:opacity-60"
          >
            <span>
              <span className="block text-base font-bold">{PRICE_LABEL} once</span>
              <span className="text-xs text-white/75">Full access, forever. No renewals.</span>
            </span>
            {busy && plan === "full" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => payWith("monthly")}
            className="flex w-full items-center justify-between rounded-xl bg-[#33343a] px-5 py-4 text-left text-white ring-1 ring-white/15 transition hover:bg-[#3c3d44] disabled:opacity-60"
          >
            <span>
              <span className="block text-base font-bold">{MONTHLY_LABEL}/month</span>
              <span className="text-xs text-white/60">Same access. Cancel anytime.</span>
            </span>
            {busy && plan === "monthly" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </button>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <p className="text-center text-[11px] text-muted-2">
            Secure checkout by Stripe. You&apos;ll confirm your email right after paying.
          </p>
          <button
            type="button"
            onClick={() => {
              setChoosing(false);
              setError(null);
            }}
            className="mx-auto block text-xs text-muted-2 transition hover:text-white"
          >
            ← Back to the form
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building toward your producer certification."
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthField label="Full name">
          <input
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Maska"
            className={authInputCls}
          />
        </AuthField>
        <AuthField label="Email">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@agency.com"
            className={authInputCls}
          />
        </AuthField>
        <div className="grid grid-cols-[1fr_88px] gap-3">
          <AuthField label="Password">
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className={authInputCls}
            />
          </AuthField>
          <AuthField label="Birthday">
            <input
              type="date"
              value={birthdate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthdate(e.target.value)}
              className={authInputCls}
            />
          </AuthField>
        </div>
        {birthdate && ageNum >= 13 && ageNum <= 120 && (
          <p className="-mt-1 text-[11px] text-muted-2">
            You&apos;re {ageNum} — counted in the{" "}
            <span className="font-semibold text-muted">{ageBracket(ageNum)}</span>{" "}
            audience bracket.
          </p>
        )}

        {/* Team members report to a manager (drives team analytics) */}
        {freeAccess && (
          <AuthField label="Who is your manager?">
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className={authInputCls}
            >
              <option value="">
                {managers.length ? "Select your manager…" : "No managers listed yet"}
              </option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </AuthField>
        )}

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-nonstop px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {freeAccess ? "Create account — free for NonStop" : "Create account"}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-nonstop hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

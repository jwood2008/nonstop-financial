"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, ageBracket, ageFromBirthdate, isNonstopEmail } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { AuthShell, AuthField, authInputCls } from "@/components/AuthShell";

export default function SignupPage() {
  const { ready, loggedIn, signUp, resendConfirmation } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);

  // NonStop agents pick who they report to — managers see their team's
  // analytics, so this matters. The list loads once the email looks NonStop.
  const nonstop = isNonstopEmail(email);
  useEffect(() => {
    if (!nonstop || managers.length > 0 || !isSupabaseConfigured || !supabase) return;
    supabase.rpc("list_managers").then(({ data, error }) => {
      if (!error && data) setManagers(data as { id: string; name: string }[]);
    });
  }, [nonstop, managers.length]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false); // confirmation email sent screen
  const [resent, setResent] = useState<string | null>(null);

  useEffect(() => {
    if (ready && loggedIn) router.replace("/dashboard");
  }, [ready, loggedIn, router]);

  const ageNum = ageFromBirthdate(birthdate); // age is derived — never typed
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
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
        title="Confirm your email"
        subtitle="One last step before you're in."
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nonstop/15 text-nonstop">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted">
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

        {/* NonStop agents report to a manager (drives team analytics) */}
        {nonstop && (
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
              Create account
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

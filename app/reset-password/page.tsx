"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { AuthShell, AuthField, authInputCls } from "@/components/AuthShell";

export default function ResetPasswordPage() {
  const { updatePassword } = useStore();
  const [phase, setPhase] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // The reset email link drops us here with a recovery token in the URL.
  // supabase-js auto-detects it and fires PASSWORD_RECOVERY / establishes a session.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setPhase("invalid");
      return;
    }
    let settled = false;
    const mark = () => {
      settled = true;
      setPhase("ready");
    };
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) mark();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) mark();
    });
    const t = setTimeout(() => {
      if (!settled) setPhase("invalid");
    }, 3000);
    return () => {
      sub.data.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    const res = await updatePassword(password);
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  };

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You're all set.">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-nonstop/15 text-nonstop">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted">Your password has been changed.</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nonstop px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthShell title="Link expired" subtitle="This reset link is invalid or has expired.">
        <p className="text-center text-sm text-muted">
          Request a fresh link from the login page.
        </p>
        <Link
          href="/login"
          className="mt-6 block rounded-lg bg-nonstop px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-nonstop-dark"
        >
          Back to log in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your account.">
      <form onSubmit={submit} className="space-y-4">
        <AuthField label="New password">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={authInputCls}
          />
        </AuthField>
        <AuthField label="Confirm new password">
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            className={authInputCls}
          />
        </AuthField>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || phase !== "ready"}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-nonstop px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark disabled:opacity-60"
        >
          {busy || phase === "checking" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Update password"
          )}
        </button>
      </form>
    </AuthShell>
  );
}

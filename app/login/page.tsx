"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { ArrowRight, Loader2 } from "lucide-react";
import { AuthShell, AuthField, authInputCls } from "@/components/AuthShell";

export default function LoginPage() {
  const { ready, loggedIn, signIn, login } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && loggedIn) router.replace("/dashboard");
  }, [ready, loggedIn, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await signIn(email, password);
    if (res.ok) router.push("/dashboard");
    else {
      setError(res.error);
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue your producer development."
    >
      <form onSubmit={submit} className="space-y-4">
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
        <AuthField label="Password">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
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
          disabled={busy}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-nonstop px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Log in
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to NonStop Financial?{" "}
        <Link href="/signup" className="font-semibold text-nonstop hover:underline">
          Create an account
        </Link>
      </p>
      <button
        onClick={() => {
          login();
          router.push("/dashboard");
        }}
        className="mt-3 block w-full text-center text-xs text-muted-2 transition hover:text-white"
      >
        Just exploring? Enter the preview →
      </button>
    </AuthShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

/**
 * Landing route for Supabase email links (signup confirmation). The client
 * parses the token from the URL (detectSessionInUrl), so we just wait for the
 * session to materialize and route to the dashboard — or show a clear failure
 * instead of dumping the user on the marketing page.
 */
export default function AuthCallback() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      router.replace("/login");
      return;
    }
    // A recovery link belongs on the reset form, never the dashboard.
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      router.replace("/reset-password");
      return;
    }

    let done = false;
    const go = (path: string) => {
      if (!done) {
        done = true;
        router.replace(path);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) go("/dashboard");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) go("/dashboard");
    });
    const timeout = setTimeout(() => {
      if (!done) setFailed(true);
    }, 5000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <AuthShell
      title={failed ? "Couldn't confirm" : "Confirming your email…"}
      subtitle={
        failed
          ? "This link may have expired or already been used."
          : "One moment — verifying your account."
      }
    >
      {failed ? (
        <button
          onClick={() => router.replace("/login")}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-nonstop px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-nonstop-dark"
        >
          Go to log in
        </button>
      ) : (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-nonstop" />
        </div>
      )}
    </AuthShell>
  );
}

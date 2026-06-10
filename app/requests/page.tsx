"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Shield, Check, X, Inbox } from "lucide-react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role?: string;
  requested_role?: string | null;
};

export default function RequestsPage() {
  return (
    <AppShell>
      <Requests />
    </AppShell>
  );
}

function Requests() {
  const { canBeAdmin } = useStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!supabase) return null;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return null;
      return fetch(url, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      });
    },
    []
  );

  const load = useCallback(async () => {
    const res = await authedFetch("/api/admin/users");
    if (res?.ok) {
      const json = await res.json().catch(() => ({}));
      setUsers((json.users as UserRow[]) ?? []);
    }
    setLoaded(true);
  }, [authedFetch]);

  useEffect(() => {
    if (canBeAdmin) load();
  }, [canBeAdmin, load]);

  // approve = set their role to what they asked for; deny = keep current (both
  // clear the pending request via the set-role route)
  const decide = async (u: UserRow, role: string) => {
    setBusy(u.id);
    await authedFetch("/api/admin/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, role }),
    });
    await load();
    setBusy(null);
  };

  if (!canBeAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
        <Shield className="h-10 w-10 text-zinc-300" />
        <h1 className="font-display text-2xl font-bold text-white">Admins only</h1>
        <p className="text-sm text-muted">
          Only team admins can review position requests.
        </p>
      </div>
    );
  }

  const pending = users.filter(
    (u) => u.requested_role && u.requested_role !== (u.role || "Lead")
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
      <header className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-widest text-white/40">
          Admin
        </p>
        <h1 className="mt-1.5 font-display text-3xl font-bold text-white">
          Requests
        </h1>
        <p className="mt-1 text-sm text-muted">
          People asking to change their position — approve to promote them, or
          deny to dismiss the request.
        </p>
      </header>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-line-2 py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-2" />
          <p className="text-sm text-muted">
            {loaded ? "No pending requests." : "Loading…"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {pending.map((u) => {
            const name = u.name?.trim() || u.email;
            const initial = (u.name?.trim() || u.email || "?")
              .charAt(0)
              .toUpperCase();
            return (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-3 border border-line bg-surface-2 px-4 py-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-3 font-display text-sm font-bold text-muted">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{name}</p>
                  <p className="truncate text-xs text-muted-2">{u.email}</p>
                </div>
                <span className="text-xs text-muted">
                  <span className="text-muted-2">{u.role || "Lead"}</span>
                  {" → "}
                  <span className="font-semibold text-nonstop">
                    {u.requested_role}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decide(u, u.requested_role!)}
                    disabled={busy === u.id}
                    className="inline-flex items-center gap-1.5 bg-nonstop px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-nonstop-dark disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => decide(u, u.role || "Lead")}
                    disabled={busy === u.id}
                    className="inline-flex items-center gap-1.5 border border-line-2 px-3 py-1.5 text-xs font-medium text-muted transition hover:text-white disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Deny
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

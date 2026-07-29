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
  is_admin?: boolean;
};

export default function RequestsPage() {
  return (
    <AppShell>
      <Requests />
    </AppShell>
  );
}

function Requests() {
  const { canBeAdmin, isOwner } = useStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const clearRequest = (u: UserRow) =>
    authedFetch("/api/admin/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // setting their current position is a no-op that also clears the request
      body: JSON.stringify({ userId: u.id, role: u.role || "Lead" }),
    });

  const approve = async (u: UserRow) => {
    setBusy(u.id);
    setError(null);
    if (u.requested_role === "Admin") {
      // Granting Admin is owner-only — give instant feedback instead of a
      // doomed round-trip (the API also enforces this server-side).
      if (!isOwner) {
        setError("Only the owner can grant Admin access — ask the owner to approve this one.");
        setBusy(null);
        return;
      }
      // add-admin still returns 403 for non-owners; check the response so we
      // don't silently clear the request on failure.
      const res = await authedFetch("/api/admin/add-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email }),
      });
      if (!res?.ok) {
        const j = res ? await res.json().catch(() => ({})) : {};
        setError(
          (j as { error?: string }).error ||
            "Only the owner can grant Admin access — ask the owner to approve this one."
        );
        setBusy(null);
        return;
      }
      // grant team-admin access (keeps their position — e.g. Agent + Admin)
      await clearRequest(u);
    } else {
      // promote their position (Manager) — set-role also clears the request
      // and emails them that they were approved
      const res = await authedFetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, role: u.requested_role }),
      });
      const j = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok && (j as { emailed?: boolean }).emailed === false) {
        // the promotion went through — say so, but don't let a silent email
        // failure leave the admin thinking they've been told
        setError(
          `${u.name || u.email} is now ${u.requested_role}, but the approval email didn't send. Let them know directly.`
        );
      }
    }
    await load();
    setBusy(null);
  };

  const deny = async (u: UserRow) => {
    setBusy(u.id);
    await clearRequest(u);
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

  const pending = users.filter((u) => {
    if (!u.requested_role) return false;
    if (u.requested_role === "Admin") return !u.is_admin; // already admin? no req
    return u.requested_role !== (u.role || "Lead");
  });

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

      {error && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

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
                  {u.requested_role === "Admin" ? (
                    <span className="font-semibold text-nonstop">
                      wants Admin access
                    </span>
                  ) : (
                    <>
                      <span className="text-muted-2">{u.role || "Lead"}</span>
                      {" → "}
                      <span className="font-semibold text-nonstop">
                        {u.requested_role}
                      </span>
                    </>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approve(u)}
                    disabled={busy === u.id}
                    className="inline-flex items-center gap-1.5 bg-nonstop px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-nonstop-dark disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => deny(u)}
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

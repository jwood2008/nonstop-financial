"use client";

import { useStore } from "@/lib/store";
import { Shield, User, Lock } from "lucide-react";

/**
 * Floating Admin ⇄ User switch. Always available in-app so you can flip
 * perspective instantly. Admin is only selectable for accounts listed in
 * lib/admins.ts (here, the demo account qualifies).
 */
export function RoleSwitcher() {
  const { role, setRole, canBeAdmin, loggedIn } = useStore();
  if (!loggedIn) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="flex items-center gap-1 border border-line-2 bg-surface-2 p-1 shadow-xl">
        <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-2">
          View
        </span>
        <button
          onClick={() => setRole("user")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${
            role === "user"
              ? "bg-white text-ink"
              : "text-muted hover:text-white"
          }`}
        >
          <User className="h-3.5 w-3.5" /> User
        </button>
        <button
          onClick={() => canBeAdmin && setRole("admin")}
          disabled={!canBeAdmin}
          title={canBeAdmin ? "" : "Your account isn't an admin (see lib/admins.ts)"}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            role === "admin"
              ? "bg-nonstop text-white"
              : "text-muted hover:text-white"
          }`}
        >
          {canBeAdmin ? <Shield className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          Admin
        </button>
      </div>
    </div>
  );
}

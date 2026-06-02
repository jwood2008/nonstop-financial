"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "./Brand";
import NavHeader from "@/components/ui/nav-header";
import { LogOut, Menu, X, Settings } from "lucide-react";

/**
 * Application shell — a top navigation menu (no sidebar). Logo + primary nav on
 * the left, role switch + account on the right. Mobile collapses the nav into a
 * dropdown.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, logout, role, setRole, canBeAdmin, email, profile } =
    useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (ready && !loggedIn) router.replace("/");
  }, [ready, loggedIn, router]);
  useEffect(() => setMenu(false), [pathname]);

  if (!ready || !loggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-2">
        Loading…
      </div>
    );
  }

  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/learn", label: "Training" },
    { href: "/practice", label: "Practice" },
    ...(role === "admin" ? [{ href: "/admin", label: "Analytics" }] : []),
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const RoleSwitch = (
    <div className="flex items-center border border-line p-0.5">
      <button
        onClick={() => setRole("user")}
        className={`px-2.5 py-1 text-xs font-medium transition ${
          role === "user" ? "bg-surface-3 text-white" : "text-muted-2 hover:text-white"
        }`}
      >
        Agent
      </button>
      <button
        onClick={() => canBeAdmin && setRole("admin")}
        disabled={!canBeAdmin}
        title={canBeAdmin ? "" : "Not an admin (see lib/admins.ts)"}
        className={`px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          role === "admin" ? "bg-nonstop text-white" : "text-muted-2 hover:text-white"
        }`}
      >
        Admin
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/95">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 lg:px-6">
          <Logo />

          {/* primary nav — sliding-cursor pill (components/ui/nav-header) */}
          <div className="mx-auto hidden md:block">
            <NavHeader items={nav} />
          </div>

          {/* right cluster */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block">{RoleSwitch}</div>
            <Link
              href="/settings"
              className="hidden items-center gap-2 lg:flex"
              title="Account settings"
            >
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-white/15"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-zinc-300">
                  {(profile.name || email || "?")[0].toUpperCase()}
                </div>
              )}
              <span className="max-w-[160px] truncate text-xs text-muted transition hover:text-white">
                {profile.name || email}
              </span>
            </Link>
            <Link
              href="/settings"
              className={`hidden p-1.5 transition hover:text-white md:inline-flex ${
                pathname.startsWith("/settings") ? "text-white" : "text-muted-2"
              }`}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button
              onClick={() => {
                logout();
                router.replace("/");
              }}
              className="hidden p-1.5 text-muted-2 transition hover:text-white md:inline-flex"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMenu((m) => !m)}
              className="p-1.5 text-muted-2 transition hover:text-white md:hidden"
              aria-label="Menu"
            >
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* mobile dropdown */}
        {menu && (
          <div className="border-t border-line bg-ink px-4 py-3 md:hidden">
            <nav className="flex flex-col">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center border-l-2 py-2.5 pl-3 text-sm transition ${
                    isActive(n.href)
                      ? "border-nonstop font-medium text-white"
                      : "border-transparent text-muted hover:text-white"
                  }`}
                >
                  {n.label}
                </Link>
              ))}
              <Link
                href="/settings"
                className={`flex items-center border-l-2 py-2.5 pl-3 text-sm transition ${
                  pathname.startsWith("/settings")
                    ? "border-nonstop font-medium text-white"
                    : "border-transparent text-muted hover:text-white"
                }`}
              >
                Settings
              </Link>
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              {RoleSwitch}
              <button
                onClick={() => {
                  logout();
                  router.replace("/");
                }}
                className="flex items-center gap-1.5 text-xs text-muted-2 hover:text-white"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>
    </div>
  );
}

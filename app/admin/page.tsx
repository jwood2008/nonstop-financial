"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ExpandablePanel } from "@/components/ui/expandable-card";
import { useStore, allLessons } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  Sparkline,
  BarChart,
  AreaLine,
  Donut,
  Heatmap,
  Funnel,
} from "@/components/charts";
import {
  KPIS,
  ENGAGEMENT_14D,
  RETENTION_CURVE,
  FUNNEL,
  TOP_CONTENT,
  LEADERBOARD,
  ACTIVE_HEATMAP,
  AUDIENCE_BY_AGE,
} from "@/lib/data";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  FileDown,
  Share2,
  Search,
} from "lucide-react";
import { exportReportPdf, exportReportImage, type ReportData } from "@/lib/report";
import { POSITION_ROLES } from "@/lib/roles";

export default function AdminPage() {
  return (
    <AppShell>
      <Analytics />
    </AppShell>
  );
}

/* ── date range ── */
type Range = { from: string; to: string; label: string };

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
// Events are stored in UTC, so the range bounds must be UTC dates too —
// otherwise late-day activity (which rolls into the next UTC day for users
// behind UTC) falls just past "today" and shows as 0.
function isoUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
const PRESETS: { id: string; label: string; make: () => Range }[] = [
  { id: "7d", label: "7d", make: () => ({ from: isoUTC(daysAgo(6)), to: isoUTC(new Date()), label: "Last 7 days" }) },
  { id: "30d", label: "30d", make: () => ({ from: isoUTC(daysAgo(29)), to: isoUTC(new Date()), label: "Last 30 days" }) },
  { id: "90d", label: "90d", make: () => ({ from: isoUTC(daysAgo(89)), to: isoUTC(new Date()), label: "Last 90 days" }) },
  { id: "all", label: "All", make: () => ({ from: "1970-01-01", to: isoUTC(new Date()), label: "All time" }) },
];
function previousOf(r: Range): { from: string; to: string } {
  const from = new Date(`${r.from}T00:00:00`);
  const to = new Date(`${r.to}T00:00:00`);
  const len = Math.round((+to - +from) / 86400000) + 1;
  const pTo = new Date(from);
  pTo.setDate(pTo.getDate() - 1);
  const pFrom = new Date(pTo);
  pFrom.setDate(pFrom.getDate() - (len - 1));
  return { from: iso(pFrom), to: iso(pTo) };
}

type TopRow = {
  /** Unique lesson id from analytics — used as the row key. */
  ref?: string;
  title: string;
  views: number;
  completion: number;
  avgWatch?: string;
  trend?: number;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role?: string;
  requested_role?: string | null;
  is_admin?: boolean;
};
type KpiRow = {
  key: string;
  label: string;
  value: number;
  suffix: string;
  delta: number;
  series: number[];
};
const DOW_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

function Analytics() {
  const { canBeAdmin, canManage, course } = useStore();
  const lessons = useMemo(() => allLessons(course), [course]);
  const totalLessons = lessons.length;

  const [presetId, setPresetId] = useState("30d");
  const [range, setRange] = useState<Range>(PRESETS[1].make());

  // Admin-only data scope: everyone / one manager's team / one NonStop agent.
  // Managers don't get a picker — the database locks them to their own team.
  const [scope, setScope] = useState("all"); // "all" | "team:<id>" | "user:<id>"
  const scopeParams = useMemo(
    () =>
      scope.startsWith("team:")
        ? { p_manager: scope.slice(5) }
        : scope.startsWith("user:")
          ? { p_user: scope.slice(5) }
          : {},
    [scope]
  );

  // With Supabase connected we show ONLY real data (empty until activity
  // exists). Sample data is used solely in the no-backend preview.
  const SAMPLE = !isSupabaseConfigured;
  const [kpis, setKpis] = useState<typeof KPIS>(SAMPLE ? KPIS : []);
  const [engagement, setEngagement] = useState<typeof ENGAGEMENT_14D>(
    SAMPLE ? ENGAGEMENT_14D : []
  );
  const [heat, setHeat] = useState<number[][]>(
    SAMPLE ? ACTIVE_HEATMAP : Array.from({ length: 7 }, () => Array(12).fill(0))
  );
  const [audience, setAudience] = useState<{ label: string; value: number }[]>(
    SAMPLE ? AUDIENCE_BY_AGE : []
  );
  const [topContent, setTopContent] = useState<TopRow[]>(SAMPLE ? TOP_CONTENT : []);
  const [leaders, setLeaders] = useState<typeof LEADERBOARD>(SAMPLE ? LEADERBOARD : []);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [movement, setMovement] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    const p = { p_from: range.from, p_to: range.to, ...scopeParams };
    const prev = previousOf(range);

    (async () => {
      const [k, eng, hrs, age, top, lb, lbPrev] = await Promise.all([
        supabase!.rpc("analytics_kpis", p),
        supabase!.rpc("events_engagement", p),
        supabase!.rpc("events_active_hours", p),
        supabase!.rpc("age_distribution", p),
        supabase!.rpc("top_content", p),
        supabase!.rpc("leaderboard", p),
        supabase!.rpc("leaderboard", { p_from: prev.from, p_to: prev.to, ...scopeParams }),
      ]);
      if (cancelled) return;

      if (!k.error && k.data) {
        setKpis(
          (k.data as KpiRow[]).map((r) => ({
            label: r.label,
            value: r.suffix === "%" ? `${r.value}%` : Number(r.value).toLocaleString(),
            delta: Number(r.delta),
            series: (r.series ?? []).map(Number),
          }))
        );
      }

      if (!eng.error && eng.data) {
        const rows = eng.data as { d: string; active: number; lessons: number }[];
        setEngagement(
          rows.map((r) => ({
            day: DOW_LETTER[new Date(`${r.d}T00:00:00`).getDay()],
            active: r.active,
            lessons: r.lessons,
          }))
        );
      }

      if (!hrs.error && hrs.data) {
        const rows = hrs.data as { dow: number; bucket: number; n: number }[];
        const counts = Array.from({ length: 7 }, () => Array(12).fill(0));
        let max = 0;
        for (const r of rows) {
          const row = (r.dow + 6) % 7;
          counts[row][r.bucket] += r.n;
          max = Math.max(max, counts[row][r.bucket]);
        }
        setHeat(
          counts.map((row) =>
            row.map((n) => (n === 0 || max === 0 ? 0 : Math.max(1, Math.round((n / max) * 4))))
          )
        );
      }

      if (!age.error && age.data) {
        setAudience(age.data as { label: string; value: number }[]);
      }

      if (!top.error && top.data) {
        const rows = top.data as { ref: string; views: number; completes: number }[];
        setTopContent(
          rows.map((r) => ({
            ref: r.ref,
            title: lessons.find((l) => l.id === r.ref)?.title ?? "Untitled lesson",
            views: r.views,
            completion:
              r.views > 0
                ? Math.min(100, Math.round((r.completes / r.views) * 100))
                : 0,
          }))
        );
      }

      if (!lb.error && lb.data) {
        const rows = lb.data as {
          name: string;
          completed: number;
          passes: number;
          active_days: number;
        }[];
        setLeaders(
          rows.map((r) => ({
            name: r.name,
            streak: r.active_days,
            certs: r.passes,
            completion:
              totalLessons > 0
                ? Math.min(100, Math.round((r.completed / totalLessons) * 100))
                : 0,
          }))
        );
        const prevRank = new Map<string, number>();
        (lbPrev.data as { name: string }[] | null)?.forEach((r, i) =>
          prevRank.set(r.name, i)
        );
        const move: Record<string, number | null> = {};
        rows.forEach((r, i) => {
          move[r.name] = prevRank.has(r.name) ? prevRank.get(r.name)! - i : null;
        });
        setMovement(move);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range, lessons, totalLessons, scopeParams]);

  // load the full user list (name + email) — admin-only server route
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase!.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json().catch(() => ({}));
      if (!cancelled) setUsers((json.users as UserRow[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // admin sets a user's position (and clears their pending request)
  const setUserRole = async (userId: string, role: string) => {
    if (!supabase) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/set-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role, requested_role: null } : u
      )
    );
  };

  if (!canManage) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
        <Shield className="h-10 w-10 text-zinc-300" />
        <h1 className="font-display text-2xl font-bold text-white">
          Admins & managers only
        </h1>
        <p className="text-sm text-muted">
          Analytics is available to admins and managers. Ask an admin to grant
          you access.
        </p>
      </div>
    );
  }

  const choosePreset = (id: string) => {
    setPresetId(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p) setRange(p.make());
  };
  const setCustom = (patch: Partial<Range>) => {
    setPresetId("custom");
    setRange((r) => ({ ...r, ...patch, label: "Custom range" }));
  };

  const reportData = (): ReportData => ({
    rangeLabel: range.label,
    generatedOn: new Date().toLocaleDateString(),
    kpis: kpis.slice(0, 4).map((k) => ({
      label: k.label,
      value: String(k.value),
      delta: k.delta,
    })),
    leaders: leaders.slice(0, 8).map((l) => ({
      name: l.name,
      completion: l.completion,
      streak: l.streak,
      certs: l.certs,
    })),
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      <PageHeader
        label={isSupabaseConfigured ? "Live data" : "Sample data"}
        title="Analytics"
        meta={`${range.label} · vs previous period · NonStop Financial`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canBeAdmin ? (
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                title="Whose data to show"
                className="max-w-[15rem] rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-nonstop"
              >
                <option value="all" className="bg-[#15161a]">
                  Everyone
                </option>
                {users.some((u) => u.role === "Manager") && (
                  <optgroup label="Manager teams" className="bg-[#15161a]">
                    {users
                      .filter((u) => u.role === "Manager")
                      .map((m) => (
                        <option key={m.id} value={`team:${m.id}`} className="bg-[#15161a]">
                          Team · {m.name?.trim() || m.email}
                        </option>
                      ))}
                  </optgroup>
                )}
                {users.some((u) => (u.email ?? "").toLowerCase().endsWith("@nonstopglobal.co")) && (
                  <optgroup label="NonStop agents" className="bg-[#15161a]">
                    {users
                      .filter((u) => (u.email ?? "").toLowerCase().endsWith("@nonstopglobal.co"))
                      .map((u) => (
                        <option key={u.id} value={`user:${u.id}`} className="bg-[#15161a]">
                          {u.name?.trim() || u.email}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/55">
                Scope: your team
              </span>
            )}
            <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-1 text-xs">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => choosePreset(p.id)}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    presetId === p.id
                      ? "bg-nonstop text-white"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/55">
              <input
                type="date"
                value={range.from === "1970-01-01" ? "" : range.from}
                max={range.to}
                onChange={(e) => setCustom({ from: e.target.value })}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-white outline-none focus:border-nonstop"
              />
              <span>→</span>
              <input
                type="date"
                value={range.to}
                min={range.from === "1970-01-01" ? undefined : range.from}
                onChange={(e) => setCustom({ to: e.target.value })}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-white outline-none focus:border-nonstop"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportReportPdf(reportData())}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:text-white"
                title="Download a PDF report for this range"
              >
                <FileDown className="h-3.5 w-3.5" /> PDF
              </button>
              <button
                onClick={() => exportReportImage(reportData())}
                className="inline-flex items-center gap-1.5 rounded-lg bg-nonstop px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-nonstop-dark"
                title="Shareable image for social posts"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>
          </div>
        }
      />

      {/* top content */}
      <div className="mt-6">
        <ExpandablePanel
          label="Top Content"
          title="Top Content"
          tone="light"
          preview={<TopContentTable rows={topContent} limit={4} />}
        >
          <TopContentTable rows={topContent} />
        </ExpandablePanel>
      </div>

      {/* KPI tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {kpis.map((k) => (
          <ExpandablePanel
            key={k.label}
            label={k.label}
            title={k.label}
            tone="light"
            preview={<KpiWidget kpi={k} />}
          >
            <KpiWidget kpi={k} expanded />
          </ExpandablePanel>
        ))}
      </div>

      {/* engagement + retention */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpandablePanel
            label="Engagement"
            title="Engagement"
            tone="light"
            preview={<EngagementWidget data={engagement} />}
          >
            <EngagementWidget data={engagement} />
          </ExpandablePanel>
        </div>
        <ExpandablePanel
          label="Audience Retention"
          title="Audience Retention"
          tone="light"
          preview={<RetentionWidget />}
        >
          <RetentionWidget />
        </ExpandablePanel>
      </div>

      {/* funnel + audience + heatmap */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ExpandablePanel
          label="Producer Funnel"
          title="Producer Funnel"
          tone="light"
          preview={<FunnelWidget />}
        >
          <FunnelWidget />
        </ExpandablePanel>
        <ExpandablePanel
          label="Audience by Age"
          title="Audience by Age"
          tone="light"
          preview={<AudienceWidget data={audience} />}
        >
          <AudienceWidget data={audience} />
        </ExpandablePanel>
        <ExpandablePanel
          label="Most Active Hours"
          title="Most Active Hours"
          tone="light"
          preview={<HeatmapWidget grid={heat} />}
        >
          <HeatmapWidget grid={heat} />
        </ExpandablePanel>
      </div>

      {/* leaderboard */}
      <div className="mt-6">
        <ExpandablePanel
          label="Team Leaderboard"
          title="Team Leaderboard"
          tone="light"
          preview={<LeaderboardList rows={leaders} movement={movement} limit={5} />}
        >
          <LeaderboardList rows={leaders} movement={movement} />
        </ExpandablePanel>
      </div>

      {/* users — admins manage positions here; managers don't see this */}
      {canBeAdmin && (
        <div className="mt-6">
          <ExpandablePanel
            label="Users"
            title={`Users · ${users.length}`}
            tone="light"
            preview={<UsersList rows={users} limit={6} />}
          >
            <UsersList rows={users} onSetRole={setUserRole} />
          </ExpandablePanel>
        </div>
      )}
    </div>
  );
}

/* ── all signed-up users (name + email + position) ── */
function UsersList({
  rows,
  limit,
  onSetRole,
}: {
  rows: UserRow[];
  limit?: number;
  onSetRole?: (userId: string, role: string) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "admins" | a position
  // the full (expanded) list gets the search + filter toolbar; preview doesn't
  const searchable = !limit;
  const query = q.trim().toLowerCase();
  const filtered = searchable
    ? rows.filter((u) => {
        if (filter === "admins" && !u.is_admin) return false;
        if (filter !== "all" && filter !== "admins" && (u.role || "Lead") !== filter)
          return false;
        if (query && !`${u.name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(query))
          return false;
        return true;
      })
    : rows;
  const data = limit ? filtered.slice(0, limit) : filtered;

  const toolbar = searchable ? (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users by name or email…"
          className="w-full rounded-lg border border-white/15 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-nonstop"
        />
      </div>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-nonstop"
        title="Filter by position"
      >
        <option value="all" className="bg-[#15161a]">All positions</option>
        <option value="admins" className="bg-[#15161a]">Admins</option>
        {POSITION_ROLES.map((r) => (
          <option key={r} value={r} className="bg-[#15161a]">
            {r}
          </option>
        ))}
      </select>
    </div>
  ) : null;
  const search = toolbar;

  if (data.length === 0)
    return (
      <div>
        {search}
        <EmptyState
          label={query ? "No users match your search." : "No users have signed up yet."}
        />
      </div>
    );
  return (
    <div>
      {search}
      <ul className="space-y-2">
      {data.map((u) => {
        const name = u.name?.trim() || "—";
        const initial = (u.name?.trim() || u.email || "?").charAt(0).toUpperCase();
        // one role per person: admins are just "Admin" (no pipeline position)
        const role = u.is_admin ? "Admin" : u.role || "Lead";
        const pending = !u.is_admin && u.requested_role && u.requested_role !== role
          ? u.requested_role
          : null;
        return (
          <li
            key={u.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 font-display text-sm font-bold text-white/60">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-medium text-white">
                <span className="truncate">{name}</span>
                {u.is_admin && (
                  <span className="shrink-0 rounded bg-nonstop/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-nonstop">
                    Admin
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-white/55">{u.email}</p>
            </div>

            {pending && (
              <span className="text-xs text-amber-300">wants {pending}</span>
            )}

            {onSetRole && !u.is_admin ? (
              <div className="flex items-center gap-2">
                {pending && (
                  <button
                    onClick={() => onSetRole(u.id, pending)}
                    className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
                  >
                    Approve
                  </button>
                )}
                <select
                  value={role}
                  onChange={(e) => onSetRole(u.id, e.target.value)}
                  className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none focus:border-nonstop"
                  title="Set position"
                >
                  {POSITION_ROLES.map((r) => (
                    <option key={r} value={r} className="bg-[#15161a] text-white">
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-white/70">
                {role}
              </span>
            )}
          </li>
        );
      })}
      {limit && rows.length > limit && (
        <li className="px-1 pt-1 text-xs text-white/40">
          + {rows.length - limit} more — expand to see all
        </li>
      )}
      </ul>
    </div>
  );
}

/* ── widget bodies ── */

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center px-4 text-center text-xs text-white/35">
      {label}
    </div>
  );
}

function KpiWidget({
  kpi,
  expanded = false,
}: {
  kpi: (typeof KPIS)[number];
  expanded?: boolean;
}) {
  const up = kpi.delta >= 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <span
          className={`font-display font-medium tabular-nums text-white ${
            expanded ? "text-5xl" : "text-2xl"
          }`}
        >
          {kpi.value}
        </span>
        <span
          className={`flex items-center gap-0.5 font-semibold ${
            expanded ? "text-sm" : "text-xs"
          } ${up ? "text-green-400" : "text-red-400"}`}
        >
          {up ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {Math.abs(kpi.delta)}%
        </span>
      </div>

      {expanded && <p className="mt-1 text-xs text-white/45">vs previous period</p>}

      <div className={`${expanded ? "mt-6 [&>svg]:h-40" : "mt-3"}`}>
        <Sparkline data={kpi.series} color="#9ca3af" />
      </div>

      {expanded && kpi.series.length <= 10 && (
        <div className="mt-6 grid grid-cols-7 gap-1.5 text-center">
          {kpi.series.map((v, i) => {
            const last = i === kpi.series.length - 1;
            return (
              <div
                key={i}
                className={`rounded-lg border px-1 py-2 ${
                  last
                    ? "border-nonstop/40 bg-nonstop/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="text-[9px] uppercase tracking-wide text-white/35">
                  {last ? "Now" : `−${kpi.series.length - 1 - i}`}
                </div>
                <div className="mt-0.5 text-xs font-semibold tabular-nums text-white">
                  {v.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EngagementWidget({ data }: { data: typeof ENGAGEMENT_14D }) {
  const empty = data.length === 0 || data.every((d) => d.active + d.lessons === 0);
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs text-white/45">Active agents vs lessons completed</p>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-white/55">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: "var(--chart-line-primary)" }}
            />{" "}
            Active agents
          </span>
          <span className="flex items-center gap-1.5 text-white/55">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: "var(--color-line-2)" }}
            />{" "}
            Lessons done
          </span>
        </div>
      </div>
      {empty ? <EmptyState label="No activity in this range yet." /> : <BarChart data={data} />}
    </>
  );
}

function RetentionWidget() {
  if (isSupabaseConfigured) {
    return (
      <>
        <p className="text-xs text-white/45">Audience retention</p>
        <EmptyState label="Not enough watch data yet." />
      </>
    );
  }
  return (
    <>
      <p className="text-xs text-white/45">
        Featured: “Advanced Objection Handling” · sample data
      </p>
      <div className="mt-4">
        <AreaLine data={RETENTION_CURVE} />
      </div>
      <div className="mt-3 flex justify-between text-xs text-white/45">
        <span>Start · 100%</span>
        <span>Finished · {RETENTION_CURVE[RETENTION_CURVE.length - 1]}%</span>
      </div>
    </>
  );
}

function FunnelWidget() {
  if (isSupabaseConfigured) {
    return (
      <>
        <p className="mb-3 text-xs text-white/45">Lead → certified producer</p>
        <EmptyState label="Not enough funnel data yet." />
      </>
    );
  }
  return (
    <>
      <p className="mb-3 text-xs text-white/45">Lead → certified producer · sample data</p>
      <Funnel data={FUNNEL} />
    </>
  );
}

function AudienceWidget({ data }: { data: { label: string; value: number }[] }) {
  const empty = data.length === 0 || data.reduce((s, d) => s + d.value, 0) === 0;
  return (
    <>
      <p className="mb-3 text-xs text-white/45">Share of audience by age bracket</p>
      {empty ? (
        <EmptyState label="No signups in this range yet." />
      ) : (
        <Donut data={data} />
      )}
    </>
  );
}

function HeatmapWidget({ grid }: { grid: number[][] }) {
  const empty = grid.every((row) => row.every((n) => n === 0));
  return (
    <>
      <p className="mb-3 text-xs text-white/45">When agents train</p>
      {empty ? <EmptyState label="No activity in this range yet." /> : <Heatmap grid={grid} />}
    </>
  );
}

function TopContentTable({ rows, limit }: { rows: TopRow[]; limit?: number }) {
  const data = limit ? rows.slice(0, limit) : rows;
  if (data.length === 0) return <EmptyState label="No lesson views yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
            <th className="pb-3 font-semibold">Lesson</th>
            <th className="pb-3 font-semibold">Views</th>
            <th className="pb-3 font-semibold">Completion</th>
            <th className="pb-3 font-semibold">Avg. Watch</th>
            <th className="pb-3 text-right font-semibold">Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((c, i) => (
            <tr key={c.ref ?? `${c.title}-${i}`} className="text-zinc-200">
              <td className="py-3 font-medium text-white">{c.title}</td>
              <td className="py-3">{c.views.toLocaleString()}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-nonstop"
                      style={{ width: `${c.completion}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/55">{c.completion}%</span>
                </div>
              </td>
              <td className="py-3 text-white/55">{c.avgWatch ?? "—"}</td>
              <td className="py-3 text-right">
                {c.trend === undefined ? (
                  <span className="text-white/30">—</span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${
                      c.trend >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {c.trend >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {Math.abs(c.trend)}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardList({
  rows,
  movement,
  limit,
}: {
  rows: typeof LEADERBOARD;
  movement?: Record<string, number | null>;
  limit?: number;
}) {
  const data = limit ? rows.slice(0, limit) : rows;
  if (data.length === 0)
    return <EmptyState label="No completed lessons yet." />;
  return (
    <ul className="space-y-2">
      {data.map((a, i) => {
        const mv = movement?.[a.name];
        return (
          <li
            key={`${a.name}-${i}`}
            className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg font-display text-sm font-bold ${
                i === 0 ? "bg-nonstop text-white" : "bg-white/10 text-white/50"
              }`}
            >
              {i + 1}
            </span>
            {movement && (
              <span className="w-9 shrink-0 text-[11px] font-semibold">
                {mv === null || mv === undefined ? (
                  <span className="text-nonstop">NEW</span>
                ) : mv > 0 ? (
                  <span className="text-green-400">▲{mv}</span>
                ) : mv < 0 ? (
                  <span className="text-red-400">▼{Math.abs(mv)}</span>
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate font-medium text-white">
              {a.name}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-white/55">
              <Flame className="h-4 w-4 text-zinc-300" />
              {a.streak}d
            </span>
            <span className="w-16 text-right text-sm text-white/55">
              {a.certs} certs
            </span>
            <span className="w-14 text-right font-bold text-white">
              {a.completion}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

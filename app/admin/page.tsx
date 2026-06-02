"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ExpandablePanel } from "@/components/ui/expandable-card";
import { useStore } from "@/lib/store";
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
} from "lucide-react";

export default function AdminPage() {
  return (
    <AppShell>
      <Analytics />
    </AppShell>
  );
}

function Analytics() {
  const { role } = useStore();

  if (role !== "admin") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
        <Shield className="h-10 w-10 text-zinc-300" />
        <h1 className="font-display text-2xl font-bold text-white">Admin only</h1>
        <p className="text-sm text-muted">
          Switch to <span className="font-semibold text-zinc-300">Admin</span> using the
          toggle in the bottom-right to view analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      {/* header */}
      <PageHeader
        label="Sample data"
        title="Analytics"
        meta="Agency performance · last 30 days · NonStop Financial"
        actions={
          <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-1 text-xs">
            {["7d", "30d", "90d", "All"].map((r, i) => (
              <button
                key={r}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  i === 1
                    ? "bg-nonstop text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {/* top content — expands to full table */}
      <div className="mt-6">
        <ExpandablePanel
          label="Top Content"
          title="Top Content"
          tone="light"
          preview={<TopContentTable limit={4} />}
        >
          <TopContentTable />
        </ExpandablePanel>
      </div>

      {/* KPI tiles — each expands to a larger breakdown */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {KPIS.map((k) => (
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

      {/* engagement + retention — expandable feature cards */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpandablePanel
            label="Engagement"
            title="Engagement"
            tone="light"
            preview={<EngagementWidget />}
          >
            <EngagementWidget />
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

      {/* expandable widget row — click any to grow it */}
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
          preview={<AudienceWidget />}
        >
          <AudienceWidget />
        </ExpandablePanel>

        <ExpandablePanel
          label="Most Active Hours"
          title="Most Active Hours"
          tone="light"
          preview={<HeatmapWidget />}
        >
          <HeatmapWidget />
        </ExpandablePanel>
      </div>

      {/* leaderboard — expands to full team */}
      <div className="mt-6">
        <ExpandablePanel
          label="Team Leaderboard"
          title="Team Leaderboard"
          tone="light"
          preview={<LeaderboardList limit={5} />}
        >
          <LeaderboardList />
        </ExpandablePanel>
      </div>
    </div>
  );
}

/* ── widget bodies (shared by collapsed preview + expanded view) ── */

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

      {expanded && (
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

function EngagementWidget() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs text-white/45">
          Active agents vs lesson views · 14 days
        </p>
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
            Lesson views
          </span>
        </div>
      </div>
      <BarChart data={ENGAGEMENT_14D} />
    </>
  );
}

function RetentionWidget() {
  return (
    <>
      <p className="text-xs text-white/45">
        Featured: “Advanced Objection Handling”
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
  return (
    <>
      <p className="mb-3 text-xs text-white/45">Lead → certified producer</p>
      <Funnel data={FUNNEL} />
    </>
  );
}

function AudienceWidget() {
  // Live age distribution from Supabase signups; falls back to the sample data
  // until there are enough real accounts to populate it.
  const [data, setData] = useState(AUDIENCE_BY_AGE);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data: rows, error } = await supabase!.rpc("age_distribution");
      if (cancelled || error || !rows) return;
      const total = (rows as { label: string; value: number }[]).reduce(
        (s, r) => s + r.value,
        0
      );
      if (total > 0) {
        setData(rows as { label: string; value: number }[]);
        setLive(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <p className="mb-3 text-xs text-white/45">
        Share of audience by age bracket{live ? "" : " · sample data"}
      </p>
      <Donut data={data} />
    </>
  );
}

function HeatmapWidget() {
  return (
    <>
      <p className="mb-3 text-xs text-white/45">When agents train</p>
      <Heatmap grid={ACTIVE_HEATMAP} />
    </>
  );
}

function TopContentTable({ limit }: { limit?: number }) {
  const rows = limit ? TOP_CONTENT.slice(0, limit) : TOP_CONTENT;
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
          {rows.map((c) => (
            <tr key={c.title} className="text-zinc-200">
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
              <td className="py-3 text-white/55">{c.avgWatch}</td>
              <td className="py-3 text-right">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardList({ limit }: { limit?: number }) {
  const rows = limit ? LEADERBOARD.slice(0, limit) : LEADERBOARD;
  return (
    <ul className="space-y-2">
      {rows.map((a, i) => (
        <li
          key={a.name}
          className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg font-display text-sm font-bold ${
              i === 0 ? "bg-nonstop text-white" : "bg-white/10 text-white/50"
            }`}
          >
            {i + 1}
          </span>
          <span className="flex-1 font-medium text-white">{a.name}</span>
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
      ))}
    </ul>
  );
}

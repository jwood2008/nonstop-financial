"use client";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { useStore } from "@/lib/store";
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
  AUDIENCE_BY_MODULE,
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* header */}
      <PageHeader
        label="Sample data"
        title="Analytics"
        meta="Agency performance · last 30 days · NonStop Financial"
        actions={
          <div className="flex items-center gap-1 border border-line-2 bg-surface-2 p-0.5 text-xs">
            {["7d", "30d", "90d", "All"].map((r, i) => (
              <button
                key={r}
                className={`px-3 py-1.5 font-semibold transition ${
                  i === 1 ? "bg-nonstop text-white" : "text-muted hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI strip — one divided container, not a grid of cards */}
      <div className="grid grid-cols-2 border border-line md:grid-cols-4">
        {KPIS.map((k, i) => (
          <div
            key={k.label}
            className={`px-5 py-4 ${i % 4 !== 0 ? "md:border-l md:border-line" : ""} ${
              i % 2 !== 0 ? "border-l border-line md:border-l" : ""
            } ${i >= 4 ? "border-t border-line" : ""} ${
              i >= 2 && i < 4 ? "border-t border-line md:border-t-0" : ""
            }`}
          >
            <div className="crosshead text-[10px] text-muted-2">{k.label}</div>
            <div className="mt-1.5 flex items-end justify-between gap-2">
              <span className="font-display text-2xl font-medium tabular text-white">
                {k.value}
              </span>
              <span
                className={`flex items-center gap-0.5 text-xs font-semibold ${
                  k.delta >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {k.delta >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {Math.abs(k.delta)}%
              </span>
            </div>
            <div className="mt-2">
              <Sparkline data={k.series} color="#52525b" />
            </div>
          </div>
        ))}
      </div>

      {/* engagement + retention */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="border border-line bg-surface p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Engagement
              </h2>
              <p className="text-xs text-muted-2">Active agents vs lesson views · 14 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2.5 w-2.5 bg-white" /> Active agents
              </span>
              <span className="flex items-center gap-1.5 text-muted">
                <span className="h-2.5 w-2.5 bg-line-2" /> Lesson views
              </span>
            </div>
          </div>
          <BarChart data={ENGAGEMENT_14D} />
        </div>

        <div className="border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Audience Retention
          </h2>
          <p className="text-xs text-muted-2">
            Featured: “Advanced Objection Handling”
          </p>
          <div className="mt-4">
            <AreaLine data={RETENTION_CURVE} />
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-2">
            <span>Start · 100%</span>
            <span>Finished · {RETENTION_CURVE[RETENTION_CURVE.length - 1]}%</span>
          </div>
        </div>
      </div>

      {/* funnel + audience + heatmap */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="border border-line bg-surface p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            Producer Funnel
          </h2>
          <Funnel data={FUNNEL} />
        </div>
        <div className="border border-line bg-surface p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            Audience by Module
          </h2>
          <Donut data={AUDIENCE_BY_MODULE} />
        </div>
        <div className="border border-line bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Most Active Hours
          </h2>
          <p className="mb-4 text-xs text-muted-2">When agents train</p>
          <Heatmap grid={ACTIVE_HEATMAP} />
        </div>
      </div>

      {/* top content table */}
      <div className="border border-line bg-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Top Content</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted-2">
                <th className="pb-3 font-semibold">Lesson</th>
                <th className="pb-3 font-semibold">Views</th>
                <th className="pb-3 font-semibold">Completion</th>
                <th className="pb-3 font-semibold">Avg. Watch</th>
                <th className="pb-3 text-right font-semibold">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {TOP_CONTENT.map((c) => (
                <tr key={c.title} className="text-zinc-200">
                  <td className="py-3 font-medium text-white">{c.title}</td>
                  <td className="py-3">{c.views.toLocaleString()}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden bg-surface-3">
                        <div
                          className="h-full bg-nonstop"
                          style={{ width: `${c.completion}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted">{c.completion}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted">{c.avgWatch}</td>
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
      </div>

      {/* leaderboard */}
      <div className="border border-line bg-surface p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">
          Team Leaderboard
        </h2>
        <ul className="space-y-2">
          {LEADERBOARD.map((a, i) => (
            <li
              key={a.name}
              className="flex items-center gap-4 border border-line bg-surface-2 px-4 py-3"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center font-display text-sm font-bold ${
                  i === 0
                    ? "bg-nonstop text-white"
                    : "bg-surface-3 text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className="flex-1 font-medium text-white">{a.name}</span>
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <Flame className="h-4 w-4 text-zinc-300" />
                {a.streak}d
              </span>
              <span className="w-16 text-right text-sm text-muted">
                {a.certs} certs
              </span>
              <span className="w-14 text-right font-bold text-white">
                {a.completion}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

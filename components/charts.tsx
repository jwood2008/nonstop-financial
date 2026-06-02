"use client";

// Charts are neutral (no orange — reads less "AI"). Colors come from CSS
// tokens so they flip with the theme: white ink on dark, near-black on light.
const PRIMARY = "var(--chart-line-primary)";
const SECONDARY = "var(--color-line-2)";

/* ---------- Sparkline (KPI cards) ---------- */
export function Sparkline({ data, color = PRIMARY }: { data: number[]; color?: string }) {
  const w = 120;
  const h = 36;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  // sanitize for a valid SVG id (color may be a hex or a var(--…) expression)
  const id = `sg-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.35 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" style={{ stroke: color }} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Grouped bar chart (engagement over time) ---------- */
export function BarChart({
  data,
}: {
  data: { day: string; active: number; lessons: number }[];
}) {
  const max = Math.max(...data.map((d) => d.lessons));
  return (
    <div className="flex h-56 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-full w-full items-end justify-center gap-[3px]">
            <div
              className="w-1/2"
              style={{ height: `${(d.lessons / max) * 100}%`, background: SECONDARY }}
              title={`${d.lessons} lesson views`}
            />
            <div
              className="w-1/2"
              style={{ height: `${(d.active / max) * 100}%`, background: PRIMARY }}
              title={`${d.active} active agents`}
            />
          </div>
          <span className="text-[10px] text-muted-2">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Area line (audience retention) ---------- */
export function AreaLine({ data }: { data: number[] }) {
  const w = 600;
  const h = 180;
  const max = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 10) - 5;
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="ret" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: PRIMARY, stopOpacity: 0.4 }} />
          <stop offset="100%" style={{ stopColor: PRIMARY, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {[25, 50, 75].map((g) => (
        <line
          key={g}
          x1="0"
          x2={w}
          y1={h - (g / max) * (h - 10) - 5}
          y2={h - (g / max) * (h - 10) - 5}
          style={{ stroke: "var(--chart-grid)" }}
          strokeWidth="1"
        />
      ))}
      <path d={area} fill="url(#ret)" />
      <path d={line} fill="none" style={{ stroke: PRIMARY }} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Donut (audience by module) ---------- */
export function Donut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  // monochrome ramp over the theme ink — distinct steps for any segment count,
  // and reads on both dark and light paper.
  const opacityFor = (i: number) =>
    1 - (i / Math.max(data.length - 1, 1)) * 0.78;
  let acc = 0;
  const R = 60;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const seg = (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              style={{ stroke: "var(--chart-line-primary)" }}
              strokeOpacity={opacityFor(i)}
              strokeWidth="20"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-acc * C}
            />
          );
          acc += frac;
          return seg;
        })}
        <circle cx="80" cy="80" r="42" style={{ fill: "var(--chart-background)" }} />
      </svg>
      <ul className="space-y-2">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5"
              style={{
                background: "var(--chart-line-primary)",
                opacity: opacityFor(i),
              }}
            />
            <span className="text-muted">{d.label}</span>
            <span className="ml-auto font-semibold text-white">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Active-hours heatmap ---------- */
export function Heatmap({ grid }: { grid: number[][] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // intensity 0–4 as opacity over the theme ink: faint→solid in either mode
  const intensity = [0.06, 0.22, 0.42, 0.68, 1];
  return (
    <div className="space-y-1.5">
      {grid.map((row, r) => (
        <div key={r} className="flex items-center gap-1.5">
          <span className="w-8 text-[10px] text-muted-2">{days[r]}</span>
          {row.map((v, c) => (
            <div
              key={c}
              className="h-4 flex-1 "
              style={{
                background: "var(--chart-line-primary)",
                opacity: intensity[v] ?? 0.06,
              }}
              title={`${days[r]} · ${c * 2}:00–${c * 2 + 2}:00`}
            />
          ))}
        </div>
      ))}
      <div className="flex items-center gap-1.5 pt-1 pl-9 text-[10px] text-muted-2">
        12a
        <span className="flex-1" />
        12p
        <span className="flex-1" />
        10p
      </div>
    </div>
  );
}

/* ---------- Horizontal funnel ---------- */
export function Funnel({ data }: { data: { stage: string; value: number }[] }) {
  const max = data[0].value;
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <div key={i}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted">{d.stage}</span>
              <span className="font-semibold text-white">
                {d.value.toLocaleString()}{" "}
                <span className="text-muted-2">· {pct}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden bg-surface-3">
              <div
                className="h-full"
                style={{ width: `${pct}%`, background: PRIMARY }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { jsPDF } from "jspdf";

export type ReportData = {
  rangeLabel: string;
  generatedOn: string;
  kpis: { label: string; value: string; delta: number }[];
  leaders: { name: string; completion: number; streak: number; certs: number }[];
};

const ORANGE = "#ff5f1f";
const INK = "#15161a";
const PANEL = "#26272d";

function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** A branded 1080×1350 portrait card — sized for Instagram feed / stories. */
export function buildReportCard(data: ReportData): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;

  // background + brand glow
  c.fillStyle = INK;
  c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(W / 2, -120, 60, W / 2, -120, 900);
  glow.addColorStop(0, "rgba(255,95,31,0.32)");
  glow.addColorStop(1, "rgba(255,95,31,0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  const pad = 72;

  // wordmark
  c.fillStyle = ORANGE;
  c.font = "italic 900 46px Helvetica, Arial, sans-serif";
  c.fillText("NONSTOP", pad, 116);
  c.fillStyle = "#ffffff";
  c.font = "300 46px Helvetica, Arial, sans-serif";
  c.fillText(" FINANCIAL", pad + c.measureText("NONSTOP").width, 116);

  c.fillStyle = "rgba(255,255,255,0.5)";
  c.font = "600 22px Helvetica, Arial, sans-serif";
  c.fillText("TEAM PROGRESS REPORT", pad, 158);

  // range
  c.fillStyle = "#ffffff";
  c.font = "italic 900 64px Helvetica, Arial, sans-serif";
  c.fillText(data.rangeLabel, pad, 250);

  // KPI grid (2×2)
  const cells = data.kpis.slice(0, 4);
  const gx = pad;
  const gy = 300;
  const cw = (W - pad * 2 - 32) / 2;
  const ch = 196;
  cells.forEach((k, i) => {
    const x = gx + (i % 2) * (cw + 32);
    const y = gy + Math.floor(i / 2) * (ch + 32);
    c.fillStyle = PANEL;
    roundRect(c, x, y, cw, ch, 28);
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.5)";
    c.font = "600 24px Helvetica, Arial, sans-serif";
    c.fillText(k.label.toUpperCase(), x + 34, y + 56);
    c.fillStyle = "#ffffff";
    c.font = "italic 900 76px Helvetica, Arial, sans-serif";
    c.fillText(k.value, x + 32, y + 138);
    const up = k.delta >= 0;
    c.fillStyle = up ? "#4ade80" : "#f87171";
    c.font = "700 28px Helvetica, Arial, sans-serif";
    c.fillText(`${up ? "▲" : "▼"} ${Math.abs(k.delta)}%`, x + 34, y + 176);
  });

  // top producers
  let y = gy + 2 * (ch + 32) + 56;
  c.fillStyle = "#ffffff";
  c.font = "600 28px Helvetica, Arial, sans-serif";
  c.fillText("TOP PRODUCERS", pad, y);
  y += 28;
  data.leaders.slice(0, 4).forEach((l, i) => {
    const rowH = 92;
    c.fillStyle = PANEL;
    roundRect(c, pad, y, W - pad * 2, rowH - 16, 22);
    c.fill();
    // rank chip
    c.fillStyle = i === 0 ? ORANGE : "rgba(255,255,255,0.1)";
    roundRect(c, pad + 18, y + 16, 46, 46, 12);
    c.fill();
    c.fillStyle = i === 0 ? "#ffffff" : "rgba(255,255,255,0.6)";
    c.font = "900 26px Helvetica, Arial, sans-serif";
    c.fillText(String(i + 1), pad + 33, y + 48);
    // name
    c.fillStyle = "#ffffff";
    c.font = "600 32px Helvetica, Arial, sans-serif";
    c.fillText(l.name, pad + 86, y + 48);
    // completion
    const label = `${l.completion}%`;
    c.fillStyle = ORANGE;
    c.font = "italic 900 36px Helvetica, Arial, sans-serif";
    const tw = c.measureText(label).width;
    c.fillText(label, W - pad - 28 - tw, y + 50);
    y += rowH;
  });

  // footer
  c.fillStyle = "rgba(255,255,255,0.4)";
  c.font = "500 22px Helvetica, Arial, sans-serif";
  c.fillText(`Generated ${data.generatedOn} · nonstopfinancial.com`, pad, H - 56);

  return canvas;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Download the shareable card as PNG (and offer the native share sheet if available). */
export async function exportReportImage(data: ReportData) {
  const canvas = buildReportCard(data);
  const blob: Blob | null = await new Promise((res) =>
    canvas.toBlob((b) => res(b), "image/png")
  );
  if (!blob) return;
  const filename = `nonstop-report-${slug(data.rangeLabel)}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  const navAny = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
    share?: (d: { files: File[]; title?: string }) => Promise<void>;
  };
  if (navAny.canShare?.({ files: [file] }) && navAny.share) {
    try {
      await navAny.share({ files: [file], title: "NonStop Financial — Team Report" });
      return;
    } catch {
      /* user cancelled — fall through to download */
    }
  }
  downloadBlob(blob, filename);
}

/** Download a one-page branded PDF report. */
export function exportReportPdf(data: ReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const pad = 48;

  // header band
  doc.setFillColor(21, 22, 26);
  doc.rect(0, 0, W, 132, "F");
  doc.setTextColor(255, 95, 31);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(24);
  doc.text("NONSTOP", pad, 58);
  const wmW = doc.getTextWidth("NONSTOP");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.text(" FINANCIAL", pad + wmW, 58);
  doc.setFontSize(11);
  doc.setTextColor(180, 180, 185);
  doc.text("TEAM PROGRESS REPORT", pad, 84);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(20);
  doc.text(data.rangeLabel, pad, 116);

  let y = 184;
  doc.setTextColor(30, 30, 33);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Key metrics", pad, y);
  y += 10;
  doc.setDrawColor(225, 225, 228);
  doc.line(pad, y, W - pad, y);
  y += 26;
  doc.setFontSize(12);
  data.kpis.forEach((k) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 96);
    doc.text(k.label, pad, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 22);
    doc.text(String(k.value), pad + 220, y);
    doc.setTextColor(k.delta >= 0 ? 22 : 200, k.delta >= 0 ? 163 : 50, k.delta >= 0 ? 74 : 50);
    doc.text(`${k.delta >= 0 ? "+" : ""}${k.delta}%`, pad + 340, y);
    y += 24;
  });

  y += 22;
  doc.setTextColor(30, 30, 33);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Top producers", pad, y);
  y += 10;
  doc.line(pad, y, W - pad, y);
  y += 26;
  doc.setFontSize(12);
  data.leaders.slice(0, 8).forEach((l, i) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 22);
    doc.text(`${i + 1}.  ${l.name}`, pad, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 96);
    doc.text(`${l.completion}% complete`, pad + 240, y);
    doc.text(`${l.streak}d active`, pad + 360, y);
    doc.text(`${l.certs} certs`, pad + 450, y);
    y += 24;
  });

  // embed the shareable card image
  const card = buildReportCard(data);
  const imgW = W - pad * 2;
  const imgH = (imgW * card.height) / card.width;
  y += 24;
  doc.addImage(card.toDataURL("image/png"), "PNG", pad, y, imgW, imgH);

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 155);
  doc.text(
    `Generated ${data.generatedOn} · NonStop Financial`,
    pad,
    doc.internal.pageSize.getHeight() - 24
  );

  doc.save(`nonstop-report-${slug(data.rangeLabel)}.pdf`);
}

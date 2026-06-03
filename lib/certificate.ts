import { jsPDF } from "jspdf";

export type CertData = {
  name: string;
  course: string;
  date: string;
};

const ORANGE = "#ff5f1f";
const PAPER = "#faf8f4";
const INK = "#1b1b1f";

/** A printable landscape certificate (A4 ratio, 1600×1132). */
export function buildCertificateCanvas(data: CertData): HTMLCanvasElement {
  const W = 1600;
  const H = 1132;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  const cx = W / 2;

  // paper + borders
  c.fillStyle = PAPER;
  c.fillRect(0, 0, W, H);
  c.strokeStyle = ORANGE;
  c.lineWidth = 10;
  c.strokeRect(46, 46, W - 92, H - 92);
  c.strokeStyle = "rgba(255,95,31,0.45)";
  c.lineWidth = 2;
  c.strokeRect(70, 70, W - 140, H - 140);

  // wordmark (two-tone, centered)
  c.textBaseline = "alphabetic";
  c.textAlign = "left";
  c.font = "italic 900 40px Georgia, 'Times New Roman', serif";
  const w1 = c.measureText("NONSTOP").width;
  c.font = "300 40px Georgia, 'Times New Roman', serif";
  const w2 = c.measureText(" FINANCIAL").width;
  const start = cx - (w1 + w2) / 2;
  c.fillStyle = ORANGE;
  c.font = "italic 900 40px Georgia, 'Times New Roman', serif";
  c.fillText("NONSTOP", start, 168);
  c.fillStyle = INK;
  c.font = "300 40px Georgia, 'Times New Roman', serif";
  c.fillText(" FINANCIAL", start + w1, 168);

  c.textAlign = "center";

  // title
  c.fillStyle = INK;
  c.font = "700 70px Georgia, 'Times New Roman', serif";
  c.fillText("Certificate of Completion", cx, 300);

  // orange divider
  c.fillStyle = ORANGE;
  c.fillRect(cx - 110, 336, 220, 4);

  // body
  c.fillStyle = "#6b6b72";
  c.font = "26px Georgia, 'Times New Roman', serif";
  c.fillText("This certifies that", cx, 440);

  // recipient name
  c.fillStyle = INK;
  c.font = "italic 700 84px Georgia, 'Times New Roman', serif";
  c.fillText(data.name, cx, 540);
  const nameW = Math.min(c.measureText(data.name).width + 80, W - 240);
  c.strokeStyle = "rgba(0,0,0,0.18)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx - nameW / 2, 566);
  c.lineTo(cx + nameW / 2, 566);
  c.stroke();

  c.fillStyle = "#6b6b72";
  c.font = "26px Georgia, 'Times New Roman', serif";
  c.fillText("has successfully completed", cx, 632);

  // course
  c.fillStyle = ORANGE;
  c.font = "700 44px Georgia, 'Times New Roman', serif";
  c.fillText(data.course, cx, 696);

  // congrats
  c.fillStyle = "#4a4a50";
  c.font = "italic 28px Georgia, 'Times New Roman', serif";
  c.fillText("Congratulations — course complete!", cx, 772);

  // seal
  c.beginPath();
  c.arc(cx, 880, 52, 0, Math.PI * 2);
  c.strokeStyle = ORANGE;
  c.lineWidth = 4;
  c.stroke();
  c.fillStyle = ORANGE;
  c.font = "900 22px Georgia, serif";
  c.fillText("★", cx, 872);
  c.font = "700 13px Helvetica, Arial, sans-serif";
  c.fillText("CERTIFIED", cx, 894);

  // date footer
  c.fillStyle = "#8a8a90";
  c.font = "22px Georgia, 'Times New Roman', serif";
  c.fillText(`Awarded ${data.date} · NonStop Financial`, cx, 1010);

  return canvas;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function certificateDataUrl(data: CertData): string {
  return buildCertificateCanvas(data).toDataURL("image/png");
}

/** Download the certificate as a landscape PDF. */
export function downloadCertificatePdf(data: CertData) {
  const canvas = buildCertificateCanvas(data);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, W, H);
  doc.save(`nonstop-certificate-${slug(data.name || "producer")}.pdf`);
}

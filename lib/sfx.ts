"use client";

/** Phone call sound effects synthesized with the Web Audio API (no asset files). */

let ctx: AudioContext | null = null;
function ac(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

/** US ringback tone (440 + 480 Hz), repeating until you call stop(). */
export function ringback(): { stop: () => void } {
  const a = ac();
  a.resume();
  let stopped = false;

  const ringOnce = (t: number) => {
    [440, 480].forEach((f) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(a.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
      g.gain.setValueAtTime(0.07, t + 1.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      o.start(t);
      o.stop(t + 1.55);
    });
  };

  ringOnce(a.currentTime + 0.05);
  const id = window.setInterval(() => {
    if (!stopped) ringOnce(a.currentTime + 0.05);
  }, 2600);

  return {
    stop: () => {
      stopped = true;
      window.clearInterval(id);
    },
  };
}

/** Short "line picked up" click. */
export function pickup(): void {
  const a = ac();
  a.resume();
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "sine";
  o.frequency.value = 180;
  o.connect(g);
  g.connect(a.destination);
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.start(t);
  o.stop(t + 0.1);
}

/** Two-tone "call ended" sound. */
export function hangupTone(): void {
  const a = ac();
  a.resume();
  const t = a.currentTime;
  [[480, 0], [620, 0.18]].forEach(([f, off]) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.value = f;
    o.connect(g);
    g.connect(a.destination);
    g.gain.setValueAtTime(0.0001, t + off);
    g.gain.exponentialRampToValueAtTime(0.08, t + off + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.16);
    o.start(t + off);
    o.stop(t + off + 0.18);
  });
}

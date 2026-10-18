// VA-MOD style tick-volume engine. Deriv gives no exchange volume for its indices,
// so "volume" here = number of ticks traded at each price level (tick volume).
import { analyzePatterns, efficiency, type Setup } from "./patterns";

export type VolumeProfile = { poc: number; vah: number; val: number; delta15: number; delta30: number; absorption: boolean; tickRate: number | null; bins: { price: number; ticks: number }[] };

/** Tick-volume profile over the last `window` ticks: POC, 70% value area, up/down delta and absorption. */
export function volumeProfile(prices: number[], window = 200, binCount = 24, times?: number[]): VolumeProfile | null {
  const w = prices.slice(-window);
  if (w.length < 30) return null;
  const lo = Math.min(...w), hi = Math.max(...w);
  const step = (hi - lo) / binCount || 1e-9;
  const counts = new Array<number>(binCount).fill(0);
  for (const p of w) counts[Math.min(binCount - 1, Math.floor((p - lo) / step))]!++;
  const mid = (i: number) => lo + (i + 0.5) * step;
  let pocI = 0; counts.forEach((c, i) => { if (c > counts[pocI]!) pocI = i; });
  // value area: grow from POC until 70% of ticks are inside
  let a = pocI, b = pocI, inside = counts[pocI]!;
  while (inside < w.length * 0.7 && (a > 0 || b < binCount - 1)) {
    const left = a > 0 ? counts[a - 1]! : -1, right = b < binCount - 1 ? counts[b + 1]! : -1;
    if (right >= left) inside += counts[++b]!; else inside += counts[--a]!;
  }
  const delta = (n: number) => { const s = prices.slice(-n - 1); let d = 0; for (let i = 1; i < s.length; i++) d += Math.sign(s[i]! - s[i - 1]!); return d; };
  const last30 = prices.slice(-30);
  const range30 = Math.max(...last30) - Math.min(...last30);
  const absorption = range30 < (hi - lo) * 0.15 && Math.abs(delta(30)) <= 4;
  let tickRate: number | null = null;
  if (times && times.length >= 2) { const t = times.slice(-60); const span = (t.at(-1)! - t[0]!) / 1000; tickRate = span > 0 ? (t.length - 1) / span : null; }
  return { poc: mid(pocI), vah: lo + (b + 1) * step, val: lo + a * step, delta15: delta(15), delta30: delta(30), absorption, tickRate, bins: counts.map((ticks, i) => ({ price: mid(i), ticks })) };
}

/** Volume score in −1..1: price vs POC/value area plus delta direction. */
export function volumeScore(prices: number[]): { score: number; vp: VolumeProfile | null } {
  const vp = volumeProfile(prices);
  if (!vp) return { score: 0, vp };
  const last = prices.at(-1)!;
  let loc = 0;
  if (last > vp.vah) loc = 1; else if (last < vp.val) loc = -1; else loc = last > vp.poc ? 0.4 : last < vp.poc ? -0.4 : 0;
  const d = Math.max(-1, Math.min(1, vp.delta15 / 8)) * 0.6 + Math.max(-1, Math.min(1, vp.delta30 / 12)) * 0.4;
  return { score: Math.max(-1, Math.min(1, loc * 0.5 + d * 0.5)), vp };
}

/**
 * Setup D "VA-MOD Hybrid": weight% tick-volume (POC/value area + delta) + rest price-action patterns.
 * Fires when |combined| ≥ threshold, volume and pattern agree, delta agrees, and the market is not flat.
 */
export function vamodSetup(prices: number[], sensitivity = 3, weight = 60, threshold = 70): Setup {
  const none = { trend: false, ema: false, trigger: false, score: false };
  if (prices.length < 60) return { side: null, confidence: 0, note: "Collecting ticks…", checks: none };
  const { score: vol, vp } = volumeScore(prices);
  const r = analyzePatterns(prices, sensitivity);
  const pat = Math.max(-1, Math.min(1, r.score / 6));
  const w = Math.max(40, Math.min(80, weight)) / 100;
  const combined = vol * w + pat * (1 - w);
  const side: 0 | 1 | null = combined > 0 ? 0 : combined < 0 ? 1 : null;
  const sgn = side === 0 ? 1 : -1;
  const checks = {
    trend: side !== null && efficiency(prices) >= 0.12 && Math.sign(vol) === sgn,
    ema: side !== null && !!vp && Math.sign(vp.delta15) === sgn && !vp.absorption,
    trigger: side !== null && Math.sign(pat) === sgn,
    score: Math.abs(combined) * 100 >= threshold,
  };
  const pct = Math.round(Math.abs(combined) * 100);
  if (!Object.values(checks).every(Boolean) || side === null) {
    const miss = Object.entries(checks).filter(([, v]) => !v).map(([k]) => ({ trend: "volume", ema: "delta", trigger: "pattern", score: `confluence ${pct}%<${threshold}%` }[k])).join(", ");
    return { side: null, confidence: pct, note: `VA-MOD waiting — missing: ${miss}`, checks };
  }
  return { side, confidence: Math.min(95, pct), note: `Setup D ${side === 0 ? "▲" : "▼"} CONFIRMED: volume ${Math.round(vol * 100)} · pattern ${Math.round(pat * 100)} · confluence ${pct}%`, checks };
}

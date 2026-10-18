export type SessionTrade = { profit: number | null; stake: number; setup?: string | undefined; demo?: boolean; accountId?: string | undefined; openedAt?: number | undefined; settledAt?: number | undefined };

export function balanceStakeCap(balance: number | null, percent: number, maximum: number): number | null {
  if (balance === null || !Number.isFinite(balance) || balance < 0 || !Number.isFinite(percent) || percent <= 0 || percent > 100 || !Number.isFinite(maximum) || maximum <= 0) return null;
  return Math.floor(Math.min(balance * percent / 100, maximum, balance) * 100) / 100;
}

export function stakeProtection(amount: number, balance: number | null, percent: number, maximum: number): string | null {
  const cap = balanceStakeCap(balance, percent, maximum);
  if (cap === null) return "Balance protection needs a valid balance, stake cap and risk percentage (above 0, up to 100)";
  if (!Number.isFinite(amount) || amount <= 0) return "Stake must be a finite positive amount";
  if (amount > cap) return `Stake ${amount.toFixed(2)} exceeds balance-protected cap ${cap.toFixed(2)} (${percent}% of balance)`;
  return null;
}

export function demoStrategyStats(trades: SessionTrade[], setup: string, accountId?: string) {
  const rows = trades.filter(t => t.demo === true && t.setup === setup && t.accountId === accountId);
  const settled = rows.filter(t => t.profit !== null && Number.isFinite(t.profit));
  const wins = settled.filter(t => (t.profit ?? 0) > 0).length;
  const losses = settled.filter(t => (t.profit ?? 0) < 0).length;
  const flat = settled.length - wins - losses;
  const net = settled.reduce((sum, t) => sum + (t.profit ?? 0), 0);
  const grossProfit = settled.reduce((sum, t) => sum + Math.max(0, t.profit ?? 0), 0);
  const grossLoss = -settled.reduce((sum, t) => sum + Math.min(0, t.profit ?? 0), 0);
  return { wins, losses, flat, net, settled: settled.length, pending: rows.length - settled.length, winRate: settled.length ? wins / settled.length * 100 : null, expectancy: settled.length ? net / settled.length : null, profitFactor: grossLoss ? grossProfit / grossLoss : null };
}
/** Live dashboard figures from Deriv-settled trades of one account only. Rate uses time from first order to now (min 1 minute). */
export function liveDashboard(trades: SessionTrade[], accountId: string | undefined, now: number) {
  const rows = trades.filter(t => t.accountId === accountId);
  const settled = rows.filter(t => t.profit !== null && Number.isFinite(t.profit) && t.settledAt !== undefined);
  const net = settled.reduce((s, t) => s + (t.profit ?? 0), 0);
  const starts = rows.map(t => t.openedAt).filter((x): x is number => typeof x === "number");
  const start = starts.length ? Math.min(...starts) : null;
  const hours = start === null ? null : Math.max(now - start, 60_000) / 3_600_000;
  const bySetup: Record<string, { wins: number; losses: number; flat: number; net: number; settled: number }> = {};
  for (const t of settled) {
    const k = t.setup ?? "OTHER";
    const b = bySetup[k] ??= { wins: 0, losses: 0, flat: 0, net: 0, settled: 0 };
    const p = t.profit ?? 0;
    b.settled++; b.net += p; if (p > 0) b.wins++; else if (p < 0) b.losses++; else b.flat++;
  }
  return { settled: settled.length, pending: rows.length - settled.length, net, hours, perHour: hours && settled.length ? net / hours : null, bySetup };
}

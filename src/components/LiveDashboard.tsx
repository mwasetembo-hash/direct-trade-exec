import { useEffect, useState } from "react";
import { Gauge, Wallet, Timer, Layers } from "lucide-react";
import { liveDashboard, type SessionTrade } from "@/lib/trading-session";

type Props = { trades: SessionTrade[]; accountId?: string | undefined; balance: number | null; currency?: string | undefined; demo: boolean };

export function LiveDashboard(p: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const d = liveDashboard(p.trades, p.accountId, now);
  const cur = p.currency ?? "";
  const up = (n: number) => (n < 0 ? "text-down" : "text-up");
  const runtime = d.hours === null ? "—" : `${Math.floor(d.hours)}h ${Math.floor((d.hours * 60) % 60)}m`;
  const setups = Object.entries(d.bySetup).sort(([a], [b]) => a.localeCompare(b));
  return <section className="col-span-full min-w-0 border-y border-border bg-background/80 px-4 py-5 sm:px-6" aria-label="Live dashboard">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div><div className="mb-1 text-xs text-telemetry">&gt;_ live.dashboard</div><h2 className="!mb-0 !border-0 !pb-0 !text-lg">Live profit panel</h2></div>
      <span className="text-xs text-muted-foreground">{p.accountId ? `${p.accountId} · ${p.demo ? "DEMO" : "REAL"}` : "NOT CONNECTED"} · settled by Deriv only</span>
    </div>
    <div className="grid grid-cols-2 gap-4 text-xs lg:grid-cols-4">
      <div><Wallet size={17} className="mb-2 text-telemetry" /><div className="text-muted-foreground">CURRENT BALANCE</div><div className="mt-1 text-xl">{p.balance != null ? p.balance.toFixed(2) : "—"} <span className="text-xs text-muted-foreground">{cur}</span></div></div>
      <div><Gauge size={17} className="mb-2 text-primary" /><div className="text-muted-foreground">PROFIT / HOUR</div><div className={`mt-1 text-xl ${d.perHour === null ? "" : up(d.perHour)}`}>{d.perHour === null ? "—" : `${d.perHour >= 0 ? "+" : ""}${d.perHour.toFixed(2)}`}</div></div>
      <div><Layers size={17} className="mb-2 text-telemetry" /><div className="text-muted-foreground">SETTLED NET / OPEN</div><div className={`mt-1 text-xl ${up(d.net)}`}>{d.settled ? d.net.toFixed(2) : "—"} <span className="text-xs text-muted-foreground">/ {d.pending} open</span></div></div>
      <div><Timer size={17} className="mb-2 text-primary" /><div className="text-muted-foreground">SESSION RUNTIME</div><div className="mt-1 text-xl">{runtime}</div></div>
    </div>
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[420px] text-xs">
        <thead className="text-muted-foreground"><tr className="border-b border-border text-left"><th className="py-2">SETUP</th><th>WINS</th><th>LOSSES</th><th>FLAT</th><th>WIN %</th><th className="text-right">NET</th></tr></thead>
        <tbody>
          {setups.length === 0 && <tr><td colSpan={6} className="py-3 text-muted-foreground">No settled trades yet on this account.</td></tr>}
          {setups.map(([k, s]) => <tr key={k} className="border-b border-border/50">
            <td className="py-2 text-telemetry">{k === "OTHER" ? "Manual / other" : `Setup ${k}`}</td><td className="text-up">{s.wins}</td><td className="text-down">{s.losses}</td><td>{s.flat}</td>
            <td>{s.settled ? `${(s.wins / s.settled * 100).toFixed(0)}%` : "—"}</td><td className={`text-right ${up(s.net)}`}>{s.net.toFixed(2)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Profit per hour = settled net ÷ time since your first order this session. It's a past result, not a forecast.</p>
  </section>;
}

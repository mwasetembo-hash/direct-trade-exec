import { volumeProfile } from "@/lib/vamod";

/** Tick-derived market activity. Deriv publishes no open interest, exchange volume or order book for its contracts. */
export function MarketDepth({ prices, times }: { prices: number[]; times: number[] }) {
  const vp = volumeProfile(prices, 200, 16, times);
  const last = prices.at(-1);
  const max = vp ? Math.max(...vp.bins.map((b) => b.ticks), 1) : 1;
  const dp = last !== undefined && last < 10 ? 4 : 2;
  return <section className="col-span-full min-w-0 border-y border-border bg-background/80 px-4 py-5 sm:px-6" aria-label="Market activity">
    <div className="mb-1 text-xs text-telemetry">&gt;_ market.depth</div>
    <h2 className="!mb-1 !border-0 !pb-0 !text-lg">Tick volume &amp; flow</h2>
    <p className="mb-4 text-xs text-muted-foreground">Deriv doesn't publish open interest, real volume or an order book. These figures are measured from live ticks instead and are labelled as tick-based.</p>
    {!vp ? <p className="text-xs text-muted-foreground">Waiting for at least 30 live ticks…</p> : <>
      <div className="mb-4 grid grid-cols-2 gap-3 text-xs lg:grid-cols-4">
        <div><div className="text-muted-foreground">TICK RATE</div><div className="text-base">{vp.tickRate === null ? "—" : `${vp.tickRate.toFixed(2)}/s`}</div></div>
        <div><div className="text-muted-foreground">BUY − SELL TICKS (15 / 30)</div><div className={`text-base ${vp.delta15 < 0 ? "text-down" : "text-up"}`}>{vp.delta15 > 0 ? "+" : ""}{vp.delta15} / {vp.delta30 > 0 ? "+" : ""}{vp.delta30}</div></div>
        <div><div className="text-muted-foreground">POC (busiest price)</div><div className="text-base">{vp.poc.toFixed(dp)}</div></div>
        <div><div className="text-muted-foreground">VALUE AREA 70%</div><div className="text-base">{vp.val.toFixed(dp)} – {vp.vah.toFixed(dp)}</div></div>
      </div>
      {vp.absorption && <p className="mb-3 text-xs text-primary">● Absorption: many ticks, tight range — breakout or exhaustion likely.</p>}
      <div className="space-y-0.5" aria-label="Tick volume by price">
        {[...vp.bins].reverse().map((b) => {
          const isPoc = Math.abs(b.price - vp.poc) < 1e-12;
          const inVa = b.price >= vp.val && b.price <= vp.vah;
          return <div key={b.price} className="flex items-center gap-2 text-[10px]">
            <span className="w-20 shrink-0 text-right text-muted-foreground">{b.price.toFixed(dp)}</span>
            <div className="h-2.5 flex-1"><div className={`h-full ${isPoc ? "bg-primary" : inVa ? "bg-telemetry/60" : "bg-muted-foreground/30"}`} style={{ width: `${(b.ticks / max) * 100}%` }} /></div>
            <span className="w-8 shrink-0 text-muted-foreground">{b.ticks}</span>
          </div>;
        })}
      </div>
    </>}
  </section>;
}

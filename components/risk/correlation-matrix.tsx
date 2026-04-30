"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { CorrelationMatrix } from "@/lib/risk-api"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"

function corrColor(v: number) {
  if (v >= 0.7) return "bg-red-500/30 text-red-300"
  if (v >= 0.4) return "bg-amber-500/20 text-amber-300"
  if (v <= -0.7) return "bg-blue-500/30 text-blue-300"
  if (v <= -0.4) return "bg-cyan-500/20 text-cyan-300"
  return "bg-secondary/30 text-muted-foreground"
}

export function CorrelationMatrixPanel({ data }: { data: CorrelationMatrix | null }) {
  if (!data || data.assets.length === 0) return (
    <Card className={SC}><CardContent className="py-12 text-center text-sm text-muted-foreground">No open positions to analyze correlations.</CardContent></Card>
  )

  return (
    <div className="space-y-6">
      {data.warnings.length > 0 && (
        <div className="space-y-2">
          {data.warnings.map((w, i) => (
            <div key={i} className={`rounded-xl border p-3 text-xs ${w.severity === "warning" ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-blue-500/40 bg-blue-500/10 text-blue-200"}`}>
              {w.message}
            </div>
          ))}
        </div>
      )}

      <Card className={SC}>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Correlation Matrix</CardTitle>
          <CardDescription>Shows how your open positions are correlated. Red = high risk overlap.</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr><th className="p-2" />{data.assets.map(a => <th key={a} className="p-2 font-medium text-muted-foreground">{a}</th>)}</tr>
              </thead>
              <tbody>
                {data.assets.map(row => (
                  <tr key={row}>
                    <td className="p-2 font-medium text-muted-foreground">{row}</td>
                    {data.assets.map(col => {
                      if (row === col) return <td key={col} className="p-2"><div className="rounded-lg bg-primary/20 px-2 py-1 text-center font-bold text-primary">1.00</div></td>
                      const pair = data.pairs.find(p => (p.asset1 === row && p.asset2 === col) || (p.asset1 === col && p.asset2 === row))
                      const v = pair?.correlation ?? 0
                      return <td key={col} className="p-2"><div className={`rounded-lg px-2 py-1 text-center font-mono font-bold ${corrColor(v)}`}>{v.toFixed(2)}</div></td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500/30" /> Strong positive (≥0.7)</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-500/20" /> Moderate positive</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-secondary/30" /> Low</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-cyan-500/20" /> Moderate negative</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-500/30" /> Strong negative (≤-0.7)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

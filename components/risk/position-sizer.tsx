"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { fetchPositionSize, type PositionSizeResult, type RiskConfig } from "@/lib/risk-api"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"

export function PositionSizer({ config }: { config: RiskConfig | null }) {
  const [entry, setEntry] = useState("")
  const [sl, setSl] = useState("")
  const [result, setResult] = useState<PositionSizeResult | null>(null)
  const [loading, setLoading] = useState(false)

  const calculate = async () => {
    const e = parseFloat(entry), s = parseFloat(sl)
    if (!e || !s || e === s) return
    setLoading(true)
    try { setResult(await fetchPositionSize(e, s)) } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className={SC}>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Position Size Calculator</CardTitle>
          <CardDescription>Calculate optimal lot size based on your risk parameters</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Entry Price</label>
              <Input type="number" step="any" placeholder="1.08500" value={entry} onChange={e => setEntry(e.target.value)} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Stop Loss Price</label>
              <Input type="number" step="any" placeholder="1.08200" value={sl} onChange={e => setSl(e.target.value)} /></div>
          </div>
          <div className="rounded-xl bg-secondary/30 p-3 text-xs text-muted-foreground">
            <p>Account: <strong className="text-foreground">${config?.accountBalance.toLocaleString() ?? "10,000"}</strong></p>
            <p>Risk/Trade: <strong className="text-foreground">{config?.riskPerTradePercent ?? 1}%</strong></p>
          </div>
          <Button onClick={calculate} disabled={loading || !entry || !sl} className="w-full">{loading ? "Calculating..." : "Calculate Position Size"}</Button>
        </CardContent>
      </Card>
      <Card className={SC}>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Result</CardTitle></CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-3">
              {[
                { label: "Risk Amount", value: `$${result.riskAmount.toLocaleString()}` },
                { label: "Position Size", value: `${result.units.toLocaleString()} units` },
                { label: "Lot Size", value: `${result.lots} lots` },
                { label: "SL Distance", value: `${result.stopLossDistancePips.toFixed(1)} pips` },
                { label: "Account Balance", value: `$${result.accountBalance.toLocaleString()}` },
                { label: "Risk %", value: `${result.riskPercent}%` },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between rounded-xl bg-secondary/20 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className="text-sm font-bold text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Enter entry and stop loss prices to calculate</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

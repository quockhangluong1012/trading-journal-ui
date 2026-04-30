"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { RiskHeatmap } from "@/lib/risk-api"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"

export function RiskHeatmapPanel({ data }: { data: RiskHeatmap }) {
  if (data.byAsset.length === 0) return null

  const maxCount = Math.max(...data.byAsset.map(a => a.count), 1)
  const { byDirection: dir } = data

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className={SC}>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Exposure by Asset</CardTitle>
          <CardDescription>Open positions grouped by instrument</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {data.byAsset.map(a => (
            <div key={a.asset} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{a.asset}</span>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.direction === "Long" ? "bg-emerald-500/20 text-emerald-400" : a.direction === "Short" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>{a.direction}</span>
                  <span className="text-muted-foreground">{a.count} pos</span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary/40">
                <div className={`h-full rounded-full transition-all duration-700 ${a.pnl >= 0 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${(a.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={SC}>
        <CardHeader className="pb-2"><CardTitle className="text-lg">Direction Split</CardTitle>
          <CardDescription>Long vs Short exposure</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-8 py-6">
            <div className="text-center">
              <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                <span className="text-2xl font-bold text-emerald-400">{dir.longCount}</span>
              </div>
              <p className="text-xs font-medium text-emerald-400">Long</p>
              <p className="text-[10px] text-muted-foreground">${dir.longPnl.toLocaleString()}</p>
            </div>
            <div className="text-3xl font-light text-muted-foreground/30">vs</div>
            <div className="text-center">
              <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10">
                <span className="text-2xl font-bold text-red-400">{dir.shortCount}</span>
              </div>
              <p className="text-xs font-medium text-red-400">Short</p>
              <p className="text-[10px] text-muted-foreground">${dir.shortPnl.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-secondary/20 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">Total Floating P&L</span>
            <span className={`text-sm font-bold ${data.totalExposure >= 0 ? "text-emerald-400" : "text-red-400"}`}>${data.totalExposure.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

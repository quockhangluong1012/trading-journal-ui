"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RiskDashboard } from "@/lib/risk-api"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"

function GaugeRing({ value, max, label, color, size = 140 }: { value: number; max: number; label: string; color: string; size?: number }) {
  const pct = Math.min(value, max) / max
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const severity = pct >= 1 ? "text-red-400" : pct >= 0.75 ? "text-amber-400" : "text-emerald-400"

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={8} className="text-secondary/60" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={8} strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" className={`${color} transition-all duration-1000 ease-out`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${severity}`}>{value.toFixed(0)}%</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">used</span>
        </div>
      </div>
      <p className="text-center text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/20 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-xs font-bold text-foreground">{value}</span>
        {sub && <span className="ml-1.5 text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  )
}

export function RiskGauges({ dashboard: d }: { dashboard: RiskDashboard }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className={SC}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-foreground">Risk Limit Gauges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-8 py-4">
            <GaugeRing value={d.dailyLimitUsedPercent} max={100} label={`Daily Loss Limit (${d.dailyLossLimitPercent}%)`}
              color={d.isDailyLimitBreached ? "text-red-500" : d.dailyLimitUsedPercent >= 75 ? "text-amber-500" : "text-emerald-500"} />
            <GaugeRing value={d.weeklyCapUsedPercent} max={100} label={`Weekly Drawdown Cap (${d.weeklyDrawdownCapPercent}%)`}
              color={d.isWeeklyCapBreached ? "text-red-500" : d.weeklyCapUsedPercent >= 75 ? "text-amber-500" : "text-emerald-500"} />
          </div>
        </CardContent>
      </Card>

      <Card className={SC}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-foreground">Today&apos;s Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <StatRow label="Trades Taken" value={String(d.todayTradeCount)} />
          <StatRow label="Wins / Losses" value={`${d.todayWins}W / ${d.todayLosses}L`} />
          <StatRow label="Daily P&L" value={`$${d.dailyPnl.toLocaleString()}`} sub={`(${d.dailyPnlPercent.toFixed(2)}%)`} />
          <StatRow label="Weekly P&L" value={`$${d.weeklyPnl.toLocaleString()}`} sub={`(${d.weeklyPnlPercent.toFixed(2)}%)`} />
          <StatRow label="Week Trades" value={String(d.weekTradeCount)} />
          <StatRow label="Open Positions" value={`${d.openPositionCount} / ${d.maxOpenPositions}`} />
        </CardContent>
      </Card>
    </div>
  )
}

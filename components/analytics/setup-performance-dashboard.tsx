"use client"

import { useState } from "react"
import { Award, TrendingUp, TrendingDown, Target, Zap, Clock, ArrowUpRight, BarChart3, ChevronDown, ChevronUp, Layers } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { SetupPerformance } from "@/lib/analytics-api"

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v)

const GRADE_CONFIG: Record<string, { bg: string; text: string; border: string; glow: string; label: string }> = {
  "A":   { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/10", label: "Excellent" },
  "B":   { bg: "bg-sky-500/15",     text: "text-sky-400",     border: "border-sky-500/30",     glow: "shadow-sky-500/10",     label: "Good" },
  "C":   { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/30",   glow: "shadow-amber-500/10",   label: "Average" },
  "D":   { bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/30",  glow: "shadow-orange-500/10",  label: "Poor" },
  "F":   { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30",     glow: "shadow-red-500/10",     label: "Failing" },
  "N/A": { bg: "bg-zinc-500/15",    text: "text-zinc-400",    border: "border-zinc-500/30",    glow: "shadow-zinc-500/10",    label: "Insufficient Data" },
}

function GradeBadge({ grade }: { grade: string }) {
  const config = GRADE_CONFIG[grade] ?? GRADE_CONFIG["N/A"]
  return (
    <div className={cn("flex items-center gap-2 rounded-2xl border px-3 py-1.5 shadow-lg", config.bg, config.border, config.glow)}>
      <span className={cn("text-2xl font-black tracking-tight", config.text)}>{grade}</span>
      <span className={cn("text-[10px] font-semibold uppercase tracking-wider", config.text)}>{config.label}</span>
    </div>
  )
}

function StatRow({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/20 px-3 py-2 transition-colors hover:bg-secondary/30">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-foreground">{value}</span>
        {good !== undefined && (
          <div className={cn("h-1.5 w-1.5 rounded-full", good ? "bg-emerald-500" : "bg-red-500")} />
        )}
      </div>
    </div>
  )
}

function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses
  const winPct = total > 0 ? (wins / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
        <span>{wins}W</span>
        <span>{losses}L</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-secondary/40">
        <div className="rounded-l-full bg-emerald-500 transition-all duration-700" style={{ width: `${winPct}%` }} />
        <div className="rounded-r-full bg-red-500/70 transition-all duration-700" style={{ width: `${100 - winPct}%` }} />
      </div>
    </div>
  )
}

function SetupCard({ setup, rank }: { setup: SetupPerformance; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  const isProfit = setup.totalPnl >= 0
  const gradeConfig = GRADE_CONFIG[setup.grade] ?? GRADE_CONFIG["N/A"]

  return (
    <Card
      className={cn(
        "group overflow-hidden border-border/70 bg-linear-to-b from-card to-card/80 shadow-sm transition-all duration-300 hover:shadow-md",
        rank === 1 && "ring-1 ring-amber-500/20"
      )}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4">
          {/* Rank badge */}
          <div className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-secondary/50 text-xs font-bold text-muted-foreground">
            #{rank}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold tracking-tight text-foreground pr-10">{setup.setupName}</h3>
              <p className="text-xs text-muted-foreground">{setup.totalTrades} trades</p>
            </div>

            <div className="flex items-center gap-3">
              <GradeBadge grade={setup.grade} />
            </div>

            {/* Key metrics row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">P&L</p>
                <p className={cn("text-lg font-semibold", isProfit ? "text-emerald-400" : "text-red-400")}>
                  {fmt(setup.totalPnl)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Win Rate</p>
                <p className={cn("text-lg font-semibold", setup.winRate >= 50 ? "text-emerald-400" : "text-red-400")}>
                  {setup.winRate.toFixed(1)}%
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Profit Factor</p>
                <p className={cn("text-lg font-semibold",
                  setup.profitFactor >= 1.5 ? "text-emerald-400" : setup.profitFactor >= 1 ? "text-amber-400" : "text-red-400"
                )}>
                  {setup.profitFactor >= 1e15 ? "∞" : setup.profitFactor.toFixed(2)}
                </p>
              </div>
            </div>

            <WinLossBar wins={setup.wins} losses={setup.losses} />
          </div>
        </div>

        {/* Expandable details */}
        <div className="border-t border-border/50">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/20 hover:text-foreground"
          >
            {expanded ? "Less details" : "More details"}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expanded && (
            <div className="space-y-2 px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-200">
              <StatRow label="Expectancy" value={fmt(setup.expectancy)} good={setup.expectancy > 0} />
              <StatRow label="Avg Win" value={fmt(setup.avgWin)} />
              <StatRow label="Avg Loss" value={fmt(setup.avgLoss)} />
              <StatRow label="Avg P&L / Trade" value={fmt(setup.avgPnl)} good={setup.avgPnl > 0} />
              <StatRow label="Largest Win" value={fmt(setup.largestWin)} />
              <StatRow label="Largest Loss" value={fmt(setup.largestLoss)} />
              <StatRow label="Avg R:R" value={`${setup.avgRiskReward.toFixed(1)}:1`} good={setup.avgRiskReward >= 2} />
              <StatRow label="Avg Hold Time" value={`${setup.avgHoldingDays.toFixed(0)} days`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SetupComparisonTable({ setups }: { setups: SetupPerformance[] }) {
  if (setups.length === 0) return null

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          Setup Comparison
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Side-by-side metrics for all your trading setups
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/20">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Setup</th>
                <th className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Grade</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trades</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Win Rate</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">P&L</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PF</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expectancy</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">R:R</th>
              </tr>
            </thead>
            <tbody>
              {setups.map((s, i) => {
                const gc = GRADE_CONFIG[s.grade] ?? GRADE_CONFIG["N/A"]
                return (
                  <tr key={s.setupId} className={cn("border-b border-border/30 transition-colors hover:bg-secondary/10", i % 2 === 0 && "bg-secondary/5")}>
                    <td className="px-4 py-3 font-medium text-foreground">{s.setupName}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn("inline-flex rounded-lg px-2 py-0.5 text-xs font-bold", gc.bg, gc.text, "border", gc.border)}>
                        {s.grade}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{s.totalTrades}</td>
                    <td className={cn("px-3 py-3 text-right font-medium", s.winRate >= 50 ? "text-emerald-400" : "text-red-400")}>
                      {s.winRate.toFixed(1)}%
                    </td>
                    <td className={cn("px-3 py-3 text-right font-medium", s.totalPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {fmt(s.totalPnl)}
                    </td>
                    <td className={cn("px-3 py-3 text-right", s.profitFactor >= 1.5 ? "text-emerald-400" : s.profitFactor >= 1 ? "text-amber-400" : "text-red-400")}>
                      {s.profitFactor >= 1e15 ? "∞" : s.profitFactor.toFixed(2)}
                    </td>
                    <td className={cn("px-3 py-3 text-right", s.expectancy > 0 ? "text-emerald-400" : "text-red-400")}>
                      {fmt(s.expectancy)}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{s.avgRiskReward.toFixed(1)}:1</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryStats({ setups }: { setups: SetupPerformance[] }) {
  if (setups.length === 0) return null

  const totalTrades = setups.reduce((sum, s) => sum + s.totalTrades, 0)
  const totalPnl = setups.reduce((sum, s) => sum + s.totalPnl, 0)
  const bestSetup = setups.reduce((best, s) => (s.totalPnl > best.totalPnl ? s : best), setups[0])
  const worstSetup = setups.reduce((worst, s) => (s.totalPnl < worst.totalPnl ? s : worst), setups[0])
  const aGradeCount = setups.filter(s => s.grade === "A" || s.grade === "B").length

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden border-border/70 bg-linear-to-b from-card to-card/80 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Active Setups</p>
              <p className="text-2xl font-semibold tracking-tight text-primary">{setups.length}</p>
              <p className="text-xs text-muted-foreground">{totalTrades} total trades</p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2.5 shadow-sm">
              <Layers className="h-4 w-4 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 bg-linear-to-b from-card to-card/80 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Best Setup</p>
              <p className="text-2xl font-semibold tracking-tight text-emerald-400">{fmt(bestSetup.totalPnl)}</p>
              <p className="text-xs text-muted-foreground truncate">{bestSetup.setupName}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 shadow-sm">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 bg-linear-to-b from-card to-card/80 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Worst Setup</p>
              <p className="text-2xl font-semibold tracking-tight text-red-400">{fmt(worstSetup.totalPnl)}</p>
              <p className="text-xs text-muted-foreground truncate">{worstSetup.setupName}</p>
            </div>
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-2.5 shadow-sm">
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 bg-linear-to-b from-card to-card/80 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">A/B Grade Setups</p>
              <p className="text-2xl font-semibold tracking-tight text-sky-400">{aGradeCount}/{setups.length}</p>
              <p className="text-xs text-muted-foreground">
                {setups.length > 0 ? `${((aGradeCount / setups.length) * 100).toFixed(0)}% profitable` : "No data"}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-2.5 shadow-sm">
              <Award className="h-4 w-4 text-sky-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-3xl border border-border/50 bg-secondary/30 p-6 mb-4">
          <Target className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No setup performance data</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Link your trades to setups when creating them to see performance metrics here.
          This helps you identify which of your strategies actually make money.
        </p>
      </CardContent>
    </Card>
  )
}

export function SetupPerformanceDashboard({ data, isLoading }: { data: SetupPerformance[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="h-4 w-24 rounded-md bg-secondary/50 animate-pulse" />
                <div className="mt-3 h-8 w-28 rounded-md bg-secondary/50 animate-pulse" />
                <div className="mt-3 h-3 w-32 rounded-md bg-secondary/50 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="p-5">
                <div className="h-6 w-40 rounded-md bg-secondary/50 animate-pulse" />
                <div className="mt-4 h-32 w-full rounded-xl bg-secondary/50 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      <SummaryStats setups={data} />

      {/* Setup Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((setup, i) => (
          <SetupCard key={setup.setupId} setup={setup} rank={i + 1} />
        ))}
      </div>

      {/* Comparison Table */}
      <SetupComparisonTable setups={data} />
    </div>
  )
}

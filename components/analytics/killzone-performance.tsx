"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Clock, Target, TrendingDown, TrendingUp, Award, Zap, ArrowUpRight, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  fetchKillzonePerformance,
  type AnalyticsFilter,
  type KillzonePerformance,
  type KillzonePerformanceResponse,
  type DayZoneHeatmapCell,
} from "@/lib/analytics-api"

const ZONE_COLORS: Record<string, { text: string; bg: string; border: string; bar: string }> = {
  "Asian": { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", bar: "bg-blue-500" },
  "London": { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", bar: "bg-orange-500" },
  "New York": { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", bar: "bg-red-500" },
  "London Close": { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", bar: "bg-purple-500" },
  "Silver Bullet": { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", bar: "bg-cyan-500" },
}

function getZoneColors(zoneName: string) {
  const match = Object.entries(ZONE_COLORS).find(([key]) => zoneName.toLowerCase().includes(key.toLowerCase()))
  return match?.[1] ?? { text: "text-accent", bg: "bg-accent/10", border: "border-accent/30", bar: "bg-accent" }
}

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  C: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  D: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  F: "bg-red-500/20 text-red-400 border-red-500/30",
  "N/A": "bg-muted text-muted-foreground border-border",
}

function fmt(n: number) { return n >= 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}` }
function pct(n: number) { return `${n.toFixed(1)}%` }

// ── Zone Performance Cards ──

function ZoneCard({ zone }: { zone: KillzonePerformance }) {
  const colors = getZoneColors(zone.zoneName)
  const gradeColor = GRADE_COLORS[zone.grade] ?? GRADE_COLORS["N/A"]

  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-all hover:shadow-md",
      colors.border, colors.bg
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className={cn("h-4 w-4", colors.text)} />
          <div>
            <h4 className={cn("text-sm font-semibold", colors.text)}>{zone.zoneName}</h4>
            {zone.timeWindow && (
              <p className="text-[10px] text-muted-foreground">{zone.timeWindow}</p>
            )}
          </div>
        </div>
        <Badge variant="outline" className={cn("text-[10px] font-bold", gradeColor)}>
          {zone.grade}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl bg-background/50 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Win Rate</p>
          <p className={cn("text-sm font-bold", zone.winRate >= 50 ? "text-emerald-400" : "text-red-400")}>
            {pct(zone.winRate)}
          </p>
          <p className="text-[10px] text-muted-foreground">{zone.wins}W / {zone.losses}L</p>
        </div>
        <div className="rounded-xl bg-background/50 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Total P&L</p>
          <p className={cn("text-sm font-bold", zone.totalPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
            {fmt(zone.totalPnl)}
          </p>
          <p className="text-[10px] text-muted-foreground">{zone.totalTrades} trades</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="space-y-1.5">
        {[
          { label: "Profit Factor", value: zone.profitFactor >= 1e15 ? "∞" : zone.profitFactor.toFixed(2), good: zone.profitFactor >= 1.5 },
          { label: "Expectancy", value: fmt(zone.expectancy), good: zone.expectancy > 0 },
          { label: "Avg R:R", value: `${zone.avgRiskReward.toFixed(1)}:1`, good: zone.avgRiskReward >= 2 },
          { label: "Best Day", value: zone.bestDay, good: true },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-lg bg-background/30 px-2.5 py-1.5">
            <span className="text-[10px] text-muted-foreground">{row.label}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-foreground">{row.value}</span>
              <div className={cn("h-1.5 w-1.5 rounded-full", row.good ? "bg-emerald-500" : "bg-red-500")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Day × Zone Heatmap ──

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]

function DayZoneHeatmap({ heatmap, zones }: { heatmap: DayZoneHeatmapCell[]; zones: KillzonePerformance[] }) {
  const zoneNames = zones.map((z) => z.zoneName)

  // Build lookup: day -> zone -> cell
  const lookup = new Map<string, Map<string, DayZoneHeatmapCell>>()
  for (const cell of heatmap) {
    if (!lookup.has(cell.day)) lookup.set(cell.day, new Map())
    lookup.get(cell.day)!.set(cell.zone, cell)
  }

  // Find max absolute PnL for color scaling
  const maxPnl = Math.max(1, ...heatmap.map((c) => Math.abs(c.pnl)))

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Day</th>
            {zoneNames.map((name) => {
              const colors = getZoneColors(name)
              return (
                <th key={name} className={cn("px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider", colors.text)}>
                  {name.replace(" Killzone", "").replace(" Kill Zone", "")}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <tr key={day} className="border-t border-border/30">
              <td className="px-3 py-2 text-xs font-medium text-foreground">{day}</td>
              {zoneNames.map((zone) => {
                const cell = lookup.get(day)?.get(zone)
                if (!cell || cell.count === 0) {
                  return (
                    <td key={zone} className="px-3 py-2 text-center">
                      <div className="rounded-lg bg-secondary/20 px-2 py-1.5 text-[10px] text-muted-foreground">—</div>
                    </td>
                  )
                }

                const intensity = Math.min(Math.abs(cell.pnl) / maxPnl, 1)
                const isPositive = cell.pnl >= 0
                const bgColor = isPositive
                  ? `rgba(34, 197, 94, ${0.1 + intensity * 0.3})`
                  : `rgba(239, 68, 68, ${0.1 + intensity * 0.3})`

                return (
                  <td key={zone} className="px-2 py-1.5 text-center">
                    <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <div
                            className="cursor-default rounded-lg border border-border/30 px-2 py-1.5 transition-all hover:scale-105"
                            style={{ backgroundColor: bgColor }}
                          >
                            <p className={cn("text-xs font-bold", isPositive ? "text-emerald-400" : "text-red-400")}>
                              {fmt(cell.pnl)}
                            </p>
                            <p className="text-[9px] text-muted-foreground">{cell.count} trades</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-semibold">{day} · {zone}</p>
                          <p>P&L: {fmt(cell.pnl)}</p>
                          <p>Win Rate: {pct(cell.winRate)}</p>
                          <p>Trades: {cell.count}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Win Rate Comparison Bar ──

function WinRateComparison({ zones }: { zones: KillzonePerformance[] }) {
  if (zones.length === 0) return null
  const maxTrades = Math.max(...zones.map((z) => z.totalTrades))

  return (
    <div className="space-y-3">
      {zones.map((zone) => {
        const colors = getZoneColors(zone.zoneName)
        const widthPct = maxTrades > 0 ? (zone.totalTrades / maxTrades) * 100 : 0

        return (
          <div key={zone.zoneId} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", colors.bar)} />
                <span className="text-xs font-medium text-foreground">
                  {zone.zoneName.replace(" Killzone", "").replace(" Kill Zone", "")}
                </span>
                <span className="text-[10px] text-muted-foreground">({zone.totalTrades})</span>
              </div>
              <span className={cn("text-xs font-bold", zone.winRate >= 50 ? "text-emerald-400" : "text-red-400")}>
                {pct(zone.winRate)}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-secondary/40">
              <div
                className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", colors.bar)}
                style={{ width: `${Math.max(widthPct, 4)}%`, opacity: 0.7 }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/80 transition-all duration-500"
                style={{ width: `${Math.max(widthPct * (zone.winRate / 100), 2)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ──

interface KillzonePerformanceDashboardProps {
  filter: AnalyticsFilter
}

export function KillzonePerformanceDashboard({ filter }: KillzonePerformanceDashboardProps) {
  const [data, setData] = useState<KillzonePerformanceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await fetchKillzonePerformance(filter)
      setData(result)
    } catch (err) {
      console.error("Failed to load killzone performance:", err)
      setError("Could not load killzone analytics.")
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => { void loadData() }, [loadData])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-border/50 bg-secondary/20" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-border/50 bg-secondary/20" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-50 flex-col items-center justify-center gap-2 text-center">
        <Clock className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{error ?? "No killzone data available."}</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Start logging trades with trading zones to see your killzone performance breakdown.
        </p>
      </div>
    )
  }

  if (data.zones.length === 0) {
    return (
      <div className="flex h-50 flex-col items-center justify-center gap-2 text-center">
        <Clock className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No killzone data yet.</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Assign trading zones when logging trades to unlock killzone performance analytics.
        </p>
      </div>
    )
  }

  // Find best and worst killzones
  const bestZone = data.zones.reduce((a, b) => a.winRate > b.winRate ? a : b)
  const worstZone = data.zones.reduce((a, b) => a.winRate < b.winRate ? a : b)

  return (
    <div className="space-y-6">
      {/* Quick Insight Banner */}
      {data.zones.length >= 2 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400">
              <span className="font-semibold">{bestZone.zoneName}</span> is your best killzone at {pct(bestZone.winRate)} WR
            </span>
          </div>
          {worstZone.zoneId !== bestZone.zoneId && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
              <TrendingDown className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs text-amber-400">
                <span className="font-semibold">{worstZone.zoneName}</span> needs work — {pct(worstZone.winRate)} WR
              </span>
            </div>
          )}
        </div>
      )}

      {/* Zone Performance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.zones.map((zone) => (
          <ZoneCard key={zone.zoneId} zone={zone} />
        ))}
      </div>

      {/* Bottom Row: Heatmap + Win Rate Bars */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Heatmap */}
        <Card className="rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm shadow-sm lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Calendar className="h-4 w-4 text-accent" />
              Day × Killzone Heatmap
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Identify your most profitable day and killzone combinations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DayZoneHeatmap heatmap={data.heatmap} zones={data.zones} />
          </CardContent>
        </Card>

        {/* Win Rate Comparison */}
        <Card className="rounded-2xl border-border/60 bg-card/50 backdrop-blur-sm shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Target className="h-4 w-4 text-primary" />
              Win Rate by Killzone
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Compare your edge across sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WinRateComparison zones={data.zones} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

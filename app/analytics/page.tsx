"use client"

import { type ElementType, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Info,
  Layers,
  Lightbulb,
  PieChart as PieChartIcon,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import {
  AnalyticsCommandCenter,
  type AnalyticsTabValue,
} from "@/components/analytics/analytics-command-center"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  AnalyticsFilter,
  FILTER_LABELS,
  fetchAssetBreakdown,
  fetchDayOfWeekBreakdown,
  fetchEquityCurve,
  fetchInsights,
  fetchMonthlyReturns,
  fetchPerformanceSummary,
  type AssetBreakdown as AssetBreakdownType,
  type DayOfWeekBreakdown as DayBreakdownType,
  type EquityPoint,
  type Insight,
  type MonthlyReturn,
  type PerformanceSummary,
} from "@/lib/analytics-api"

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value)

const pct = (value: number) => `${value.toFixed(1)}%`

const TIME_RANGES = [
  { label: "1W" },
  { label: "1M" },
  { label: "3M" },
  { label: "6M" },
  { label: "All" },
] as const

const ANALYTICS_TABS = ["overview", "performance", "breakdown", "insights"] as const
const ANALYTICS_RANGE_STORAGE_KEY = "trading-journal-analytics-range"
const ANALYTICS_TAB_STORAGE_KEY = "trading-journal-analytics-tab"
const SURFACE_CARD_CLASS = "border-border/70 bg-card/95 shadow-sm"

type AnalyticsRangeLabel = (typeof TIME_RANGES)[number]["label"]

interface AnalyticsViewState {
  analytics: PerformanceSummary
  monthlyData: MonthlyReturn[]
  assetData: AssetBreakdownType[]
  dayData: DayBreakdownType[]
  equityData: EquityPoint[]
  insightsData: Insight[]
  isLoading: boolean
  isRefreshing: boolean
  lastUpdatedAt: Date | null
  syncWarning: string | null
}

function isAnalyticsRangeLabel(value: string | null): value is AnalyticsRangeLabel {
  return TIME_RANGES.some((range) => range.label === value)
}

function isAnalyticsTabValue(value: string | null): value is AnalyticsTabValue {
  return ANALYTICS_TABS.some((tab) => tab === value)
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-foreground",
  bgColor = "border border-border/60 bg-secondary/30",
}: {
  label: string
  value: string
  sub?: string
  icon: ElementType
  color?: string
  bgColor?: string
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-linear-to-b from-card to-card/80 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            <p className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</p>
            {sub ? <p className="text-xs leading-relaxed text-muted-foreground">{sub}</p> : null}
          </div>
          <div className={cn("rounded-2xl p-2.5 shadow-sm", bgColor)}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EquityCurveChart({ data }: { data: EquityPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-70 items-center justify-center text-sm text-muted-foreground">
        No closed trades in this period
      </div>
    )
  }

  return (
    <ChartContainer config={{ profit: { label: "Equity", color: "#22c55e" } }} className="h-70">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          }
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "#374151" }}
        />
        <YAxis
          tickFormatter={(value) => `$${value.toLocaleString()}`}
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => fmt(value as number)}
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              }
            />
          }
        />
        <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fill="url(#eqGrad)" />
      </AreaChart>
    </ChartContainer>
  )
}

function MonthlyReturnsChart({ data }: { data: MonthlyReturn[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        No monthly data yet
      </div>
    )
  }

  return (
    <ChartContainer config={{ pnl: { label: "PnL", color: "#22c55e" } }} className="h-60">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={(value) => {
            const [year, month] = value.split("-")
            const monthLabel = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number.parseInt(month, 10) - 1]
            return `${monthLabel} '${year.slice(2)}`
          }}
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "#374151" }}
        />
        <YAxis
          tickFormatter={(value) => `$${value.toLocaleString()}`}
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(value as number)} />} />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]} fill="#22c55e">
          {data.map((item, index) => (
            <Cell key={index} fill={item.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function AssetPerformanceChart({ data }: { data: AssetBreakdownType[] }) {
  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]

  if (data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        No asset data
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ChartContainer config={{ pnl: { label: "PnL", color: "#22c55e" } }} className="h-50">
        <PieChart>
          <Pie
            data={data.map((item) => ({ ...item, absPnl: Math.abs(item.pnl) }))}
            dataKey="absPnl"
            nameKey="asset"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <ReTooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "var(--popover-foreground)",
            }}
            formatter={(_value, name) => [fmt(data.find((item) => item.asset === String(name))?.pnl ?? 0), String(name)]}
          />
        </PieChart>
      </ChartContainer>
      <div className="space-y-1.5">
        {data.map((item, index) => (
          <div key={item.asset} className="flex items-center justify-between rounded-xl bg-secondary/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="text-xs font-medium text-foreground">{item.asset}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground">{item.count} trades</span>
              <span className="text-[10px] text-muted-foreground">{item.winRate}% WR</span>
              <span className={`text-xs font-medium ${item.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmt(item.pnl)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DayOfWeekChart({ data }: { data: DayBreakdownType[] }) {
  return (
    <ChartContainer config={{ pnl: { label: "PnL", color: "#22c55e" } }} className="h-50">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tickFormatter={(value) => `$${value}`} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={55} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(value as number)} />} />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {data.map((item, index) => (
            <Cell key={index} fill={item.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function PerformanceRadar({ analytics }: { analytics: PerformanceSummary }) {
  const data = useMemo(
    () => [
      { metric: "Win Rate", value: Math.min(analytics.winRate, 100), fullMark: 100 },
      { metric: "Profit Factor", value: Math.min(analytics.profitFactor * 25, 100), fullMark: 100 },
      { metric: "R:R Ratio", value: Math.min(analytics.avgRiskReward * 20, 100), fullMark: 100 },
      { metric: "Sharpe", value: Math.min(Math.max(analytics.sharpeRatio * 25, 0), 100), fullMark: 100 },
      { metric: "Consistency", value: Math.min(100 - analytics.maxDrawdownPct, 100), fullMark: 100 },
      { metric: "Discipline", value: Math.min(analytics.consecutiveWins * 15 + 30, 100), fullMark: 100 },
    ],
    [analytics],
  )

  return (
    <ChartContainer config={{ value: { label: "Score", color: "#22c55e" } }} className="h-65">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#9ca3af", fontSize: 10 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Performance" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
      </RadarChart>
    </ChartContainer>
  )
}

function InsightsPanel({ insights }: { insights: Insight[] }) {
  const iconMap = { success: CheckCircle2, warning: AlertTriangle, info: Info }
  const colorMap = {
    success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => {
        const Icon = iconMap[insight.type]
        const colors = colorMap[insight.type]

        return (
          <div key={index} className={`rounded-2xl border px-4 py-3.5 shadow-sm ${colors}`}>
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="mt-1 text-xs leading-relaxed opacity-80">{insight.description}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DrawdownChart({ equityData }: { equityData: EquityPoint[] }) {
  const data = useMemo(() => {
    let peak = 0

    return equityData.map((point) => {
      if (point.profit > peak) {
        peak = point.profit
      }

      return {
        date: point.date,
        drawdown: -(peak - point.profit),
      }
    })
  }, [equityData])

  if (data.length === 0) {
    return (
      <div className="flex h-50 items-center justify-center text-sm text-muted-foreground">
        No drawdown data
      </div>
    )
  }

  return (
    <ChartContainer config={{ drawdown: { label: "Drawdown", color: "#ef4444" } }} className="h-50">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          }
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "#374151" }}
        />
        <YAxis tickFormatter={(value) => `$${value}`} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => fmt(value as number)} />} />
        <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} fill="url(#ddGrad)" />
      </AreaChart>
    </ChartContainer>
  )
}

function WinLossDistribution({ equityData }: { equityData: EquityPoint[] }) {
  const data = useMemo(() => {
    const pnls: number[] = []

    for (let index = 0; index < equityData.length; index += 1) {
      if (index === 0) {
        pnls.push(equityData[index].profit)
      } else {
        pnls.push(equityData[index].profit - equityData[index - 1].profit)
      }
    }

    const step = 1000
    const buckets: Record<string, number> = {}

    pnls.forEach((pnl) => {
      const bucket = Math.floor(pnl / step) * step
      const key = `${bucket >= 0 ? "+" : ""}${bucket}`
      buckets[key] = (buckets[key] || 0) + 1
    })

    return Object.entries(buckets)
      .map(([range, count]) => ({ range, count, pnl: Number.parseInt(range, 10) }))
      .sort((left, right) => left.pnl - right.pnl)
  }, [equityData])

  if (data.length === 0) {
    return (
      <div className="flex h-50 items-center justify-center text-sm text-muted-foreground">
        No distribution data
      </div>
    )
  }

  return (
    <ChartContainer config={{ count: { label: "Trades", color: "#22c55e" } }} className="h-50">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="range" tick={{ fill: "#9ca3af", fontSize: 9 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((item, index) => (
            <Cell key={index} fill={item.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function ExportButton({
  analytics,
  monthlyData,
  assetData,
  insightsData,
}: {
  analytics: PerformanceSummary
  monthlyData: MonthlyReturn[]
  assetData: AssetBreakdownType[]
  insightsData: Insight[]
}) {
  const handleExport = useCallback(() => {
    const lines = [
      "TRADING ANALYTICS REPORT",
      `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      "",
      "=== PERFORMANCE SUMMARY ===",
      `Total P&L: ${fmt(analytics.totalPnl)}`,
      `Win Rate: ${pct(analytics.winRate)}`,
      `Total Trades: ${analytics.totalClosed} (${analytics.wins}W / ${analytics.losses}L)`,
      `Profit Factor: ${analytics.profitFactor.toFixed(2)}`,
      `Expectancy: ${fmt(analytics.expectancy)}`,
      `Sharpe Ratio: ${analytics.sharpeRatio.toFixed(2)}`,
      `Max Drawdown: ${fmt(analytics.maxDrawdown)} (${pct(analytics.maxDrawdownPct)})`,
      `Avg Win: ${fmt(analytics.avgWin)}`,
      `Avg Loss: ${fmt(analytics.avgLoss)}`,
      `Largest Win: ${fmt(analytics.largestWin)}`,
      `Largest Loss: ${fmt(analytics.largestLoss)}`,
      `Avg Holding: ${analytics.avgHoldingDays.toFixed(1)} days`,
      `Avg R:R: ${analytics.avgRiskReward.toFixed(2)}:1`,
      `Consecutive Wins: ${analytics.consecutiveWins}`,
      `Consecutive Losses: ${analytics.consecutiveLosses}`,
      `Longs Win Rate: ${pct(analytics.longsWinRate)}`,
      `Shorts Win Rate: ${pct(analytics.shortsWinRate)}`,
      "",
      "=== MONTHLY RETURNS ===",
      ...monthlyData.map((item) => `${item.month}: ${fmt(item.pnl)}`),
      "",
      "=== ASSET BREAKDOWN ===",
      ...assetData.map((item) => `${item.asset}: ${fmt(item.pnl)} (${item.count} trades, ${item.winRate}% WR)`),
      "",
      "=== INSIGHTS & RECOMMENDATIONS ===",
      ...insightsData.map((insight) => `[${insight.type.toUpperCase()}] ${insight.title}: ${insight.description}`),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")

    anchor.href = url
    anchor.download = `trading-analytics-${new Date().toISOString().split("T")[0]}.txt`
    anchor.click()

    URL.revokeObjectURL(url)
  }, [analytics, assetData, insightsData, monthlyData])

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
      <Download className="h-3.5 w-3.5" />
      Export report
    </Button>
  )
}

function LongShortSplit({ analytics }: { analytics: PerformanceSummary }) {
  const rows = [
    {
      label: "Longs",
      value: analytics.longsWinRate,
      barClassName: "bg-emerald-500/80",
      textClassName: "text-emerald-400",
    },
    {
      label: "Shorts",
      value: analytics.shortsWinRate,
      barClassName: "bg-red-500/80",
      textClassName: "text-red-400",
    },
  ]

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{row.label}</span>
            <span className={`font-semibold ${row.textClassName}`}>{pct(row.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary/60">
            <div
              className={`h-full rounded-full ${row.barClassName}`}
              style={{ width: `${Math.max(0, Math.min(row.value, 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function SessionBreakdownPlaceholder() {
  return (
    <div className="flex h-50 flex-col items-center justify-center gap-2 text-center">
      <Clock className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">Session analytics are next.</p>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        Asia, London, and New York splits will appear here once session-based analytics are exposed from the backend.
      </p>
    </div>
  )
}

function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-background via-background to-primary/5 shadow-sm">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.45fr)_360px] lg:px-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-40 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-36 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-10 w-72 rounded-xl" />
              <Skeleton className="h-5 w-full max-w-2xl rounded-md" />
              <Skeleton className="h-4 w-full max-w-3xl rounded-md" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 w-60 rounded-2xl" />
              <Skeleton className="h-9 w-32 rounded-xl" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/85 p-5 shadow-sm backdrop-blur-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <Skeleton className="h-3 w-20 rounded-md" />
                  <Skeleton className="mt-3 h-7 w-24 rounded-md" />
                  <Skeleton className="mt-2 h-3 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className={SURFACE_CARD_CLASS}>
            <CardContent className="pt-5 pb-4">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="mt-3 h-8 w-28 rounded-md" />
              <Skeleton className="mt-3 h-3 w-32 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={SURFACE_CARD_CLASS}>
          <CardContent className="pt-6">
            <Skeleton className="h-70 w-full rounded-2xl" />
          </CardContent>
        </Card>
        <Card className={SURFACE_CARD_CLASS}>
          <CardContent className="pt-6">
            <Skeleton className="h-70 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const emptyAnalytics: PerformanceSummary = {
  totalPnl: 0,
  winRate: 0,
  wins: 0,
  losses: 0,
  totalClosed: 0,
  avgWin: 0,
  avgLoss: 0,
  largestWin: 0,
  largestLoss: 0,
  profitFactor: 0,
  expectancy: 0,
  maxDrawdown: 0,
  maxDrawdownPct: 0,
  sharpeRatio: 0,
  avgHoldingDays: 0,
  longsWinRate: 0,
  shortsWinRate: 0,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  avgRiskReward: 0,
}

const initialViewState: AnalyticsViewState = {
  analytics: emptyAnalytics,
  monthlyData: [],
  assetData: [],
  dayData: [],
  equityData: [],
  insightsData: [],
  isLoading: true,
  isRefreshing: false,
  lastUpdatedAt: null,
  syncWarning: null,
}

function AnalyticsContent() {
  const [range, setRange] = useState<AnalyticsRangeLabel>("All")
  const [activeTab, setActiveTab] = useState<AnalyticsTabValue>("overview")
  const [viewState, setViewState] = useState<AnalyticsViewState>(initialViewState)
  const requestIdRef = useRef(0)

  useEffect(() => {
    try {
      const storedRange = window.localStorage.getItem(ANALYTICS_RANGE_STORAGE_KEY)
      const storedTab = window.localStorage.getItem(ANALYTICS_TAB_STORAGE_KEY)

      if (isAnalyticsRangeLabel(storedRange)) {
        setRange(storedRange)
      }

      if (isAnalyticsTabValue(storedTab)) {
        setActiveTab(storedTab)
      }
    } catch {
      // Ignore storage access failures.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(ANALYTICS_RANGE_STORAGE_KEY, range)
    } catch {
      // Ignore storage access failures.
    }
  }, [range])

  useEffect(() => {
    try {
      window.localStorage.setItem(ANALYTICS_TAB_STORAGE_KEY, activeTab)
    } catch {
      // Ignore storage access failures.
    }
  }, [activeTab])

  const loadAnalytics = useCallback(async (nextRange: AnalyticsRangeLabel) => {
    requestIdRef.current += 1
    const currentRequestId = requestIdRef.current

    setViewState((previous) => ({
      ...previous,
      isLoading: previous.lastUpdatedAt === null,
      isRefreshing: previous.lastUpdatedAt !== null,
      syncWarning: null,
    }))

    const filter = FILTER_LABELS[nextRange] ?? AnalyticsFilter.AllTime
    const [
      performanceResult,
      monthlyResult,
      assetResult,
      dayResult,
      equityResult,
      insightsResult,
    ] = await Promise.allSettled([
      fetchPerformanceSummary(filter),
      fetchMonthlyReturns(filter),
      fetchAssetBreakdown(filter),
      fetchDayOfWeekBreakdown(filter),
      fetchEquityCurve(filter),
      fetchInsights(filter),
    ])

    if (currentRequestId !== requestIdRef.current) {
      return
    }

    const failedParts: string[] = []

    setViewState((previous) => {
      const nextState: AnalyticsViewState = {
        ...previous,
        isLoading: false,
        isRefreshing: false,
      }

      if (performanceResult.status === "fulfilled") {
        nextState.analytics = performanceResult.value
      } else {
        failedParts.push("performance summary")
      }

      if (monthlyResult.status === "fulfilled") {
        nextState.monthlyData = monthlyResult.value
      } else {
        failedParts.push("monthly returns")
      }

      if (assetResult.status === "fulfilled") {
        nextState.assetData = assetResult.value
      } else {
        failedParts.push("asset breakdown")
      }

      if (dayResult.status === "fulfilled") {
        nextState.dayData = dayResult.value
      } else {
        failedParts.push("day-of-week breakdown")
      }

      if (equityResult.status === "fulfilled") {
        nextState.equityData = equityResult.value
      } else {
        failedParts.push("equity curve")
      }

      if (insightsResult.status === "fulfilled") {
        nextState.insightsData = insightsResult.value
      } else {
        failedParts.push("insights")
      }

      nextState.syncWarning =
        failedParts.length > 0
          ? `Some analytics data could not be refreshed: ${failedParts.join(", ")}.`
          : null
      nextState.lastUpdatedAt = failedParts.length === 6 ? previous.lastUpdatedAt : new Date()

      return nextState
    })
  }, [])

  useEffect(() => {
    void loadAnalytics(range)
  }, [loadAnalytics, range])

  const isInitialLoading = viewState.isLoading && viewState.lastUpdatedAt === null

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <AnalyticsPageSkeleton />
        </main>
      </div>
    )
  }

  const { analytics, monthlyData, assetData, dayData, equityData, insightsData, isRefreshing, lastUpdatedAt, syncWarning } = viewState

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <AnalyticsCommandCenter
            range={range}
            rangeOptions={TIME_RANGES}
            onRangeChange={(nextRange) => {
              if (isAnalyticsRangeLabel(nextRange)) {
                setRange(nextRange)
              }
            }}
            analytics={analytics}
            assetData={assetData}
            insights={insightsData}
            isLoading={false}
            isRefreshing={isRefreshing}
            lastUpdatedAt={lastUpdatedAt}
            syncWarning={syncWarning}
            exportAction={
              <ExportButton
                analytics={analytics}
                monthlyData={monthlyData}
                assetData={assetData}
                insightsData={insightsData}
              />
            }
            onSelectTab={setActiveTab}
          />

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (isAnalyticsTabValue(value)) {
                setActiveTab(value)
              }
            }}
            className="space-y-6"
          >
            <TabsList className="grid h-auto grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-1 lg:grid-cols-4">
              <TabsTrigger value="overview" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm">
                <Layers className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm">
                <TrendingUp className="h-3.5 w-3.5" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm">
                <PieChartIcon className="h-3.5 w-3.5" />
                Breakdown
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm">
                <Lightbulb className="h-3.5 w-3.5" />
                Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Total P&L"
                  value={fmt(analytics.totalPnl)}
                  sub={`${analytics.totalClosed} closed trades`}
                  icon={analytics.totalPnl >= 0 ? TrendingUp : TrendingDown}
                  color={analytics.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
                  bgColor={analytics.totalPnl >= 0 ? "border border-emerald-500/20 bg-emerald-500/10" : "border border-red-500/20 bg-red-500/10"}
                />
                <MetricCard
                  label="Win Rate"
                  value={pct(analytics.winRate)}
                  sub={`${analytics.wins}W / ${analytics.losses}L`}
                  icon={Target}
                  color="text-primary"
                  bgColor="border border-primary/20 bg-primary/10"
                />
                <MetricCard
                  label="Profit Factor"
                  value={analytics.profitFactor >= 1e15 ? "Inf" : analytics.profitFactor.toFixed(2)}
                  sub="Gross profit / gross loss"
                  icon={Award}
                  color={
                    analytics.profitFactor >= 1.5
                      ? "text-emerald-400"
                      : analytics.profitFactor >= 1
                        ? "text-amber-400"
                        : "text-red-400"
                  }
                  bgColor={
                    analytics.profitFactor >= 1.5
                      ? "border border-emerald-500/20 bg-emerald-500/10"
                      : analytics.profitFactor >= 1
                        ? "border border-amber-500/20 bg-amber-500/10"
                        : "border border-red-500/20 bg-red-500/10"
                  }
                />
                <MetricCard
                  label="Max Drawdown"
                  value={fmt(analytics.maxDrawdown)}
                  sub={pct(analytics.maxDrawdownPct)}
                  icon={Shield}
                  color="text-red-400"
                  bgColor="border border-red-500/20 bg-red-500/10"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Expectancy"
                  value={fmt(analytics.expectancy)}
                  sub="Expected $ per trade"
                  icon={Zap}
                  color={analytics.expectancy > 0 ? "text-emerald-400" : "text-red-400"}
                  bgColor={analytics.expectancy > 0 ? "border border-emerald-500/20 bg-emerald-500/10" : "border border-red-500/20 bg-red-500/10"}
                />
                <MetricCard
                  label="Sharpe Ratio"
                  value={analytics.sharpeRatio.toFixed(2)}
                  sub="Risk-adjusted returns"
                  icon={Target}
                  color={analytics.sharpeRatio > 1 ? "text-emerald-400" : "text-amber-400"}
                  bgColor={analytics.sharpeRatio > 1 ? "border border-emerald-500/20 bg-emerald-500/10" : "border border-amber-500/20 bg-amber-500/10"}
                />
                <MetricCard
                  label="Avg R:R"
                  value={`${analytics.avgRiskReward.toFixed(1)}:1`}
                  sub="Risk to reward"
                  icon={ArrowUpRight}
                  color="text-accent"
                  bgColor="border border-accent/20 bg-accent/10"
                />
                <MetricCard
                  label="Avg Hold Time"
                  value={`${analytics.avgHoldingDays.toFixed(0)}d`}
                  sub="Days per trade"
                  icon={Clock}
                  color="text-muted-foreground"
                  bgColor="border border-border/60 bg-secondary/40"
                />
              </div>

              <Card className={SURFACE_CARD_CLASS}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground">Equity Curve</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Cumulative profit trajectory over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EquityCurveChart data={equityData} />
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className={SURFACE_CARD_CLASS}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-foreground">Performance Profile</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Multi-dimensional read on edge, consistency, and payoff quality
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PerformanceRadar analytics={analytics} />
                  </CardContent>
                </Card>

                <Card className={SURFACE_CARD_CLASS}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      Key insights
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Actionable recommendations based on your current trading behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-80 overflow-y-auto">
                    <InsightsPanel insights={insightsData} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Avg Win"
                  value={fmt(analytics.avgWin)}
                  icon={ArrowUpRight}
                  color="text-emerald-400"
                  bgColor="border border-emerald-500/20 bg-emerald-500/10"
                />
                <MetricCard
                  label="Avg Loss"
                  value={fmt(analytics.avgLoss)}
                  icon={ArrowDownRight}
                  color="text-red-400"
                  bgColor="border border-red-500/20 bg-red-500/10"
                />
                <MetricCard
                  label="Largest Win"
                  value={fmt(analytics.largestWin)}
                  icon={TrendingUp}
                  color="text-emerald-400"
                  bgColor="border border-emerald-500/20 bg-emerald-500/10"
                />
                <MetricCard
                  label="Largest Loss"
                  value={fmt(analytics.largestLoss)}
                  icon={TrendingDown}
                  color="text-red-400"
                  bgColor="border border-red-500/20 bg-red-500/10"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label="Consec. Wins"
                  value={String(analytics.consecutiveWins)}
                  icon={CheckCircle2}
                  color="text-emerald-400"
                  bgColor="border border-emerald-500/20 bg-emerald-500/10"
                />
                <MetricCard
                  label="Consec. Losses"
                  value={String(analytics.consecutiveLosses)}
                  icon={AlertTriangle}
                  color="text-red-400"
                  bgColor="border border-red-500/20 bg-red-500/10"
                />
                <Card className={SURFACE_CARD_CLASS}>
                  <CardContent className="pt-5 pb-4">
                    <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Long vs short
                    </p>
                    <LongShortSplit analytics={analytics} />
                  </CardContent>
                </Card>
              </div>

              <Card className={SURFACE_CARD_CLASS}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground">Monthly Returns</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Profit and loss by month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MonthlyReturnsChart data={monthlyData} />
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className={SURFACE_CARD_CLASS}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-foreground">Drawdown chart</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Underwater equity from the last peak
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DrawdownChart equityData={equityData} />
                  </CardContent>
                </Card>

                <Card className={SURFACE_CARD_CLASS}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-foreground">PnL Distribution</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Trade outcomes grouped by dollar range
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WinLossDistribution equityData={equityData} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className={SURFACE_CARD_CLASS}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                      <PieChartIcon className="h-4 w-4 text-primary" />
                      Performance by asset
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      P&L and win rate per instrument
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AssetPerformanceChart data={assetData} />
                  </CardContent>
                </Card>

                <Card className={SURFACE_CARD_CLASS}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                      <Clock className="h-4 w-4 text-amber-400" />
                      Performance by session
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Results across trading zones and killzones
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SessionBreakdownPlaceholder />
                  </CardContent>
                </Card>
              </div>

              <Card className={SURFACE_CARD_CLASS}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                    <Calendar className="h-4 w-4 text-accent" />
                    Performance by day of week
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Identify your strongest and weakest trading days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DayOfWeekChart data={dayData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="space-y-6 lg:col-span-3">
                  <Card className={SURFACE_CARD_CLASS}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                        <Lightbulb className="h-5 w-5 text-amber-400" />
                        Recommendations
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        AI-driven analysis of your trading patterns, discipline, and payoff profile
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <InsightsPanel insights={insightsData} />
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4 lg:col-span-2">
                  <Card className={SURFACE_CARD_CLASS}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground">Quick stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { label: "Win Rate", value: pct(analytics.winRate), good: analytics.winRate >= 50 },
                        { label: "Profit Factor", value: analytics.profitFactor >= 1e15 ? "Inf" : analytics.profitFactor.toFixed(2), good: analytics.profitFactor >= 1.5 },
                        { label: "Expectancy", value: fmt(analytics.expectancy), good: analytics.expectancy > 0 },
                        { label: "Sharpe Ratio", value: analytics.sharpeRatio.toFixed(2), good: analytics.sharpeRatio > 1 },
                        { label: "Avg R:R", value: `${analytics.avgRiskReward.toFixed(1)}:1`, good: analytics.avgRiskReward >= 2 },
                        { label: "Max Drawdown", value: pct(analytics.maxDrawdownPct), good: analytics.maxDrawdownPct < 15 },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-xl bg-secondary/20 px-3 py-2">
                          <span className="text-xs text-muted-foreground">{item.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">{item.value}</span>
                            <div className={`h-1.5 w-1.5 rounded-full ${item.good ? "bg-emerald-500" : "bg-red-500"}`} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className={SURFACE_CARD_CLASS}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground">Performance profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PerformanceRadar analytics={analytics} />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

export default function AnalyticsPage() {
  return <AnalyticsContent />
}

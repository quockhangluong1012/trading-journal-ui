"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, Tooltip as ReTooltip, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3, TrendingUp, TrendingDown, Target, Activity, Shield, Clock,
  Download, Lightbulb, ArrowUpRight, ArrowDownRight,
  Calendar, Layers, Award, AlertTriangle, Info, CheckCircle2, Zap,
  PieChart as PieChartIcon, Loader2,
} from "lucide-react"
import { Header } from "@/components/header"
import {
  fetchPerformanceSummary, fetchMonthlyReturns, fetchAssetBreakdown,
  fetchDayOfWeekBreakdown, fetchEquityCurve, fetchInsights,
  FILTER_LABELS, AnalyticsFilter,
  type PerformanceSummary, type MonthlyReturn, type AssetBreakdown as AssetBreakdownType,
  type DayOfWeekBreakdown as DayBreakdownType, type EquityPoint, type Insight,
} from "@/lib/analytics-api"

// --- Helpers ---
const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v)

const pct = (v: number) => `${v.toFixed(1)}%`

const TIME_RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "All", days: 9999 },
] as const

// --- Loading Spinner ---
function LoadingState({ height = "h-[200px]" }: { height?: string }) {
  return (
    <div className={`flex ${height} items-center justify-center`}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

// --- Stat Metric Card ---
function MetricCard({ label, value, sub, icon: Icon, color = "text-foreground", bgColor = "bg-secondary/30" }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string; bgColor?: string
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2 ${bgColor}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Equity Curve ---
function EquityCurveChart({ data }: { data: EquityPoint[] }) {
  if (data.length === 0) return <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No closed trades in this period</div>

  return (
    <ChartContainer config={{ profit: { label: "Equity", color: "#22c55e" } }} className="h-[280px]">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(v as number)} labelFormatter={(l) => new Date(l).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />} />
        <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fill="url(#eqGrad)" />
      </AreaChart>
    </ChartContainer>
  )
}

// --- Monthly Returns Bar ---
function MonthlyReturnsChart({ data }: { data: MonthlyReturn[] }) {
  if (data.length === 0) return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">No monthly data yet</div>
  return (
    <ChartContainer config={{ pnl: { label: "PnL", color: "#22c55e" } }} className="h-[240px]">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="month" tickFormatter={(v) => { const [y, m] = v.split("-"); return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)-1]} '${y.slice(2)}` }} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(v as number)} />} />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]} fill="#22c55e">
          {data.map((d, i) => (
            <Cell key={i} fill={d.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// --- Asset Performance ---
function AssetPerformanceChart({ data }: { data: AssetBreakdownType[] }) {
  if (data.length === 0) return <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">No asset data</div>
  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]
  return (
    <div className="space-y-4">
      <ChartContainer config={{ pnl: { label: "PnL", color: "#22c55e" } }} className="h-[200px]">
        <PieChart>
          <Pie data={data.map((d) => ({ ...d, absPnl: Math.abs(d.pnl) }))} dataKey="absPnl" nameKey="asset" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <ReTooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--popover-foreground)" }} formatter={(v: any, name: any) => [fmt(data.find((d) => d.asset === name)?.pnl ?? 0), name]} />
        </PieChart>
      </ChartContainer>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={d.asset} className="flex items-center justify-between rounded-md px-2.5 py-1.5 bg-secondary/20">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-xs font-medium text-foreground">{d.asset}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground">{d.count} trades</span>
              <span className="text-[10px] text-muted-foreground">{d.winRate}% WR</span>
              <span className={`text-xs font-medium ${d.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(d.pnl)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Day of Week ---
function DayOfWeekChart({ data }: { data: DayBreakdownType[] }) {
  return (
    <ChartContainer config={{ pnl: { label: "PnL", color: "#22c55e" } }} className="h-[200px]">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={55} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(v as number)} />} />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />)}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// --- Radar Performance ---
function PerformanceRadar({ analytics }: { analytics: PerformanceSummary }) {
  const data = useMemo(() => [
    { metric: "Win Rate", value: Math.min(analytics.winRate, 100), fullMark: 100 },
    { metric: "Profit Factor", value: Math.min(analytics.profitFactor * 25, 100), fullMark: 100 },
    { metric: "R:R Ratio", value: Math.min(analytics.avgRiskReward * 20, 100), fullMark: 100 },
    { metric: "Sharpe", value: Math.min(Math.max(analytics.sharpeRatio * 25, 0), 100), fullMark: 100 },
    { metric: "Consistency", value: Math.min(100 - analytics.maxDrawdownPct, 100), fullMark: 100 },
    { metric: "Discipline", value: Math.min(analytics.consecutiveWins * 15 + 30, 100), fullMark: 100 },
  ], [analytics])

  return (
    <ChartContainer config={{ value: { label: "Score", color: "#22c55e" } }} className="h-[260px]">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#9ca3af", fontSize: 10 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Performance" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
      </RadarChart>
    </ChartContainer>
  )
}

// --- Insights Panel ---
function InsightsPanel({ insights }: { insights: Insight[] }) {
  const iconMap = { success: CheckCircle2, warning: AlertTriangle, info: Info }
  const colorMap = { success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", warning: "text-amber-400 bg-amber-500/10 border-amber-500/20", info: "text-blue-400 bg-blue-500/10 border-blue-500/20" }
  return (
    <div className="space-y-3">
      {insights.map((insight, i) => {
        const Icon = iconMap[insight.type]
        const colors = colorMap[insight.type]
        return (
          <div key={i} className={`rounded-lg border p-3 ${colors}`}>
            <div className="flex items-start gap-2.5">
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold">{insight.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed opacity-80">{insight.description}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Drawdown Chart (computed from equity curve data) ---
function DrawdownChart({ equityData }: { equityData: EquityPoint[] }) {
  const data = useMemo(() => {
    let peak = 0
    return equityData.map((point) => {
      if (point.profit > peak) peak = point.profit
      return { date: point.date, drawdown: -(peak - point.profit) }
    })
  }, [equityData])

  if (data.length === 0) return <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No drawdown data</div>

  return (
    <ChartContainer config={{ drawdown: { label: "Drawdown", color: "#ef4444" } }} className="h-[200px]">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(v as number)} />} />
        <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} fill="url(#ddGrad)" />
      </AreaChart>
    </ChartContainer>
  )
}

// --- Win/Loss Distribution (computed from equity data) ---
function WinLossDistribution({ equityData }: { equityData: EquityPoint[] }) {
  const data = useMemo(() => {
    // Derive individual PnLs from cumulative equity curve
    const pnls: number[] = []
    for (let i = 0; i < equityData.length; i++) {
      if (i === 0) pnls.push(equityData[i].profit)
      else pnls.push(equityData[i].profit - equityData[i - 1].profit)
    }

    const step = 1000
    const buckets: Record<string, number> = {}
    pnls.forEach((pnl) => {
      const bucket = Math.floor(pnl / step) * step
      const key = `${bucket >= 0 ? "+" : ""}${bucket}`
      buckets[key] = (buckets[key] || 0) + 1
    })
    return Object.entries(buckets)
      .map(([range, count]) => ({ range, count, pnl: parseInt(range) }))
      .sort((a, b) => a.pnl - b.pnl)
  }, [equityData])

  if (data.length === 0) return <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">No distribution data</div>

  return (
    <ChartContainer config={{ count: { label: "Trades", color: "#22c55e" } }} className="h-[200px]">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="range" tick={{ fill: "#9ca3af", fontSize: 9 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />)}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// --- Export Report ---
function ExportButton({ analytics, monthlyData, assetData, insightsData }: {
  analytics: PerformanceSummary; monthlyData: MonthlyReturn[]; assetData: AssetBreakdownType[]; insightsData: Insight[]
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
      ...monthlyData.map((m) => `${m.month}: ${fmt(m.pnl)}`),
      "",
      "=== ASSET BREAKDOWN ===",
      ...assetData.map((a) => `${a.asset}: ${fmt(a.pnl)} (${a.count} trades, ${a.winRate}% WR)`),
      "",
      "=== INSIGHTS & RECOMMENDATIONS ===",
      ...insightsData.map((ins) => `[${ins.type.toUpperCase()}] ${ins.title}: ${ins.description}`),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trading-analytics-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [analytics, monthlyData, assetData, insightsData])

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
      <Download className="h-3.5 w-3.5" /> Export Report
    </Button>
  )
}

// --- Long vs Short Donut ---
function LongShortSplit({ analytics }: { analytics: PerformanceSummary }) {
  const data = useMemo(() => [
    { name: "Long WR", value: analytics.longsWinRate, fill: "#22c55e" },
    { name: "Short WR", value: analytics.shortsWinRate, fill: "#ef4444" },
  ], [analytics])

  return (
    <div className="flex items-center gap-6">
      <ChartContainer config={{ value: { label: "Win Rate" } }} className="h-[120px] w-[120px]">
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={4}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Longs</span>
          <span className="text-xs font-bold text-emerald-400">{pct(analytics.longsWinRate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-xs text-muted-foreground">Shorts</span>
          <span className="text-xs font-bold text-red-400">{pct(analytics.shortsWinRate)}</span>
        </div>
      </div>
    </div>
  )
}

// --- Default empty analytics ---
const emptyAnalytics: PerformanceSummary = {
  totalPnl: 0, winRate: 0, wins: 0, losses: 0, totalClosed: 0,
  avgWin: 0, avgLoss: 0, largestWin: 0, largestLoss: 0,
  profitFactor: 0, expectancy: 0, maxDrawdown: 0, maxDrawdownPct: 0,
  sharpeRatio: 0, avgHoldingDays: 0, longsWinRate: 0, shortsWinRate: 0,
  consecutiveWins: 0, consecutiveLosses: 0, avgRiskReward: 0,
}

// --- Main Content ---
function AnalyticsContent() {
  const [range, setRange] = useState("All")
  const [loading, setLoading] = useState(true)

  const [analytics, setAnalytics] = useState<PerformanceSummary>(emptyAnalytics)
  const [monthlyData, setMonthlyData] = useState<MonthlyReturn[]>([])
  const [assetData, setAssetData] = useState<AssetBreakdownType[]>([])
  const [dayData, setDayData] = useState<DayBreakdownType[]>([])
  const [equityData, setEquityData] = useState<EquityPoint[]>([])
  const [insightsData, setInsightsData] = useState<Insight[]>([])

  useEffect(() => {
    const filter = FILTER_LABELS[range] ?? AnalyticsFilter.AllTime

    setLoading(true)

    Promise.all([
      fetchPerformanceSummary(filter),
      fetchMonthlyReturns(filter),
      fetchAssetBreakdown(filter),
      fetchDayOfWeekBreakdown(filter),
      fetchEquityCurve(filter),
      fetchInsights(filter),
    ]).then(([perf, monthly, assets, days, equity, insights]) => {
      setAnalytics(perf)
      setMonthlyData(monthly)
      setAssetData(assets)
      setDayData(days)
      setEquityData(equity)
      setInsightsData(insights)
    }).catch((error) => {
      console.error("Failed to fetch analytics:", error)
    }).finally(() => {
      setLoading(false)
    })
  }, [range])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <LoadingState height="h-[400px]" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Deep dive into your trading performance with actionable insights and metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-md border border-border bg-secondary/30 p-0.5">
              {TIME_RANGES.map((r) => (
                <Button key={r.label} variant={range === r.label ? "default" : "ghost"} size="sm" onClick={() => setRange(r.label)} className="h-7 px-2.5 text-xs">
                  {r.label}
                </Button>
              ))}
            </div>
            <ExportButton analytics={analytics} monthlyData={monthlyData} assetData={assetData} insightsData={insightsData} />
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Performance</TabsTrigger>
            <TabsTrigger value="breakdown" className="gap-1.5"><Layers className="h-3.5 w-3.5" /> Breakdown</TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5"><Lightbulb className="h-3.5 w-3.5" /> Insights</TabsTrigger>
          </TabsList>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Row */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total P&L" value={fmt(analytics.totalPnl)} sub={`${analytics.totalClosed} closed trades`} icon={analytics.totalPnl >= 0 ? TrendingUp : TrendingDown} color={analytics.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"} bgColor={analytics.totalPnl >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"} />
              <MetricCard label="Win Rate" value={pct(analytics.winRate)} sub={`${analytics.wins}W / ${analytics.losses}L`} icon={Target} color="text-primary" bgColor="bg-primary/10" />
              <MetricCard label="Profit Factor" value={analytics.profitFactor >= 1e15 ? "Inf" : analytics.profitFactor.toFixed(2)} sub="Gross profit / Gross loss" icon={Award} color={analytics.profitFactor >= 1.5 ? "text-emerald-400" : analytics.profitFactor >= 1 ? "text-amber-400" : "text-red-400"} bgColor={analytics.profitFactor >= 1.5 ? "bg-emerald-500/10" : analytics.profitFactor >= 1 ? "bg-amber-500/10" : "bg-red-500/10"} />
              <MetricCard label="Max Drawdown" value={fmt(analytics.maxDrawdown)} sub={pct(analytics.maxDrawdownPct)} icon={Shield} color="text-red-400" bgColor="bg-red-500/10" />
            </div>

            {/* Secondary KPI Row */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Expectancy" value={fmt(analytics.expectancy)} sub="Expected $ per trade" icon={Zap} color={analytics.expectancy > 0 ? "text-emerald-400" : "text-red-400"} bgColor={analytics.expectancy > 0 ? "bg-emerald-500/10" : "bg-red-500/10"} />
              <MetricCard label="Sharpe Ratio" value={analytics.sharpeRatio.toFixed(2)} sub="Risk-adjusted returns" icon={Activity} color={analytics.sharpeRatio > 1 ? "text-emerald-400" : "text-amber-400"} bgColor={analytics.sharpeRatio > 1 ? "bg-emerald-500/10" : "bg-amber-500/10"} />
              <MetricCard label="Avg R:R" value={`${analytics.avgRiskReward.toFixed(1)}:1`} sub="Risk to reward" icon={Target} color="text-accent" bgColor="bg-accent/10" />
              <MetricCard label="Avg Hold Time" value={`${analytics.avgHoldingDays.toFixed(0)}d`} sub="Days per trade" icon={Clock} color="text-muted-foreground" bgColor="bg-secondary/40" />
            </div>

            {/* Equity Curve */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-foreground">Equity Curve</CardTitle>
                <CardDescription className="text-muted-foreground">Cumulative profit trajectory over time</CardDescription>
              </CardHeader>
              <CardContent>
                <EquityCurveChart data={equityData} />
              </CardContent>
            </Card>

            {/* Radar + Insights side by side */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground">Performance Profile</CardTitle>
                  <CardDescription className="text-muted-foreground">Multi-dimensional view of your trading edge</CardDescription>
                </CardHeader>
                <CardContent>
                  <PerformanceRadar analytics={analytics} />
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    Key Insights
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Actionable recommendations based on your data</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[320px] overflow-y-auto">
                  <InsightsPanel insights={insightsData} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== PERFORMANCE TAB ===== */}
          <TabsContent value="performance" className="space-y-6">
            {/* Win/Loss Summary */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Avg Win" value={fmt(analytics.avgWin)} icon={ArrowUpRight} color="text-emerald-400" bgColor="bg-emerald-500/10" />
              <MetricCard label="Avg Loss" value={fmt(analytics.avgLoss)} icon={ArrowDownRight} color="text-red-400" bgColor="bg-red-500/10" />
              <MetricCard label="Largest Win" value={fmt(analytics.largestWin)} icon={TrendingUp} color="text-emerald-400" bgColor="bg-emerald-500/10" />
              <MetricCard label="Largest Loss" value={fmt(analytics.largestLoss)} icon={TrendingDown} color="text-red-400" bgColor="bg-red-500/10" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="Consec. Wins" value={String(analytics.consecutiveWins)} icon={CheckCircle2} color="text-emerald-400" bgColor="bg-emerald-500/10" />
              <MetricCard label="Consec. Losses" value={String(analytics.consecutiveLosses)} icon={AlertTriangle} color="text-red-400" bgColor="bg-red-500/10" />
              <Card className="border-border bg-card">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground mb-2">Long vs Short</p>
                  <LongShortSplit analytics={analytics} />
                </CardContent>
              </Card>
            </div>

            {/* Monthly Returns */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-foreground">Monthly Returns</CardTitle>
                <CardDescription className="text-muted-foreground">Profit and loss by month</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyReturnsChart data={monthlyData} />
              </CardContent>
            </Card>

            {/* Drawdown + Distribution */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground">Drawdown Chart</CardTitle>
                  <CardDescription className="text-muted-foreground">Underwater equity from peak</CardDescription>
                </CardHeader>
                <CardContent>
                  <DrawdownChart equityData={equityData} />
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground">PnL Distribution</CardTitle>
                  <CardDescription className="text-muted-foreground">Trade outcomes by dollar range</CardDescription>
                </CardHeader>
                <CardContent>
                  <WinLossDistribution equityData={equityData} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== BREAKDOWN TAB ===== */}
          <TabsContent value="breakdown" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Asset Performance */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-primary" />
                    Performance by Asset
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">PnL and win rate per instrument</CardDescription>
                </CardHeader>
                <CardContent>
                  <AssetPerformanceChart data={assetData} />
                </CardContent>
              </Card>

              {/* Session Breakdown placeholder */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    Performance by Session
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">Results across trading zones</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">Coming soon</div>
                </CardContent>
              </Card>
            </div>

            {/* Day of Week */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  Performance by Day of Week
                </CardTitle>
                <CardDescription className="text-muted-foreground">Identify your best and worst trading days</CardDescription>
              </CardHeader>
              <CardContent>
                <DayOfWeekChart data={dayData} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== INSIGHTS TAB ===== */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-5">
              {/* Full Insights */}
              <div className="lg:col-span-3 space-y-6">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-400" />
                      Recommendations
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">AI-driven analysis of your trading patterns and habits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InsightsPanel insights={insightsData} />
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-foreground">Quick Stats</CardTitle>
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
                      <div key={item.label} className="flex items-center justify-between rounded-md bg-secondary/20 px-3 py-2">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">{item.value}</span>
                          <div className={`h-1.5 w-1.5 rounded-full ${item.good ? "bg-emerald-500" : "bg-red-500"}`} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-foreground">Performance Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PerformanceRadar analytics={analytics} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default function AnalyticsPage() {
  return <AnalyticsContent />
}

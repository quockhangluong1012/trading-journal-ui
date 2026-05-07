"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Award, Calendar, CheckCircle2, Clock, Crosshair, Layers, Lightbulb, Newspaper, PieChart as PieChartIcon, Shield, Target, TrendingDown, TrendingUp, Zap } from "lucide-react"
import { AnalyticsCommandCenter, type AnalyticsTabValue } from "@/components/analytics/analytics-command-center"
import { AppPageShell } from "@/components/app-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PerformanceHeatmap } from "@/components/analytics/performance-heatmap"
import { MetricCard, AnalyticsPageSkeleton, fmt, pct, ANALYTICS_SURFACE_CLASS } from "@/components/analytics/metric-card"
import { EquityCurveChart, MonthlyReturnsChart, DrawdownChart, WinLossDistribution, DayOfWeekChart, PerformanceRadar } from "@/components/analytics/analytics-charts"
import { AssetPerformanceChart, InsightsPanel, LongShortSplit, ExportButton } from "@/components/analytics/analytics-panels"
import { KillzonePerformanceDashboard } from "@/components/analytics/killzone-performance"
import { ConceptPerformanceDashboard } from "@/components/analytics/concept-performance"
import { SetupPerformanceDashboard } from "@/components/analytics/setup-performance-dashboard"
import { TradeEventCorrelation } from "@/components/analytics/trade-event-correlation"
import { EquityCurveWithEvents } from "@/components/analytics/equity-curve-with-events"
import { AiPatternDiscoveryCard } from "@/components/analytics/ai-pattern-discovery-card"
import { AnalyticsFilter, FILTER_LABELS, fetchAssetBreakdown, fetchDayOfWeekBreakdown, fetchEquityCurve, fetchInsights, fetchMonthlyReturns, fetchPerformanceSummary, fetchSetupPerformance,
  type AssetBreakdown as AssetBreakdownType, type DayOfWeekBreakdown as DayBreakdownType, type EquityPoint, type Insight, type MonthlyReturn, type PerformanceSummary, type SetupPerformance,
} from "@/lib/analytics-api"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { AppShellLoader } from "@/components/app-shell-loader"

const TIME_RANGES = [{ label: "1W" }, { label: "1M" }, { label: "3M" }, { label: "6M" }, { label: "All" }] as const
const ANALYTICS_TABS = ["overview", "performance", "breakdown", "setups", "calendar", "insights"] as const
const ANALYTICS_RANGE_STORAGE_KEY = "trading-journal-analytics-range"
const ANALYTICS_TAB_STORAGE_KEY = "trading-journal-analytics-tab"

type AnalyticsRangeLabel = (typeof TIME_RANGES)[number]["label"]

interface AnalyticsViewState {
  analytics: PerformanceSummary; monthlyData: MonthlyReturn[]; assetData: AssetBreakdownType[]; dayData: DayBreakdownType[]
  equityData: EquityPoint[]; insightsData: Insight[]; setupData: SetupPerformance[]; isLoading: boolean; isRefreshing: boolean; lastUpdatedAt: Date | null; syncWarning: string | null
}

function isAnalyticsRangeLabel(v: string | null): v is AnalyticsRangeLabel { return TIME_RANGES.some((r) => r.label === v) }
function isAnalyticsTabValue(v: string | null): v is AnalyticsTabValue { return ANALYTICS_TABS.some((t) => t === v) }

const emptyAnalytics: PerformanceSummary = {
  totalPnl: 0, winRate: 0, wins: 0, losses: 0, totalClosed: 0, avgWin: 0, avgLoss: 0, largestWin: 0, largestLoss: 0,
  profitFactor: 0, expectancy: 0, maxDrawdown: 0, maxDrawdownPct: 0, sharpeRatio: 0, avgHoldingDays: 0, longsWinRate: 0,
  shortsWinRate: 0, consecutiveWins: 0, consecutiveLosses: 0, avgRiskReward: 0,
}

const initialViewState: AnalyticsViewState = {
  analytics: emptyAnalytics, monthlyData: [], assetData: [], dayData: [], equityData: [], insightsData: [], setupData: [],
  isLoading: true, isRefreshing: false, lastUpdatedAt: null, syncWarning: null,
}

function AnalyticsContent() {
  const [range, setRange] = useState<AnalyticsRangeLabel>("All")
  const [activeTab, setActiveTab] = useState<AnalyticsTabValue>("overview")
  const [viewState, setViewState] = useState<AnalyticsViewState>(initialViewState)
  const requestIdRef = useRef(0)
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => { if (!isAuthLoading && !user) router.replace(buildRedirectWithNext("/login", pathname)) }, [user, isAuthLoading, pathname, router])

  useEffect(() => {
    try {
      const sr = window.localStorage.getItem(ANALYTICS_RANGE_STORAGE_KEY)
      const st = window.localStorage.getItem(ANALYTICS_TAB_STORAGE_KEY)
      if (isAnalyticsRangeLabel(sr)) setRange(sr)
      if (isAnalyticsTabValue(st)) setActiveTab(st)
    } catch { /* Ignore */ }
  }, [])

  useEffect(() => { try { window.localStorage.setItem(ANALYTICS_RANGE_STORAGE_KEY, range) } catch {} }, [range])
  useEffect(() => { try { window.localStorage.setItem(ANALYTICS_TAB_STORAGE_KEY, activeTab) } catch {} }, [activeTab])

  const loadAnalytics = useCallback(async (nextRange: AnalyticsRangeLabel) => {
    requestIdRef.current += 1
    const currentRequestId = requestIdRef.current
    setViewState((p) => ({ ...p, isLoading: p.lastUpdatedAt === null, isRefreshing: p.lastUpdatedAt !== null, syncWarning: null }))
    const filter = FILTER_LABELS[nextRange] ?? AnalyticsFilter.AllTime
    const [perf, monthly, asset, day, equity, insights, setups] = await Promise.allSettled([
      fetchPerformanceSummary(filter), fetchMonthlyReturns(filter), fetchAssetBreakdown(filter),
      fetchDayOfWeekBreakdown(filter), fetchEquityCurve(filter), fetchInsights(filter), fetchSetupPerformance(filter),
    ])
    if (currentRequestId !== requestIdRef.current) return
    const failed: string[] = []
    setViewState((p) => {
      const n: AnalyticsViewState = { ...p, isLoading: false, isRefreshing: false }
      if (perf.status === "fulfilled") n.analytics = perf.value; else failed.push("performance summary")
      if (monthly.status === "fulfilled") n.monthlyData = monthly.value; else failed.push("monthly returns")
      if (asset.status === "fulfilled") n.assetData = asset.value; else failed.push("asset breakdown")
      if (day.status === "fulfilled") n.dayData = day.value; else failed.push("day-of-week")
      if (equity.status === "fulfilled") n.equityData = equity.value; else failed.push("equity curve")
      if (insights.status === "fulfilled") n.insightsData = insights.value; else failed.push("insights")
      if (setups.status === "fulfilled") n.setupData = setups.value; else failed.push("setup performance")
      n.syncWarning = failed.length > 0 ? `Some data could not be refreshed: ${failed.join(", ")}.` : null
      n.lastUpdatedAt = failed.length === 7 ? p.lastUpdatedAt : new Date()
      return n
    })
  }, [])

  useEffect(() => { if (!isAuthLoading && user) void loadAnalytics(range) }, [loadAnalytics, range, isAuthLoading, user])

  const isInitialLoading = viewState.isLoading && viewState.lastUpdatedAt === null

  if (isAuthLoading) return <AppShellLoader title="Loading analytics" description="Gathering your performance data." />
  if (!user) return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />
  if (isInitialLoading) return <AppPageShell><AnalyticsPageSkeleton /></AppPageShell>

  const { analytics, monthlyData, assetData, dayData, equityData, insightsData, setupData, isRefreshing, lastUpdatedAt, syncWarning } = viewState
  const SC = ANALYTICS_SURFACE_CLASS

  return (
    <AppPageShell contentClassName="space-y-6">
          <AnalyticsCommandCenter range={range} rangeOptions={TIME_RANGES}
            onRangeChange={(r) => { if (isAnalyticsRangeLabel(r)) setRange(r) }}
            analytics={analytics} assetData={assetData} insights={insightsData}
            isLoading={false} isRefreshing={isRefreshing} lastUpdatedAt={lastUpdatedAt} syncWarning={syncWarning}
            exportAction={<ExportButton analytics={analytics} monthlyData={monthlyData} assetData={assetData} insightsData={insightsData} />}
            onSelectTab={setActiveTab} />

          <Tabs value={activeTab} onValueChange={(v) => { if (isAnalyticsTabValue(v)) setActiveTab(v) }} className="space-y-6">
            <TabsList className="grid h-auto grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-1 lg:grid-cols-6">
              <TabsTrigger value="overview" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><Layers className="h-3.5 w-3.5" />Overview</TabsTrigger>
              <TabsTrigger value="performance" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><TrendingUp className="h-3.5 w-3.5" />Performance</TabsTrigger>
              <TabsTrigger value="breakdown" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><PieChartIcon className="h-3.5 w-3.5" />Breakdown</TabsTrigger>
              <TabsTrigger value="setups" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><Crosshair className="h-3.5 w-3.5" />Setups</TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><Newspaper className="h-3.5 w-3.5" />Calendar</TabsTrigger>
              <TabsTrigger value="insights" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><Lightbulb className="h-3.5 w-3.5" />Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total P&L" value={fmt(analytics.totalPnl)} sub={`${analytics.totalClosed} closed trades`} icon={analytics.totalPnl >= 0 ? TrendingUp : TrendingDown} color={analytics.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"} bgColor={analytics.totalPnl >= 0 ? "border border-emerald-500/20 bg-emerald-500/10" : "border border-red-500/20 bg-red-500/10"} />
                <MetricCard label="Win Rate" value={pct(analytics.winRate)} sub={`${analytics.wins}W / ${analytics.losses}L`} icon={Target} color="text-primary" bgColor="border border-primary/20 bg-primary/10" />
                <MetricCard label="Profit Factor" value={analytics.profitFactor >= 1e15 ? "Inf" : analytics.profitFactor.toFixed(2)} sub="Gross profit / gross loss" icon={Award}
                  color={analytics.profitFactor >= 1.5 ? "text-emerald-400" : analytics.profitFactor >= 1 ? "text-amber-400" : "text-red-400"}
                  bgColor={analytics.profitFactor >= 1.5 ? "border border-emerald-500/20 bg-emerald-500/10" : analytics.profitFactor >= 1 ? "border border-amber-500/20 bg-amber-500/10" : "border border-red-500/20 bg-red-500/10"} />
                <MetricCard label="Max Drawdown" value={fmt(analytics.maxDrawdown)} sub={pct(analytics.maxDrawdownPct)} icon={Shield} color="text-red-400" bgColor="border border-red-500/20 bg-red-500/10" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Expectancy" value={fmt(analytics.expectancy)} sub="Expected $ per trade" icon={Zap} color={analytics.expectancy > 0 ? "text-emerald-400" : "text-red-400"} bgColor={analytics.expectancy > 0 ? "border border-emerald-500/20 bg-emerald-500/10" : "border border-red-500/20 bg-red-500/10"} />
                <MetricCard label="Sharpe Ratio" value={analytics.sharpeRatio.toFixed(2)} sub="Risk-adjusted returns" icon={Target} color={analytics.sharpeRatio > 1 ? "text-emerald-400" : "text-amber-400"} bgColor={analytics.sharpeRatio > 1 ? "border border-emerald-500/20 bg-emerald-500/10" : "border border-amber-500/20 bg-amber-500/10"} />
                <MetricCard label="Avg R:R" value={`${analytics.avgRiskReward.toFixed(1)}:1`} sub="Risk to reward" icon={ArrowUpRight} color="text-accent" bgColor="border border-accent/20 bg-accent/10" />
                <MetricCard label="Avg Hold Time" value={`${analytics.avgHoldingDays.toFixed(0)}d`} sub="Days per trade" icon={Clock} color="text-muted-foreground" bgColor="border border-border/60 bg-secondary/40" />
              </div>
              <Card className={SC}><CardHeader className="pb-2"><CardTitle className="text-lg text-foreground">Equity Curve</CardTitle><CardDescription className="text-muted-foreground">Cumulative profit trajectory over time</CardDescription></CardHeader><CardContent><EquityCurveChart data={equityData} /></CardContent></Card>
              <Card className={SC}><CardHeader className="pb-2"><CardTitle className="text-lg text-foreground">Performance Heatmap</CardTitle><CardDescription className="text-muted-foreground">Daily profit and loss over the last year</CardDescription></CardHeader><CardContent><PerformanceHeatmap data={equityData} /></CardContent></Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className={SC}><CardHeader className="pb-2"><CardTitle className="text-lg text-foreground">Performance Profile</CardTitle><CardDescription className="text-muted-foreground">Multi-dimensional read on edge, consistency, and payoff quality</CardDescription></CardHeader><CardContent><PerformanceRadar analytics={analytics} /></CardContent></Card>
                <Card className={SC}><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg text-foreground"><Lightbulb className="h-4 w-4 text-amber-400" />Key insights</CardTitle><CardDescription className="text-muted-foreground">Actionable recommendations based on your current trading behavior</CardDescription></CardHeader><CardContent className="max-h-80 overflow-y-auto"><InsightsPanel insights={insightsData} /></CardContent></Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Avg Win" value={fmt(analytics.avgWin)} icon={ArrowUpRight} color="text-emerald-400" bgColor="border border-emerald-500/20 bg-emerald-500/10" />
                <MetricCard label="Avg Loss" value={fmt(analytics.avgLoss)} icon={ArrowDownRight} color="text-red-400" bgColor="border border-red-500/20 bg-red-500/10" />
                <MetricCard label="Largest Win" value={fmt(analytics.largestWin)} icon={TrendingUp} color="text-emerald-400" bgColor="border border-emerald-500/20 bg-emerald-500/10" />
                <MetricCard label="Largest Loss" value={fmt(analytics.largestLoss)} icon={TrendingDown} color="text-red-400" bgColor="border border-red-500/20 bg-red-500/10" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Consec. Wins" value={String(analytics.consecutiveWins)} icon={CheckCircle2} color="text-emerald-400" bgColor="border border-emerald-500/20 bg-emerald-500/10" />
                <MetricCard label="Consec. Losses" value={String(analytics.consecutiveLosses)} icon={AlertTriangle} color="text-red-400" bgColor="border border-red-500/20 bg-red-500/10" />
                <Card className={SC}><CardContent className="pt-5 pb-4"><p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Long vs short</p><LongShortSplit analytics={analytics} /></CardContent></Card>
              </div>
              <Card className={SC}><CardHeader className="pb-2"><CardTitle className="text-lg text-foreground">Monthly Returns</CardTitle><CardDescription className="text-muted-foreground">Profit and loss by month</CardDescription></CardHeader><CardContent><MonthlyReturnsChart data={monthlyData} /></CardContent></Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className={SC}><CardHeader className="pb-2"><CardTitle className="text-lg text-foreground">Drawdown chart</CardTitle><CardDescription className="text-muted-foreground">Underwater equity from the last peak</CardDescription></CardHeader><CardContent><DrawdownChart equityData={equityData} /></CardContent></Card>
                <Card className={SC}><CardHeader className="pb-2"><CardTitle className="text-lg text-foreground">PnL Distribution</CardTitle><CardDescription className="text-muted-foreground">Trade outcomes grouped by dollar range</CardDescription></CardHeader><CardContent><WinLossDistribution equityData={equityData} /></CardContent></Card>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-6">
              <Card className={SC}><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg text-foreground"><Clock className="h-4 w-4 text-amber-400" />Killzone Performance</CardTitle><CardDescription className="text-muted-foreground">Performance breakdown across ICT killzones — identify your best trading sessions</CardDescription></CardHeader><CardContent><KillzonePerformanceDashboard filter={FILTER_LABELS[range] ?? AnalyticsFilter.AllTime} /></CardContent></Card>
              <Card className={SC}><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg text-foreground"><Layers className="h-4 w-4 text-cyan-400" />ICT Concept Performance</CardTitle><CardDescription className="text-muted-foreground">Win rate and P&L breakdown by ICT concepts (OB, FVG, BOS, etc.)</CardDescription></CardHeader><CardContent><ConceptPerformanceDashboard filter={FILTER_LABELS[range] ?? AnalyticsFilter.AllTime} /></CardContent></Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className={SC}><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg text-foreground"><PieChartIcon className="h-4 w-4 text-primary" />Performance by asset</CardTitle><CardDescription className="text-muted-foreground">P&L and win rate per instrument</CardDescription></CardHeader><CardContent><AssetPerformanceChart data={assetData} /></CardContent></Card>
                <Card className={SC}><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg text-foreground"><Calendar className="h-4 w-4 text-accent" />Performance by day of week</CardTitle><CardDescription className="text-muted-foreground">Identify your strongest and weakest trading days</CardDescription></CardHeader><CardContent><DayOfWeekChart data={dayData} /></CardContent></Card>
              </div>
            </TabsContent>

            <TabsContent value="setups" className="space-y-6">
              <SetupPerformanceDashboard data={setupData} isLoading={false} />
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <Card className={SC}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-foreground"><Newspaper className="h-4 w-4 text-amber-400" />Equity Curve with News Events</CardTitle>
                  <CardDescription className="text-muted-foreground">High-impact economic events overlaid on your equity curve to reveal news impact</CardDescription>
                </CardHeader>
                <CardContent><EquityCurveWithEvents /></CardContent>
              </Card>
              <TradeEventCorrelation />
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="space-y-6 lg:col-span-3">
                  <Card className={SC}><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg text-foreground"><Lightbulb className="h-5 w-5 text-amber-400" />Recommendations</CardTitle><CardDescription className="text-muted-foreground">AI-driven analysis of your trading patterns, discipline, and payoff profile</CardDescription></CardHeader><CardContent><InsightsPanel insights={insightsData} /></CardContent></Card>
                  <AiPatternDiscoveryCard rangeLabel={range} surfaceClassName={SC} />
                </div>
                <div className="space-y-4 lg:col-span-2">
                  <Card className={SC}><CardHeader className="pb-3"><CardTitle className="text-base text-foreground">Quick stats</CardTitle></CardHeader>
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
                          <div className="flex items-center gap-1.5"><span className="text-xs font-bold text-foreground">{item.value}</span><div className={`h-1.5 w-1.5 rounded-full ${item.good ? "bg-emerald-500" : "bg-red-500"}`} /></div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card className={SC}><CardHeader className="pb-3"><CardTitle className="text-base text-foreground">Performance profile</CardTitle></CardHeader><CardContent><PerformanceRadar analytics={analytics} /></CardContent></Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
    </AppPageShell>
  )
}

export default function AnalyticsPage() {
  return <AnalyticsContent />
}

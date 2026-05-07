"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Calculator, DollarSign, GitBranch, RefreshCcw, Settings2, Shield, ShieldAlert, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { AppPageIntro } from "@/components/app-page-intro"
import { AppPageShell } from "@/components/app-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { AppShellLoader } from "@/components/app-shell-loader"
import { RiskGauges } from "@/components/risk/risk-gauges"
import { AiRiskAdvisorCard } from "@/components/risk/ai-risk-advisor-card"
import { PositionSizer } from "@/components/risk/position-sizer"
import { CorrelationMatrixPanel } from "@/components/risk/correlation-matrix"
import { RiskHeatmapPanel } from "@/components/risk/risk-heatmap"
import { AccountBalancePanel } from "@/components/risk/account-balance-chart"
import { RiskConfigPanel } from "@/components/risk/risk-config-panel"
import { fetchRiskDashboard, fetchRiskConfig, fetchCorrelationMatrix, fetchRiskHeatmap, fetchAccountBalance, type RiskDashboard, type RiskConfig, type CorrelationMatrix, type RiskHeatmap, type AccountBalanceEntry } from "@/lib/risk-api"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"

interface RiskViewState {
  dashboard: RiskDashboard | null
  config: RiskConfig | null
  correlation: CorrelationMatrix | null
  heatmap: RiskHeatmap | null
  balanceHistory: AccountBalanceEntry[]
  isLoading: boolean
  isRefreshing: boolean
}

const initial: RiskViewState = { dashboard: null, config: null, correlation: null, heatmap: null, balanceHistory: [], isLoading: true, isRefreshing: false }

export default function RiskPage() {
  const [state, setState] = useState<RiskViewState>(initial)
  const [tab, setTab] = useState("overview")
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => { if (!isAuthLoading && !user) router.replace(buildRedirectWithNext("/login", pathname)) }, [user, isAuthLoading, pathname, router])

  const loadData = useCallback(async () => {
    setState(p => ({ ...p, isLoading: p.dashboard === null, isRefreshing: p.dashboard !== null }))
    const [dash, cfg, corr, hm, bal] = await Promise.allSettled([
      fetchRiskDashboard(), fetchRiskConfig(), fetchCorrelationMatrix(), fetchRiskHeatmap(), fetchAccountBalance()
    ])
    setState(p => ({
      ...p, isLoading: false, isRefreshing: false,
      dashboard: dash.status === "fulfilled" ? dash.value : p.dashboard,
      config: cfg.status === "fulfilled" ? cfg.value : p.config,
      correlation: corr.status === "fulfilled" ? corr.value : p.correlation,
      heatmap: hm.status === "fulfilled" ? hm.value : p.heatmap,
      balanceHistory: bal.status === "fulfilled" ? bal.value : p.balanceHistory,
    }))
  }, [])

  useEffect(() => { if (!isAuthLoading && user) void loadData() }, [loadData, isAuthLoading, user])

  if (isAuthLoading) return <AppShellLoader title="Loading risk dashboard" description="Calculating your risk metrics." />
  if (!user) return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />
  if (state.isLoading) return <AppPageShell><div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></AppPageShell>

  const { dashboard, config, correlation, heatmap, balanceHistory } = state
  const d = dashboard!

  return (
    <AppPageShell contentClassName="space-y-6">
          <AppPageIntro
            badge="Risk desk"
            icon={<Shield className="h-6 w-6" />}
            title="Risk Management"
            description="Portfolio-level risk controls, position sizing, and exposure analysis."
            stats={[
              { label: "Account balance", value: `$${d.accountBalance.toLocaleString()}` },
              { label: "Open positions", value: `${d.openPositionCount} / ${d.maxOpenPositions}` },
              { label: "Daily P&L", value: `${d.dailyPnl >= 0 ? "+" : ""}$${d.dailyPnl.toLocaleString()}` },
            ]}
            actions={
              <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={state.isRefreshing} className="gap-2 rounded-full">
                <RefreshCcw className={`h-4 w-4 ${state.isRefreshing ? "animate-spin" : ""}`} /> Refresh
              </Button>
            }
          />

          {/* Alerts */}
          {d.alerts.length > 0 && (
            <div className="space-y-2">
              {d.alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-xl border p-4 ${a.severity === "critical" ? "border-red-500/40 bg-red-500/10" : a.severity === "warning" ? "border-amber-500/40 bg-amber-500/10" : "border-blue-500/40 bg-blue-500/10"}`}>
                  <ShieldAlert className={`mt-0.5 h-5 w-5 shrink-0 ${a.severity === "critical" ? "text-red-400" : a.severity === "warning" ? "text-amber-400" : "text-blue-400"}`} />
                  <div><p className="text-sm font-semibold text-foreground">{a.title}</p><p className="text-xs text-muted-foreground">{a.message}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className={SC}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div>
                  <div><p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Account Balance</p><p className="text-xl font-bold text-foreground">${d.accountBalance.toLocaleString()}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className={SC}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${d.dailyPnl >= 0 ? "border-emerald-500/20 bg-emerald-500/10" : "border-red-500/20 bg-red-500/10"}`}>
                    {d.dailyPnl >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-red-400" />}
                  </div>
                  <div><p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Today&apos;s P&L</p><p className={`text-xl font-bold ${d.dailyPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>${d.dailyPnl.toLocaleString()} <span className="text-sm font-normal">({d.dailyPnlPercent.toFixed(2)}%)</span></p></div>
                </div>
              </CardContent>
            </Card>
            <Card className={SC}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${d.weeklyPnl >= 0 ? "border-emerald-500/20 bg-emerald-500/10" : "border-red-500/20 bg-red-500/10"}`}>
                    {d.weeklyPnl >= 0 ? <ArrowUpRight className="h-5 w-5 text-emerald-400" /> : <ArrowDownRight className="h-5 w-5 text-red-400" />}
                  </div>
                  <div><p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Weekly P&L</p><p className={`text-xl font-bold ${d.weeklyPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>${d.weeklyPnl.toLocaleString()} <span className="text-sm font-normal">({d.weeklyPnlPercent.toFixed(2)}%)</span></p></div>
                </div>
              </CardContent>
            </Card>
            <Card className={SC}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-400" /></div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Open Positions</p>
                    <p className="text-xl font-bold text-foreground">{d.openPositionCount} <span className="text-sm font-normal text-muted-foreground">/ {d.maxOpenPositions} max</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <TabsList className="grid h-auto grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-1 sm:grid-cols-5">
              <TabsTrigger value="overview" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><Shield className="h-3.5 w-3.5" />Guardrails</TabsTrigger>
              <TabsTrigger value="calculator" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><Calculator className="h-3.5 w-3.5" />Position Sizer</TabsTrigger>
              <TabsTrigger value="correlation" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><GitBranch className="h-3.5 w-3.5" />Correlation</TabsTrigger>
              <TabsTrigger value="balance" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><DollarSign className="h-3.5 w-3.5" />Balance</TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm"><Settings2 className="h-3.5 w-3.5" />Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <RiskGauges dashboard={d} />
              <AiRiskAdvisorCard />
              {heatmap && <RiskHeatmapPanel data={heatmap} />}
            </TabsContent>

            <TabsContent value="calculator"><PositionSizer config={config} /></TabsContent>
            <TabsContent value="correlation"><CorrelationMatrixPanel data={correlation} /></TabsContent>
            <TabsContent value="balance"><AccountBalancePanel data={balanceHistory} onRefresh={loadData} /></TabsContent>
            <TabsContent value="settings"><RiskConfigPanel config={config} onSaved={loadData} /></TabsContent>
          </Tabs>
    </AppPageShell>
  )
}

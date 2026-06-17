"use client"

import { useEffect, useMemo, useState } from "react"
import { GitBranch } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { AppShellLoader } from "@/components/app-shell-loader"
import { AppPageShell } from "@/components/app-page-shell"
import { DailyNotesBanner } from "@/components/dashboard/daily-notes-banner"
import { DailyNotesDialog } from "@/components/dashboard/daily-notes-dialog"
import { TodaySetupDialog } from "@/components/dashboard/today-setup-dialog"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { DashboardCommandCenter } from "@/components/dashboard/dashboard-command-center"
import { MissingTradeNotesCard } from "@/components/dashboard/missing-trade-notes-card"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { WinLossChart } from "@/components/dashboard/win-loss-chart"
import { ProfitChart } from "@/components/dashboard/profit-chart"
import { AssetBreakdownChart } from "@/components/dashboard/asset-breakdown-chart"
import { CalendarWidget } from "@/components/dashboard/calendar-widget"
import { EconomicCalendarWidget } from "@/components/scanner/economic-calendar-widget"
import { PreTradeCheckWidget } from "@/components/scanner/pre-trade-check-widget"
import { OpenPositionsTable } from "@/components/dashboard/open-positions-table"
import { ActiveSessionWidget } from "@/components/session/active-session-widget"
import { KillzonesWidget } from "@/components/dashboard/killzones-widget"
import { MacroTimesWidget } from "@/components/dashboard/macro-times-widget"
import { TiltGaugeWidget } from "@/components/psychology/tilt-gauge-widget"
import { StreakWidget } from "@/components/psychology/streak-widget"
import { KarmaWidget } from "@/components/psychology/karma-widget"
import { GoalsOverviewWidget } from "@/components/goals/goals-overview-widget"
import { QuickTradeModal } from "@/components/trade/quick-trade-modal"
import { buildDashboardOverview } from "@/lib/dashboard-insights"
import { DashboardFilter } from "@/lib/enum/TradeEnum"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDailyNotes } from "@/hooks/use-daily-notes"
import { useDashboardOverview } from "@/hooks/use-dashboard-overview"
import { useTodaySetup } from "@/hooks/use-today-setup"

const timeFilterOptions = [
  { label: "1D", value: DashboardFilter.OneDay },
  { label: "1W", value: DashboardFilter.OneWeek },
  { label: "1M", value: DashboardFilter.OneMonth },
  { label: "3M", value: DashboardFilter.ThreeMonth },
  { label: "All", value: DashboardFilter.All },
]

const DASHBOARD_FILTER_STORAGE_KEY = "trading-journey-dashboard-filter"

const dashboardFilterLabels: Record<DashboardFilter, string> = {
  [DashboardFilter.OneDay]: "Past day",
  [DashboardFilter.OneWeek]: "Past week",
  [DashboardFilter.OneMonth]: "Past month",
  [DashboardFilter.ThreeMonth]: "Past 3 months",
  [DashboardFilter.All]: "All time",
}

function DashboardContent() {
  const [filter, setFilter] = useState<DashboardFilter>(DashboardFilter.All)
  const [isTodaySetupDialogOpen, setIsTodaySetupDialogOpen] = useState(false)
  const [isDailyNotesDialogOpen, setIsDailyNotesDialogOpen] = useState(false)
  const [isQuickTradeOpen, setIsQuickTradeOpen] = useState(false)
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isDashboardEnabled = Boolean(user) && !isLoading
  const { setup: todaySetup } = useTodaySetup(user?.email ?? user?.username ?? null)
  const dailyNotes = useDailyNotes(isDashboardEnabled ? user?.email ?? user?.username ?? null : null)
  const {
    stats,
    winLossData,
    profitTrajectory,
    assetBreakdown,
    openPositions,
    tradesMissingNotes,
    isLoading: isDashboardLoading,
    isRefreshing,
    lastUpdatedAt,
    syncWarning,
    refresh,
  } = useDashboardOverview(filter, { enabled: isDashboardEnabled })

  useEffect(() => {
    try {
      const storedFilter = window.localStorage.getItem(DASHBOARD_FILTER_STORAGE_KEY)

      if (!storedFilter) {
        return
      }

      const parsedFilter = Number.parseInt(storedFilter, 10)
      const isValidFilter = timeFilterOptions.some((option) => option.value === parsedFilter)

      if (isValidFilter) {
        setFilter(parsedFilter as DashboardFilter)
      }
    } catch {
      // Ignore storage errors.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(DASHBOARD_FILTER_STORAGE_KEY, String(filter))
    } catch {
      // Ignore storage errors.
    }
  }, [filter])

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname))
    }
  }, [user, isLoading, pathname, router])

  useEffect(() => {
    if (!todaySetup) {
      setIsTodaySetupDialogOpen(false)
    }
  }, [todaySetup])

  useEffect(() => {
    if (!isLoading && user && dailyNotes.shouldShowPopup) {
      setIsDailyNotesDialogOpen(true)
    }
  }, [dailyNotes.shouldShowPopup, isLoading, user])

  const overview = useMemo(
    () =>
      buildDashboardOverview({
        filterLabel: dashboardFilterLabels[filter],
        stats,
        profitTrajectory,
        openPositions,
      }),
    [filter, openPositions, profitTrajectory, stats],
  )

  const userName = user?.fullName || user?.username || user?.email
  const todaySetupSummary = todaySetup?.description?.trim() || todaySetup?.name

  if (isLoading) {
    return <AppShellLoader title="Loading your dashboard" description="Syncing your trades, analytics, and active session." />
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you back to your dashboard as soon as your session is ready." />
  }

  return (
    <AppPageShell className="selection:bg-primary/20">
      <div className="space-y-6">
        <DailyNotesBanner
          note={dailyNotes.note}
          isLoading={dailyNotes.isLoading}
          onClick={() => setIsDailyNotesDialogOpen(true)}
        />

        <DashboardCommandCenter
          filter={filter}
          filterLabel={dashboardFilterLabels[filter]}
          filterOptions={timeFilterOptions}
          onFilterChange={setFilter}
          overview={overview}
          userName={userName}
          pathname={pathname}
          lastUpdatedAt={lastUpdatedAt}
          isLoading={isDashboardLoading}
          isRefreshing={isRefreshing}
          syncWarning={syncWarning}
          todaySetupBadge={
            todaySetup ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                onClick={() => setIsTodaySetupDialogOpen(true)}
              >
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Today Setup: </span>
                <span className="max-w-40 truncate font-normal sm:max-w-52">{todaySetupSummary}</span>
              </Button>
            ) : undefined
          }
          onRefresh={() => {
            void refresh()
          }}
          onNewTrade={() => setIsQuickTradeOpen(true)}
          sessionControl={<ActiveSessionWidget />}
        />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-2xl border border-border/60 bg-background/60 p-1.5 shadow-sm backdrop-blur-md sm:grid-cols-4">
            <TabsTrigger id="dashboard-tab-overview" value="overview" className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger id="dashboard-tab-performance" value="performance" className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              Performance
            </TabsTrigger>
            <TabsTrigger id="dashboard-tab-psychology" value="psychology" className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              Psychology
            </TabsTrigger>
            <TabsTrigger id="dashboard-tab-planning" value="planning" className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              Planning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" aria-labelledby="dashboard-tab-overview" className="space-y-6">
            <StatsCards stats={stats} isLoading={isDashboardLoading} />

            <div className="grid gap-6 xl:grid-cols-2">
              <OpenPositionsTable filter={filter} openPositions={openPositions} isLoading={isDashboardLoading} />
              <MissingTradeNotesCard trades={tradesMissingNotes} isLoading={isDashboardLoading} />
            </div>

            <CalendarWidget filter={filter} />
          </TabsContent>

          <TabsContent value="performance" aria-labelledby="dashboard-tab-performance" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ProfitChart filter={filter} profitTrajectory={profitTrajectory} isLoading={isDashboardLoading} />
              <WinLossChart filter={filter} data={winLossData} isLoading={isDashboardLoading} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <AssetBreakdownChart
                title="P&L by Asset"
                description="Net performance grouped by instrument"
                data={assetBreakdown}
                metric="pnl"
                isLoading={isDashboardLoading}
              />
              <AssetBreakdownChart
                title="Trades by Asset"
                description="Trade count grouped by instrument"
                data={assetBreakdown}
                metric="count"
                isLoading={isDashboardLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="psychology" aria-labelledby="dashboard-tab-psychology" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <TiltGaugeWidget />
              <StreakWidget />
            </div>

            <KarmaWidget />
          </TabsContent>

          <TabsContent value="planning" aria-labelledby="dashboard-tab-planning" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <GoalsOverviewWidget />
              <PreTradeCheckWidget compact />
            </div>

            <KillzonesWidget />
            <MacroTimesWidget />
            <EconomicCalendarWidget />
          </TabsContent>
        </Tabs>
      </div>

      <TodaySetupDialog
        open={isTodaySetupDialogOpen}
        onOpenChange={setIsTodaySetupDialogOpen}
        setup={todaySetup}
      />

      <DailyNotesDialog
        open={isDailyNotesDialogOpen}
        onOpenChange={setIsDailyNotesDialogOpen}
        note={dailyNotes.note}
        isSaving={dailyNotes.isSaving}
        onSave={dailyNotes.save}
        onDismiss={dailyNotes.dismissPopup}
      />

      <QuickTradeModal open={isQuickTradeOpen} onOpenChange={setIsQuickTradeOpen} />
    </AppPageShell>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}

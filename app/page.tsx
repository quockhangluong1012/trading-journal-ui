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
import { AiEconomicImpactCard } from "@/components/dashboard/ai-economic-impact-card"
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
import { buildDashboardOverview } from "@/lib/dashboard-insights"
import { DashboardFilter } from "@/lib/enum/TradeEnum"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
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
          stats={stats}
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
          sessionControl={<ActiveSessionWidget />}
        />

        <StatsCards stats={stats} isLoading={isDashboardLoading} />

        <div className="grid gap-6 lg:grid-cols-2">
          <TiltGaugeWidget />
          <StreakWidget />
        </div>

        <KarmaWidget />

        <div className="grid gap-6 lg:grid-cols-2">
          <KillzonesWidget />
          <MacroTimesWidget />
        </div>

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

        <OpenPositionsTable filter={filter} openPositions={openPositions} isLoading={isDashboardLoading} />

        <AiEconomicImpactCard symbols={openPositions.map((position) => position.asset)} />

        <CalendarWidget filter={filter} />

        <div className="w-full space-y-4">
          <PreTradeCheckWidget compact />
          <EconomicCalendarWidget />
        </div>
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
    </AppPageShell>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { GitBranch } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { AppShellLoader } from "@/components/app-shell-loader"
import { TodaySetupDialog } from "@/components/dashboard/today-setup-dialog"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { DashboardCommandCenter } from "@/components/dashboard/dashboard-command-center"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { WinLossChart } from "@/components/dashboard/win-loss-chart"
import { ProfitChart } from "@/components/dashboard/profit-chart"
import { CalendarWidget } from "@/components/dashboard/calendar-widget"
import { OpenPositionsTable } from "@/components/dashboard/open-positions-table"
import { ActiveSessionWidget } from "@/components/session/active-session-widget"
import { KillzonesWidget } from "@/components/dashboard/killzones-widget"
import { buildDashboardOverview } from "@/lib/dashboard-insights"
import { DashboardFilter } from "@/lib/enum/TradeEnum"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
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
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isDashboardEnabled = Boolean(user) && !isLoading
  const { setup: todaySetup } = useTodaySetup(user?.email ?? user?.username ?? null)
  const {
    stats,
    winLossData,
    profitTrajectory,
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
    <div className="min-h-screen relative bg-slate-50 dark:bg-background overflow-hidden selection:bg-primary/20">
      {/* Dynamic Background Elements */}
      <div className="pointer-events-none absolute -inset-[10px] opacity-60 dark:opacity-40">
        <div className="absolute -top-24 -right-24 h-[600px] w-[600px] rounded-full bg-primary/10 dark:bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-[600px] w-[600px] rounded-full bg-secondary/20 dark:bg-secondary/20 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 dark:bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
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
            onRefresh={() => {
              void refresh()
            }}
            sessionControl={<ActiveSessionWidget />}
            todaySetupBadge={todaySetup && todaySetupSummary ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTodaySetupDialogOpen(true)}
                className="h-auto max-w-full gap-2 rounded-full border-sky-500/25 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-500/15 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                title={todaySetup.name}
              >
                <GitBranch className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[18rem] truncate text-left">
                  Today setup: {todaySetupSummary}
                </span>
              </Button>
            ) : null}
          />

          <StatsCards filter={filter} stats={stats} isLoading={isDashboardLoading} />

          <KillzonesWidget />

          <div className="grid gap-6 lg:grid-cols-2">
            <ProfitChart filter={filter} profitTrajectory={profitTrajectory} isLoading={isDashboardLoading} />
            <WinLossChart filter={filter} data={winLossData} isLoading={isDashboardLoading} />
          </div>

          <OpenPositionsTable filter={filter} openPositions={openPositions} isLoading={isDashboardLoading} />

          <CalendarWidget filter={filter} />
        </div>
      </main>

      <TodaySetupDialog
        open={isTodaySetupDialogOpen}
        onOpenChange={setIsTodaySetupDialogOpen}
        setup={todaySetup}
      />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <DashboardContent />
}

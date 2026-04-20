"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppShellLoader } from "@/components/app-shell-loader"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { DashboardCommandCenter } from "@/components/dashboard/dashboard-command-center"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { WinLossChart } from "@/components/dashboard/win-loss-chart"
import { ProfitChart } from "@/components/dashboard/profit-chart"
import { CalendarWidget } from "@/components/dashboard/calendar-widget"
import { OpenPositionsTable } from "@/components/dashboard/open-positions-table"
import { ActiveSessionWidget } from "@/components/session/active-session-widget"
import { buildDashboardOverview } from "@/lib/dashboard-insights"
import { DashboardFilter } from "@/lib/enum/TradeEnum"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { useDashboardOverview } from "@/hooks/use-dashboard-overview"

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
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isDashboardEnabled = Boolean(user) && !isLoading
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

  if (isLoading) {
    return <AppShellLoader title="Loading your dashboard" description="Syncing your trades, analytics, and active session." />
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you back to your dashboard as soon as your session is ready." />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
          />

          <StatsCards filter={filter} stats={stats} isLoading={isDashboardLoading} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ProfitChart filter={filter} profitTrajectory={profitTrajectory} isLoading={isDashboardLoading} />
            <WinLossChart filter={filter} data={winLossData} isLoading={isDashboardLoading} />
          </div>

          <OpenPositionsTable filter={filter} openPositions={openPositions} isLoading={isDashboardLoading} />

          <CalendarWidget filter={filter} />
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />
}

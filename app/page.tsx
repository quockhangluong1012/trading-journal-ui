"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppShellLoader } from "@/components/app-shell-loader"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { WinLossChart } from "@/components/dashboard/win-loss-chart"
import { ProfitChart } from "@/components/dashboard/profit-chart"
import { CalendarWidget } from "@/components/dashboard/calendar-widget"
import { OpenPositionsTable } from "@/components/dashboard/open-positions-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateTradeDialog } from "@/components/create-trade-dialog"
import { ActiveSessionWidget } from "@/components/session/active-session-widget"
import { DashboardFilter } from "@/lib/enum/TradeEnum"
import { buildRedirectWithNext } from "@/lib/auth-redirect"

const timeFilterOptions = [
  { label: "1D", value: DashboardFilter.OneDay },
  { label: "1W", value: DashboardFilter.OneWeek },
  { label: "1M", value: DashboardFilter.OneMonth },
  { label: "3M", value: DashboardFilter.ThreeMonth },
  { label: "All", value: DashboardFilter.All },
]

function DashboardContent() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [filter, setFilter] = useState<DashboardFilter>(DashboardFilter.All)
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname))
    }
  }, [user, isLoading, pathname, router])

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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Track your trading performance at a glance
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <div className="flex w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1 sm:w-auto">
              {timeFilterOptions.map((option) => (
                <Button
                  key={option.label}
                  variant={filter === option.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(option.value)}
                  className="h-7 shrink-0 px-3 text-xs font-medium"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <ActiveSessionWidget />
            <CreateTradeDialog onSuccess={() => setRefreshKey(prev => prev + 1)}>
              <Button size="lg" className="gap-1">
                <Plus className="h-4 w-4" />
                New Trade
              </Button>
            </CreateTradeDialog>
          </div>
        </div>

        <div className="space-y-6">
          <StatsCards filter={filter} />

          <CalendarWidget filter={filter} />

          <div className="grid gap-6 lg:grid-cols-2">
            <WinLossChart filter={filter} />
            <ProfitChart filter={filter} />
          </div>

          <OpenPositionsTable refreshKey={refreshKey} filter={filter} />
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />
}

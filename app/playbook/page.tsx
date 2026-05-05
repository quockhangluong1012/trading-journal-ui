"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/header"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { AppShellLoader } from "@/components/app-shell-loader"
import { PlaybookDashboard } from "@/components/playbook/playbook-dashboard"
import { AnalyticsFilter, FILTER_LABELS } from "@/lib/analytics-api"
import { fetchPlaybookOverview, type PlaybookOverview } from "@/lib/playbook-api"

const TIME_RANGES = [{ label: "1W" }, { label: "1M" }, { label: "3M" }, { label: "6M" }, { label: "All" }] as const
type RangeLabel = (typeof TIME_RANGES)[number]["label"]

export default function PlaybookPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [range, setRange] = useState<RangeLabel>("All")
  const [overview, setOverview] = useState<PlaybookOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname))
    }
  }, [user, isAuthLoading, pathname, router])

  const loadData = useCallback(async (r: RangeLabel) => {
    setIsLoading(true)
    try {
      const filter = FILTER_LABELS[r] ?? AnalyticsFilter.AllTime
      const data = await fetchPlaybookOverview(filter)
      setOverview(data)
    } catch (err) {
      console.error("Failed to load playbook overview:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthLoading && user) void loadData(range)
  }, [loadData, range, isAuthLoading, user])

  if (isAuthLoading) return <AppShellLoader title="Loading playbook" description="Gathering your trading setups." />
  if (!user) return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        <PlaybookDashboard
          overview={overview}
          isLoading={isLoading}
          range={range}
          rangeOptions={TIME_RANGES}
          onRangeChange={(r) => setRange(r as RangeLabel)}
          onRefresh={() => loadData(range)}
        />
      </main>
    </div>
  )
}

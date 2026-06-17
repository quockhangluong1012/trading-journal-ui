"use client"

import Link from "next/link"
import { type ReactNode } from "react"
import {
  Activity,
  BarChart3,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react"
import { DashboardOverview } from "@/lib/dashboard-insights"
import { DashboardFilter } from "@/lib/enum/TradeEnum"
import { buildCreateTradeHref } from "@/lib/create-trade-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { AiMorningBriefing } from "./ai-morning-briefing"

interface FilterOption {
  label: string
  value: DashboardFilter
}

interface DashboardCommandCenterProps {
  filter: DashboardFilter
  filterLabel: string
  filterOptions: FilterOption[]
  onFilterChange: (value: DashboardFilter) => void
  overview: DashboardOverview
  userName?: string
  pathname: string
  lastUpdatedAt: Date | null
  isLoading: boolean
  isRefreshing: boolean
  syncWarning?: string | null
  onRefresh: () => void
  onNewTrade?: () => void
  todaySetupBadge?: ReactNode
  sessionControl: ReactNode
}

const toneSurface = {
  positive: "border-emerald-500/20 bg-emerald-500/5",
  neutral: "border-border/60 bg-muted/30",
  warning: "border-amber-500/20 bg-amber-500/5",
} as const

const toneIcon = {
  positive: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-muted-foreground",
  warning: "text-amber-600 dark:text-amber-400",
} as const

function getGreeting(name?: string): string {
  const hour = new Date().getHours()
  const firstName = name?.trim().split(/\s+/)[0]
  const greetingName = firstName && firstName.length > 0 ? `, ${firstName}` : ""

  if (hour < 12) {
    return `Good morning${greetingName}`
  }

  if (hour < 18) {
    return `Good afternoon${greetingName}`
  }

  return `Good evening${greetingName}`
}

function formatLastUpdated(lastUpdatedAt: Date | null): string {
  if (!lastUpdatedAt) {
    return "Waiting for first sync"
  }

  return `Updated ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(lastUpdatedAt)}`
}

function getInsightIcon(title: string) {
  switch (title) {
    case "Current streak":
      return Sparkles
    case "Best day":
      return Trophy
    case "Active trading days":
      return Activity
    case "Open setup quality":
      return ShieldCheck
    default:
      return Sparkles
  }
}

export function DashboardCommandCenter({
  filter,
  filterLabel,
  filterOptions,
  onFilterChange,
  overview,
  userName,
  pathname,
  lastUpdatedAt,
  isLoading,
  isRefreshing,
  syncWarning,
  onRefresh,
  onNewTrade,
  todaySetupBadge,
  sessionControl,
}: DashboardCommandCenterProps) {
  return (
    <section className="dashboard-card overflow-hidden p-5 sm:p-6 lg:p-8">
      {/* Meta row: context badges + live session / refresh */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {filterLabel}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {formatLastUpdated(lastUpdatedAt)}
          </Badge>
          {todaySetupBadge}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sessionControl}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-2 rounded-full border-border/60 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Greeting + summary */}
      <div className="mt-5 max-w-3xl space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {getGreeting(userName)}
        </h1>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {overview.summary}
          </p>
        )}
      </div>

      {/* Actionable focus line */}
      {!isLoading && overview.focusMessage ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-foreground/90">{overview.focusMessage}</p>
        </div>
      ) : null}

      {syncWarning ? (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {syncWarning}
        </div>
      ) : null}

      {/* Controls: time filter + primary navigation */}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full items-center gap-1 overflow-x-auto rounded-full border border-border/60 bg-background/60 p-1 shadow-sm sm:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filterOptions.map((option) => (
            <Button
              key={option.label}
              variant={filter === option.value ? "default" : "ghost"}
              size="sm"
              onClick={() => onFilterChange(option.value)}
              className={cn(
                "h-8 shrink-0 rounded-full px-4 text-xs font-semibold transition-colors",
                filter === option.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {onNewTrade ? (
            <Button size="sm" className="gap-2 rounded-full font-medium" onClick={onNewTrade}>
              <TrendingUp className="h-4 w-4" />
              New Trade
            </Button>
          ) : (
            <Button size="sm" className="gap-2 rounded-full font-medium" asChild>
              <Link href={buildCreateTradeHref(pathname)}>
                <TrendingUp className="h-4 w-4" />
                New Trade
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2 rounded-full border-border/60" asChild>
            <Link href="/review">
              <TrendingDown className="h-4 w-4" />
              Review
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-full border-border/60" asChild>
            <Link href="/analytics">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 rounded-full text-muted-foreground hover:text-foreground" asChild>
            <Link href="/history">
              <Clock3 className="h-4 w-4" />
              History
            </Link>
          </Button>
        </div>
      </div>

      {/* Unique at-a-glance insights (complementary to the KPI cards below) */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="mt-3 h-7 w-16 rounded-md" />
                <Skeleton className="mt-2 h-3 w-full rounded-md" />
              </div>
            ))
          : overview.insights.map((insight) => {
              const Icon = getInsightIcon(insight.title)

              return (
                <div
                  key={insight.title}
                  className={cn("rounded-xl border p-4", toneSurface[insight.tone])}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {insight.title}
                    </p>
                    <Icon className={cn("h-4 w-4", toneIcon[insight.tone])} />
                  </div>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                    {insight.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {insight.detail}
                  </p>
                </div>
              )
            })}
      </div>

      <div className="mt-5">
        <AiMorningBriefing />
      </div>
    </section>
  )
}

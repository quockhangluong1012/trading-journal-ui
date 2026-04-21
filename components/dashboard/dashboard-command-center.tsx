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
import { DashboardOverview, DashboardStats } from "@/lib/dashboard-insights"
import { DashboardFilter } from "@/lib/enum/TradeEnum"
import { buildCreateTradeHref } from "@/lib/create-trade-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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
  stats: DashboardStats
  userName?: string
  pathname: string
  lastUpdatedAt: Date | null
  isLoading: boolean
  isRefreshing: boolean
  syncWarning?: string | null
  onRefresh: () => void
  sessionControl: ReactNode
}

const toneClasses = {
  positive: "border-0 bg-emerald-50 text-emerald-600 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.1)] dark:bg-emerald-500/10 dark:text-emerald-400",
  neutral: "border-0 bg-muted/40 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] text-foreground",
  warning: "border-0 bg-amber-50 text-amber-600 shadow-[0_2px_10px_-3px_rgba(245,158,11,0.1)] dark:bg-amber-500/10 dark:text-amber-400",
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
  stats,
  userName,
  pathname,
  lastUpdatedAt,
  isLoading,
  isRefreshing,
  syncWarning,
  onRefresh,
  sessionControl,
}: DashboardCommandCenterProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border-0 bg-card shadow-[0_2px_20px_-5px_rgba(6,81,237,0.08)]">
      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.45fr)_360px] lg:grid-rows-[auto_auto] lg:px-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Dashboard pulse
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[11px]"
            >
              {filterLabel}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground"
            >
              {formatLastUpdated(lastUpdatedAt)}
            </Badge>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {getGreeting(userName)}
            </h1>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
                <Skeleton className="h-4 w-full max-w-xl rounded-md" />
              </div>
            ) : (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {overview.summary}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-background/80 p-1 sm:w-auto">
              {filterOptions.map((option) => (
                <Button
                  key={option.label}
                  variant={filter === option.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onFilterChange(option.value)}
                  className="h-8 shrink-0 rounded-xl px-3 text-xs font-medium"
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="lg" className="gap-2" asChild>
                <Link href={buildCreateTradeHref(pathname)}>
                  <TrendingUp className="h-4 w-4" />
                  New Trade
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <Link href="/review">
                  <TrendingDown className="h-4 w-4" />
                  Review
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" asChild>
                <Link href="/analytics">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Link>
              </Button>
            </div>
          </div>

          {syncWarning ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
              {syncWarning}
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.75rem] border-0 bg-card p-7 shadow-[0_2px_20px_-5px_rgba(6,81,237,0.08)] lg:row-span-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Current focus
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-foreground">{overview.focusMessage}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border-0 bg-muted/40 p-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Win rate</span>
                <span>{stats.winRate.toFixed(1)}%</span>
              </div>
              <Progress value={Math.max(0, Math.min(stats.winRate, 100))} className="mt-3 h-1.5" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-0 bg-muted/40 p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Open book
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{stats.openPositions}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {overview.openPositionsSummary.longCount} long / {overview.openPositionsSummary.shortCount} short
                </p>
              </div>

              <div className="rounded-2xl border-0 bg-muted/40 p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Setup quality
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {overview.openPositionsSummary.avgRiskReward !== null
                    ? `${overview.openPositionsSummary.avgRiskReward.toFixed(1)}R`
                    : "Clear"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {overview.openPositionsSummary.highConfidenceCount} high-conviction ideas live
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {sessionControl}
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" asChild>
                <Link href="/history">
                  <Clock3 className="h-4 w-4" />
                  History
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div>
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {overview.insights.map((insight) => {
            const Icon = getInsightIcon(insight.title)

            return (
              <div
                key={insight.title}
                className={cn(
                  "rounded-[1.25rem] p-5 transition-all hover:shadow-[0_4px_15px_-5px_rgba(0,0,0,0.05)]",
                  toneClasses[insight.tone],
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {insight.title}
                  </p>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{insight.value}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {insight.detail}
                </p>
              </div>
            )
          })}
          </div>
        </div>
      </div>
    </section>
  )
}
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
  positive: "border border-emerald-500/30 bg-linear-to-br from-emerald-500/10 to-emerald-500/5 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all duration-300 hover:-translate-y-0.5 group",
  neutral: "border border-border/70 bg-linear-to-br from-background/80 to-muted/30 text-foreground shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group",
  warning: "border border-amber-500/30 bg-linear-to-br from-amber-500/10 to-amber-500/5 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] transition-all duration-300 hover:-translate-y-0.5 group",
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
    <section className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-linear-to-br from-background via-background/95 to-primary/10 shadow-2xl backdrop-blur-xl transition-all">
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-secondary/20 blur-[80px]" />
      <div className="relative z-10 grid gap-6 px-4 py-6 sm:px-6 sm:py-8 xl:grid-cols-[minmax(0,1.45fr)_360px] xl:grid-rows-[auto_auto] xl:px-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/10"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Dashboard pulse
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-border/70 bg-background/80 px-3 py-1.5 text-xs shadow-sm backdrop-blur-md"
            >
              {filterLabel}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-md"
            >
              {formatLastUpdated(lastUpdatedAt)}
            </Badge>
          </div>

          <div className="space-y-3">
            <h1 className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold 
            tracking-tight text-transparent md:text-5xl min-h-[40px] md:min-h-[60px]">
              {getGreeting(userName)}
            </h1>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
                <Skeleton className="h-4 w-full max-w-xl rounded-md" />
              </div>
            ) : (
              <p className="max-w-3xl text-base sm:text-lg font-medium leading-relaxed text-foreground/90 md:text-xl">
                {overview.summary}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex w-full items-center gap-1 overflow-x-auto rounded-full border border-border/70 bg-background/50 backdrop-blur-md p-1.5 shadow-sm sm:w-auto">
              {filterOptions.map((option) => (
                <Button
                  key={option.label}
                  variant={filter === option.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onFilterChange(option.value)}
                  className={cn(
                    "h-9 shrink-0 rounded-full px-4 text-xs font-semibold transition-all duration-300",
                    filter === option.value ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted/80 hover:text-foreground text-muted-foreground"
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="default" className="gap-2 rounded-full bg-primary font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary/90" asChild>
                <Link href={buildCreateTradeHref(pathname)}>
                  <TrendingUp className="h-4 w-4" />
                  New Trade
                </Link>
              </Button>
              <Button variant="outline" size="default" className="gap-2 rounded-full border-border/70 bg-background/50 shadow-sm backdrop-blur-md transition-all hover:bg-accent/50" asChild>
                <Link href="/review">
                  <TrendingDown className="h-4 w-4" />
                  Review
                </Link>
              </Button>
              <Button variant="outline" size="default" className="gap-2 rounded-full border-border/70 bg-background/50 shadow-sm backdrop-blur-md transition-all hover:bg-accent/50" asChild>
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

        <div className="group mt-2 overflow-hidden rounded-2xl border border-primary/10 bg-linear-to-br from-background/90 to-primary/5 p-6 shadow-lg backdrop-blur-md transition-all hover:border-primary/30 hover:shadow-primary/5 xl:row-span-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary/80">
              <Sparkles className="h-4 w-4 text-primary" />
              Current focus
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2 rounded-full border-border/70 bg-background/50 backdrop-blur-md transition-all hover:bg-accent/50 text-xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
              </div>
            ) : (
              <p className="text-base leading-relaxed text-foreground/90">{overview.focusMessage}</p>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-primary/10 bg-background/50 p-5 backdrop-blur-md transition-all hover:bg-background/80">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Win rate</span>
                <span className="text-foreground">{stats.winRate.toFixed(1)}%</span>
              </div>
              <Progress value={Math.max(0, Math.min(stats.winRate, 100))} className="mt-3 h-2 rounded-full" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="group/stat rounded-xl border border-primary/10 bg-background/50 p-5 backdrop-blur-md transition-all hover:bg-background/80 hover:-translate-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover/stat:text-primary transition-colors">
                  Open book
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{stats.openPositions}</p>
                <p className="mt-1.5 text-xs font-medium leading-relaxed opacity-80 text-muted-foreground">
                  {overview.openPositionsSummary.longCount} long / {overview.openPositionsSummary.shortCount} short
                </p>
              </div>

              <div className="group/stat rounded-xl border border-primary/10 bg-background/50 p-5 backdrop-blur-md transition-all hover:bg-background/80 hover:-translate-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover/stat:text-primary transition-colors">
                  Setup quality
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                  {overview.openPositionsSummary.avgRiskReward !== null
                    ? `${overview.openPositionsSummary.avgRiskReward.toFixed(1)}R`
                    : "Clear"}
                </p>
                <p className="mt-1.5 text-xs font-medium leading-relaxed opacity-80 text-muted-foreground">
                  {overview.openPositionsSummary.highConfidenceCount} high-conviction ideas live
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              {sessionControl}
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary rounded-full transition-colors" asChild>
                <Link href="/history">
                  <Clock3 className="h-4 w-4" />
                  History
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:self-stretch xl:justify-center">
          <div className="grid gap-4 sm:grid-cols-2">
          {overview.insights.map((insight) => {
            const Icon = getInsightIcon(insight.title)

            return (
              <div
                key={insight.title}
                className={cn(
                  "flex flex-col justify-between rounded-2xl p-5",
                  toneClasses[insight.tone],
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                    {insight.title}
                  </p>
                  <Icon className="h-4 w-4 opacity-80" />
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold tracking-tight">{insight.value}</p>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed opacity-80">
                    {insight.detail}
                  </p>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      </div>
    </section>
  )
}
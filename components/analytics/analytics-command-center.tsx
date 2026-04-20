"use client"

import { type ReactNode, useMemo } from "react"
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Layers,
  Lightbulb,
  Loader2,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  AssetBreakdown,
  Insight,
  PerformanceSummary,
} from "@/lib/analytics-api"
import {
  buildAnalyticsNarrative,
  buildAnalyticsPulse,
  getTopAsset,
  type AnalyticsTone,
} from "@/lib/analytics-overview"
import { cn } from "@/lib/utils"

export type AnalyticsTabValue = "overview" | "performance" | "breakdown" | "insights"

interface RangeOption {
  label: string
}

interface AnalyticsCommandCenterProps {
  range: string
  rangeOptions: readonly RangeOption[]
  onRangeChange: (nextRange: string) => void
  analytics: PerformanceSummary
  assetData: AssetBreakdown[]
  insights: Insight[]
  isLoading: boolean
  isRefreshing: boolean
  lastUpdatedAt: Date | null
  syncWarning?: string | null
  exportAction: ReactNode
  onSelectTab: (value: AnalyticsTabValue) => void
}

const toneClasses: Record<AnalyticsTone, string> = {
  positive: "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
  neutral: "border-border/70 bg-background/70 text-foreground",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-400",
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

export function AnalyticsCommandCenter({
  range,
  rangeOptions,
  onRangeChange,
  analytics,
  assetData,
  insights,
  isLoading,
  isRefreshing,
  lastUpdatedAt,
  syncWarning,
  exportAction,
  onSelectTab,
}: AnalyticsCommandCenterProps) {
  const topAsset = useMemo(() => getTopAsset(assetData), [assetData])
  const narrative = useMemo(
    () =>
      buildAnalyticsNarrative({
        analytics,
        rangeLabel: range,
        topAsset,
      }),
    [analytics, range, topAsset],
  )
  const pulseCards = useMemo(
    () => buildAnalyticsPulse(analytics, topAsset),
    [analytics, topAsset],
  )
  const focusInsight = insights[0] ?? null

  return (
    <section className="overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-background via-background to-primary/5 shadow-sm">
      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.45fr)_360px] lg:px-8">
        <div className="flex h-full flex-col gap-5">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Performance intelligence
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[11px]"
              >
                {range}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground"
              >
                {formatLastUpdated(lastUpdatedAt)}
              </Badge>
              {isRefreshing ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing
                </Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Analytics cockpit
              </h1>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full max-w-2xl rounded-md" />
                  <Skeleton className="h-4 w-full max-w-3xl rounded-md" />
                  <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
                </div>
              ) : (
                <>
                  <p className="max-w-3xl text-base leading-relaxed text-foreground md:text-lg">
                    {narrative.headline}
                  </p>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                    {narrative.detail}
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-background/80 p-1 sm:w-auto">
                {rangeOptions.map((option) => (
                  <Button
                    key={option.label}
                    variant={range === option.label ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onRangeChange(option.label)}
                    className="h-8 shrink-0 rounded-xl px-3 text-xs font-medium"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {exportAction}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => onSelectTab("performance")}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Performance
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => onSelectTab("insights")}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Insights
                </Button>
              </div>
            </div>

            {syncWarning ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                {syncWarning}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(0,1fr))]">
            <div className="rounded-2xl border border-primary/15 bg-linear-to-br from-primary/8 via-background to-background p-4 shadow-sm xl:col-span-1">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Next focus
              </div>
              {focusInsight ? (
                <>
                  <p className="mt-3 text-sm font-medium text-foreground">{focusInsight.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {focusInsight.description}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 -ml-2 gap-2 text-muted-foreground"
                    onClick={() => onSelectTab("insights")}
                  >
                    <BarChart3 className="h-4 w-4" />
                    Open insights workspace
                  </Button>
                </>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Insights will appear here as soon as the analytics service returns guidance for this range.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-primary" />
                Closure
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {analytics.totalClosed}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {analytics.wins} winners and {analytics.losses} losers closed in this window.
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                Payoff
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {analytics.avgRiskReward.toFixed(1)}:1
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Average risk-to-reward across the selected trade set.
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                Stability
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {analytics.sharpeRatio.toFixed(2)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Sharpe ratio with {analytics.maxDrawdownPct.toFixed(1)}% max drawdown.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/85 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Performance pulse
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The fastest read on what deserves attention right now.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => onSelectTab("breakdown")}
            >
              <Layers className="h-4 w-4" />
              Breakdown
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-border/70 bg-background/70 p-4"
                  >
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="mt-3 h-7 w-24 rounded-md" />
                    <Skeleton className="mt-2 h-3 w-full rounded-md" />
                  </div>
                ))
              : pulseCards.map((pulse) => (
                  <div
                    key={pulse.label}
                    className={cn(
                      "rounded-2xl border p-4 shadow-sm backdrop-blur-sm",
                      toneClasses[pulse.tone],
                    )}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {pulse.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight">{pulse.value}</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {pulse.detail}
                    </p>
                  </div>
                ))}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Use Breakdown to isolate instrument behavior, then jump into Insights for the recommendation trail.
          </div>
        </div>
      </div>
    </section>
  )
}
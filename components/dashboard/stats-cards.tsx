"use client"

import { Activity, Gauge, ShieldAlert, Target, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { DashboardStats } from "@/lib/dashboard-insights"

interface StatsCardsProps {
  stats?: DashboardStats
  isLoading?: boolean
}

const EMPTY_STATS: DashboardStats = {
  totalPnL: 0,
  winRate: 0,
  totalTrades: 0,
  openPositions: 0,
  expectancy: 0,
  profitFactor: 0,
  dailyLimitUsedPercent: 0,
  weeklyCapUsedPercent: 0,
}

// A single accent color per card — applied only to the icon chip and (where it
// carries meaning) the value. The card surface itself stays neutral and calm.
type Accent = "emerald" | "rose" | "blue" | "cyan" | "amber" | "indigo" | "violet" | "neutral"

const accentIcon: Record<Accent, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  neutral: "bg-muted text-muted-foreground",
}

const accentValue: Record<Accent, string> = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  rose: "text-rose-600 dark:text-rose-400",
  blue: "text-foreground",
  cyan: "text-foreground",
  amber: "text-amber-600 dark:text-amber-400",
  indigo: "text-foreground",
  violet: "text-foreground",
  neutral: "text-foreground",
}

function formatProfitFactor(value: number): string {
  if (Number.isNaN(value)) {
    return "N/A"
  }

  if (value === Number.POSITIVE_INFINITY) {
    return "Inf"
  }

  if (!Number.isFinite(value) || value < 0) {
    return "0.00"
  }

  return value.toFixed(2)
}

export function StatsCards({ stats = EMPTY_STATS, isLoading = false }: StatsCardsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)

  const cards: Array<{
    title: string
    value: string
    icon: typeof TrendingUp
    accent: Accent
    tintValue?: boolean
  }> = [
    {
      title: "Total P&L",
      value: formatCurrency(stats.totalPnL),
      icon: stats.totalPnL >= 0 ? TrendingUp : TrendingDown,
      accent: stats.totalPnL >= 0 ? "emerald" : "rose",
      tintValue: true,
    },
    {
      title: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Target,
      accent: "blue",
    },
    {
      title: "Expectancy",
      value: formatCurrency(stats.expectancy),
      icon: Target,
      accent: stats.expectancy >= 0 ? "cyan" : "amber",
      tintValue: stats.expectancy < 0,
    },
    {
      title: "Profit Factor",
      value: formatProfitFactor(stats.profitFactor),
      icon: Activity,
      accent: stats.profitFactor >= 1.6 ? "emerald" : stats.profitFactor >= 1 ? "blue" : "rose",
      tintValue: stats.profitFactor < 1,
    },
    {
      title: "Total Trades",
      value: stats.totalTrades.toString(),
      icon: Activity,
      accent: "indigo",
    },
    {
      title: "Daily Limit Used",
      value: `${stats.dailyLimitUsedPercent.toFixed(1)}%`,
      icon: stats.dailyLimitUsedPercent >= 100 ? ShieldAlert : Gauge,
      accent:
        stats.dailyLimitUsedPercent >= 100
          ? "rose"
          : stats.dailyLimitUsedPercent >= 75
            ? "amber"
            : "violet",
      tintValue: stats.dailyLimitUsedPercent >= 75,
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="dashboard-card p-5">
            <CardContent className="flex items-start justify-between p-0">
              <div className="space-y-3">
                <Skeleton className="h-3.5 w-20 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="dashboard-card p-5">
          <CardContent className="flex items-start justify-between p-0">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {card.title}
              </p>
              <p
                className={cn(
                  "truncate text-2xl font-bold tracking-tight",
                  card.tintValue ? accentValue[card.accent] : "text-foreground",
                )}
              >
                {card.value}
              </p>
            </div>
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                accentIcon[card.accent],
              )}
            >
              <card.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

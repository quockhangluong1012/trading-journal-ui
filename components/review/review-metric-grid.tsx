"use client"

import type { ElementType } from "react"
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarRange,
  Crosshair,
  Target,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ReviewData } from "@/lib/review-api"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

interface ReviewMetricCardProps {
  icon: ElementType
  label: string
  value: string
  sub: string
  tone: "positive" | "neutral" | "warning"
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

function getToneClasses(tone: ReviewMetricCardProps["tone"]): { accent: string; surface: string } {
  switch (tone) {
    case "positive":
      return {
        accent: "text-emerald-400",
        surface: "border-emerald-500/20 bg-emerald-500/8",
      }
    case "warning":
      return {
        accent: "text-red-400",
        surface: "border-red-500/20 bg-red-500/8",
      }
    default:
      return {
        accent: "text-primary",
        surface: "border-primary/20 bg-primary/8",
      }
  }
}

function ReviewMetricCard({ icon: Icon, label, sub, tone, value }: ReviewMetricCardProps) {
  const classes = getToneClasses(tone)

  return (
    <Card className="overflow-hidden border-border/70 bg-linear-to-b from-card to-card/80 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            <p className={`text-2xl font-semibold tracking-tight ${classes.accent}`}>{value}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{sub}</p>
          </div>
          <div className={`rounded-2xl border p-2.5 shadow-sm ${classes.surface}`}>
            <Icon className={`h-4 w-4 ${classes.accent}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ReviewMetricGridProps {
  isLoading: boolean
  review: ReviewData | null
}

export function ReviewMetricGrid({ isLoading, review }: ReviewMetricGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="border-border/70 bg-card/85">
            <CardContent className="space-y-3 pt-5 pb-4">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-7 w-28 rounded-md" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const data = review ?? {
    totalPnl: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    averageWin: 0,
    averageLoss: 0,
    bestTradePnl: 0,
    worstTradePnl: 0,
    bestDayPnl: 0,
    worstDayPnl: 0,
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <ReviewMetricCard
        icon={Target}
        label="Net P&L"
        value={formatCurrency(data.totalPnl)}
        sub={`${data.wins} winners / ${data.losses} losers`}
        tone={data.totalPnl > 0 ? "positive" : data.totalPnl < 0 ? "warning" : "neutral"}
      />
      <ReviewMetricCard
        icon={Crosshair}
        label="Win rate"
        value={`${data.winRate.toFixed(1)}%`}
        sub={`${data.wins} wins from ${review?.totalTrades ?? 0} trades`}
        tone={data.winRate >= 55 ? "positive" : data.winRate >= 45 ? "neutral" : "warning"}
      />
      <ReviewMetricCard
        icon={ArrowUpCircle}
        label="Average win"
        value={formatCurrency(data.averageWin)}
        sub={`Best trade ${formatCurrency(data.bestTradePnl)}`}
        tone={data.averageWin > 0 ? "positive" : "neutral"}
      />
      <ReviewMetricCard
        icon={ArrowDownCircle}
        label="Average loss"
        value={formatCurrency(data.averageLoss)}
        sub={`Worst trade ${formatCurrency(data.worstTradePnl)}`}
        tone={data.averageLoss < 0 ? "warning" : "neutral"}
      />
      <ReviewMetricCard
        icon={CalendarRange}
        label="Best day"
        value={formatCurrency(data.bestDayPnl)}
        sub={`Worst day ${formatCurrency(data.worstDayPnl)}`}
        tone={data.bestDayPnl > 0 ? "positive" : "neutral"}
      />
      <ReviewMetricCard
        icon={AlertTriangle}
        label="Rule breaks"
        value={String(review?.ruleBreakTrades ?? 0)}
        sub={`${review?.highConfidenceTrades ?? 0} high-confidence trades`}
        tone={(review?.ruleBreakTrades ?? 0) > 1 ? "warning" : "positive"}
      />
    </div>
  )
}
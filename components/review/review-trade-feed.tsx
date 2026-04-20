"use client"

import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ReviewTrade } from "@/lib/review-api"
import { cn } from "@/lib/utils"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const confidenceLabels = ["None", "Very Low", "Low", "Neutral", "High", "Very High"]

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "—"
  }

  return currencyFormatter.format(value)
}

function formatClosedDate(value: string | null): string {
  if (!value) {
    return "No close date"
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return "—"
  }

  return value.toFixed(2)
}

function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-colors",
            value >= index + 1 ? "bg-primary" : "bg-border",
          )}
        />
      ))}
      <span className="text-xs text-muted-foreground">{confidenceLabels[value] ?? `Level ${value}`}</span>
    </div>
  )
}

interface ReviewTradeFeedProps {
  isLoading: boolean
  trades: ReviewTrade[]
}

export function ReviewTradeFeed({ isLoading, trades }: ReviewTradeFeedProps) {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="gap-1">
        <CardTitle className="text-lg text-foreground">Closed trades</CardTitle>
        <CardDescription>
          Period closes with confidence, zone, and discipline context for each trade.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="mt-3 h-3 w-48 rounded-md" />
                <Skeleton className="mt-3 h-3 w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : trades.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-6 py-10 text-center text-sm text-muted-foreground">
            No trades were closed in this review window.
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => {
              const isPositive = trade.pnl !== null && trade.pnl > 0

              return (
                <div
                  key={trade.id}
                  className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{trade.asset}</p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-7 border px-3 text-xs font-medium",
                            trade.position === "Long"
                              ? "border-emerald-500/20 bg-emerald-500/12 text-emerald-400"
                              : "border-red-500/20 bg-red-500/12 text-red-400",
                          )}
                        >
                          {trade.position === "Long" ? (
                            <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="mr-1 h-3.5 w-3.5" />
                          )}
                          {trade.position}
                        </Badge>

                        {trade.tradingZone ? (
                          <Badge
                            variant="outline"
                            className="h-7 border-border/70 bg-background/80 px-3 text-xs text-muted-foreground"
                          >
                            {trade.tradingZone}
                          </Badge>
                        ) : null}

                        {trade.isRuleBroken ? (
                          <Badge
                            variant="outline"
                            className="h-7 border-amber-500/20 bg-amber-500/10 px-3 text-xs text-amber-400"
                          >
                            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                            Rule break
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span>{formatClosedDate(trade.closedDate)}</span>
                        <span>
                          Entry {formatPrice(trade.entryPrice)} → Exit {formatPrice(trade.exitPrice)}
                        </span>
                      </div>

                      <ConfidenceMeter value={trade.confidenceLevel} />

                      {trade.ruleBreakReason ? (
                        <p className="max-w-2xl text-xs leading-relaxed text-amber-400/90">
                          {trade.ruleBreakReason}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-left lg:text-right">
                      <p
                        className={cn(
                          "text-xl font-semibold tracking-tight",
                          isPositive ? "text-emerald-400" : "text-red-400",
                        )}
                      >
                        {formatCurrency(trade.pnl)}
                      </p>
                      <p className="text-xs text-muted-foreground">Trade #{trade.id}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
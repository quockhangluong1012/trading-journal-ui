"use client"

import { ArrowDownRight, ArrowUpRight, BarChart3, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import type { UseReviewWizardResult } from "@/hooks/use-review-wizard"

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

function MetricCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone: "positive" | "negative" | "neutral"
}) {
  const colors = {
    positive: "text-emerald-400 border-emerald-500/20 bg-emerald-500/8",
    negative: "text-red-400 border-red-500/20 bg-red-500/8",
    neutral: "text-primary border-primary/20 bg-primary/8",
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${colors[tone]}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs opacity-70">{sub}</p>
    </div>
  )
}

function ComparativeRow({
  label,
  current,
  previous,
  format = "number",
}: {
  label: string
  current: number
  previous: number | undefined
  format?: "number" | "currency" | "percent"
}) {
  const fmt = (v: number) => {
    if (format === "currency") return currencyFmt.format(v)
    if (format === "percent") return `${v.toFixed(1)}%`
    return String(v)
  }

  const diff = previous !== undefined ? current - previous : null
  const diffPct = previous && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-foreground">{fmt(current)}</span>
        {diff !== null && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              diff > 0 ? "text-emerald-400" : diff < 0 ? "text-red-400" : "text-muted-foreground"
            }`}
          >
            {diff > 0 ? <ArrowUpRight className="h-3 w-3" /> : diff < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
            {diffPct !== null ? `${Math.abs(diffPct).toFixed(0)}%` : fmt(Math.abs(diff))}
          </span>
        )}
      </div>
    </div>
  )
}

export function WizardStepPerformance({ wizard }: { wizard: UseReviewWizardResult }) {
  const { wizardData, form, updateForm } = wizard
  const current = wizardData?.current
  const previous = wizardData?.previous

  if (!current) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Net P&L"
          value={currencyFmt.format(current.totalPnl)}
          sub={`${current.totalTrades} trades`}
          tone={current.totalPnl > 0 ? "positive" : current.totalPnl < 0 ? "negative" : "neutral"}
        />
        <MetricCard
          label="Win Rate"
          value={`${current.winRate.toFixed(1)}%`}
          sub={`${current.wins}W / ${current.losses}L`}
          tone={current.winRate >= 55 ? "positive" : current.winRate >= 45 ? "neutral" : "negative"}
        />
        <MetricCard
          label="Profit Factor"
          value={current.profitFactor > 0 ? current.profitFactor.toFixed(2) : "–"}
          sub="Win $ / Loss $"
          tone={current.profitFactor >= 1.5 ? "positive" : current.profitFactor >= 1 ? "neutral" : "negative"}
        />
        <MetricCard
          label="Expectancy"
          value={currencyFmt.format(current.expectancy)}
          sub="Avg per trade"
          tone={current.expectancy > 0 ? "positive" : current.expectancy < 0 ? "negative" : "neutral"}
        />
      </div>

      {/* Comparative table */}
      {previous && (
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              vs Previous Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ComparativeRow label="Net P&L" current={current.totalPnl} previous={previous.totalPnl} format="currency" />
            <ComparativeRow label="Win Rate" current={current.winRate} previous={previous.winRate} format="percent" />
            <ComparativeRow label="Total Trades" current={current.totalTrades} previous={previous.totalTrades} />
            <ComparativeRow label="Avg Win" current={current.averageWin} previous={previous.averageWin} format="currency" />
            <ComparativeRow label="Avg Loss" current={current.averageLoss} previous={previous.averageLoss} format="currency" />
            <ComparativeRow label="Rule Breaks" current={current.ruleBreakTrades} previous={previous.ruleBreakTrades} />
          </CardContent>
        </Card>
      )}

      {/* Rating + notes */}
      <Card className="border-border/70 bg-card/85">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Execution Rating
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              How well did you execute your setups this period?
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateForm("executionRating", v)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 text-sm font-bold transition-all ${
                    form.executionRating === v
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "border-border/70 bg-background/80 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="What stood out about your execution this period? Any patterns you noticed?"
            value={form.performanceNotes}
            onChange={(e) => updateForm("performanceNotes", e.target.value)}
            rows={3}
            className="resize-none"
          />
        </CardContent>
      </Card>
    </div>
  )
}

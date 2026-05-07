"use client"

import { useState } from "react"
import { BrainCircuit, Loader2, Sparkles, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { optimizePlaybook, type PlaybookOptimizationResult } from "@/lib/ai-insights-api"

type RangeLabel = "1W" | "1M" | "3M" | "6M" | "All"

interface AiPlaybookOptimizerCardProps {
  rangeLabel: RangeLabel
}

const actionStyles: Record<string, string> = {
  prioritize: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  refine: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  retire: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  observe: "border-border/70 bg-secondary/20 text-muted-foreground",
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getRangePayload(rangeLabel: RangeLabel): { fromDate?: string | null; toDate?: string | null } {
  const today = new Date()
  const fromDate = new Date(today)

  switch (rangeLabel) {
    case "1W":
      fromDate.setDate(today.getDate() - 7)
      break
    case "1M":
      fromDate.setMonth(today.getMonth() - 1)
      break
    case "3M":
      fromDate.setMonth(today.getMonth() - 3)
      break
    case "6M":
      fromDate.setMonth(today.getMonth() - 6)
      break
    default:
      return { fromDate: null, toDate: null }
  }

  return {
    fromDate: fromDate.toISOString().slice(0, 10),
    toDate: today.toISOString().slice(0, 10),
  }
}

export function AiPlaybookOptimizerCard({ rangeLabel }: AiPlaybookOptimizerCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PlaybookOptimizationResult | null>(null)

  const handleOptimize = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setResult(await optimizePlaybook(getRangePayload(rangeLabel)))
    } catch (optimizationError) {
      setError(optimizationError instanceof Error ? optimizationError.message : "AI playbook optimization is unavailable right now.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <BrainCircuit className="h-4 w-4 text-primary" />
          AI playbook optimizer
        </CardTitle>
        <CardDescription>
          Use the current range to rank which setups deserve more focus, more work, or less capital.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="rounded-2xl border border-primary/15 bg-background/75 px-4 py-3 text-sm text-muted-foreground">
            {result ? `${result.sampleSize} setup${result.sampleSize === 1 ? "" : "s"} analyzed in this range.` : "Run the optimizer after choosing a time range above."}
          </div>
          <Button type="button" variant="outline" onClick={() => void handleOptimize()} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isLoading ? "Optimizing..." : "Optimize playbook"}
          </Button>
        </div>

        {error ? <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
              <p className="text-sm text-foreground">{result.summary}</p>
            </div>

            {result.recommendations.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {result.recommendations.map((recommendation) => (
                  <div key={recommendation.setupId} className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{recommendation.setupName}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className={cn("capitalize", actionStyles[recommendation.action] ?? actionStyles.observe)}>
                            {recommendation.action}
                          </Badge>
                          <Badge variant="outline" className="border-border/70 bg-secondary/30 text-foreground">
                            Grade {recommendation.grade}
                          </Badge>
                          <Badge variant="outline" className="border-border/70 bg-background text-muted-foreground">
                            {Math.round(recommendation.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      </div>
                      <div className={cn(
                        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                        recommendation.totalPnl >= 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300",
                      )}>
                        {recommendation.totalPnl >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {formatCurrency(recommendation.totalPnl)}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{recommendation.rationale}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-2 text-xs">
                        <p className="text-muted-foreground">Trades</p>
                        <p className="mt-1 font-semibold text-foreground">{recommendation.totalTrades}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-2 text-xs">
                        <p className="text-muted-foreground">Win rate</p>
                        <p className="mt-1 font-semibold text-foreground">{recommendation.winRate.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-2 text-xs">
                        <p className="text-muted-foreground">Expectancy</p>
                        <p className="mt-1 font-semibold text-foreground">{formatCurrency(recommendation.expectancy)}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-secondary/20 px-3 py-2 text-xs">
                        <p className="text-muted-foreground">Avg R:R</p>
                        <p className="mt-1 font-semibold text-foreground">{recommendation.avgRiskReward.toFixed(1)}:1</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">Next move</p>
                      <p className="mt-2 text-sm text-foreground">{recommendation.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                There is not enough setup evidence in this range to recommend a portfolio shift yet.
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
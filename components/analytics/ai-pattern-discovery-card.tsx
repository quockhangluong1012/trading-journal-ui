"use client"

import { useState } from "react"
import { Brain, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { discoverTradePatterns, type TradePatternDiscoveryResult } from "@/lib/ai-insights-api"

type AnalyticsRangeLabel = "1W" | "1M" | "3M" | "6M" | "All"

interface AiPatternDiscoveryCardProps {
  rangeLabel: AnalyticsRangeLabel
  surfaceClassName: string
}

export function AiPatternDiscoveryCard({ rangeLabel, surfaceClassName }: AiPatternDiscoveryCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TradePatternDiscoveryResult | null>(null)

  const handleDiscover = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setResult(await discoverTradePatterns(getRangePayload(rangeLabel)))
    } catch {
      setError("Pattern mining is unavailable right now.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={surfaceClassName}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Brain className="h-4 w-4 text-primary" />
          AI pattern mining
        </CardTitle>
        <CardDescription className="text-muted-foreground">Look for multi-variable edges and hidden failure modes in the selected range.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" variant="outline" onClick={() => void handleDiscover()} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isLoading ? "Mining patterns..." : "Discover patterns"}
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Summary</p>
              <p className="mt-2 text-sm text-foreground">{result.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">Sample size: {result.sampleSize} closed trades</p>
            </div>

            {result.patterns.length > 0 ? (
              <div className="space-y-3">
                {result.patterns.map((pattern) => (
                  <div key={`${pattern.category}-${pattern.title}`} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{pattern.title}</p>
                      <span className="text-xs text-muted-foreground">{Math.round(pattern.confidence * 100)}%</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{pattern.description}</p>
                    <p className="mt-2 text-xs text-foreground/80">{pattern.evidence}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {result.actionItems.length > 0 ? (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">Action items</p>
                <div className="mt-2 space-y-2">
                  {result.actionItems.map((item) => (
                    <p key={item} className="text-sm text-foreground">{item}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function getRangePayload(rangeLabel: AnalyticsRangeLabel): { fromDate?: string | null; toDate?: string | null } {
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
"use client"

import { useState } from "react"
import { AlertTriangle, BrainCircuit, Loader2, ShieldAlert, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { generateRiskAdvice, type AiRiskAdvisorResult } from "@/lib/ai-insights-api"
import { cn } from "@/lib/utils"

const riskLevelStyles: Record<string, string> = {
  low: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  medium: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  critical: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}% confidence`
}

export function AiRiskAdvisorCard() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AiRiskAdvisorResult | null>(null)

  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setResult(await generateRiskAdvice())
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "AI risk advisor is unavailable right now.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-primary/15 bg-linear-to-br from-primary/5 via-background to-background shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <BrainCircuit className="h-4 w-4 text-primary" />
          AI risk advisor
        </CardTitle>
        <CardDescription>
          Review your active exposure, drawdown posture, and position sizing before you add new risk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="rounded-2xl border border-primary/15 bg-background/75 px-4 py-3 text-sm text-muted-foreground">
            {result
              ? "AI guidance is based on your current risk dashboard and open exposure."
              : "Generate a fresh AI read on your portfolio risk before scaling up or adding correlated positions."}
          </div>
          <Button type="button" variant="outline" onClick={() => void handleGenerate()} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isLoading ? "Generating..." : result ? "Refresh advice" : "Generate AI advice"}
          </Button>
        </div>

        {error ? <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

        {result ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  riskLevelStyles[result.riskLevel.toLowerCase()] ?? riskLevelStyles.medium,
                )}
              >
                <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                {result.riskLevel} risk
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background text-muted-foreground">
                {formatConfidence(result.confidence)}
              </Badge>
              {result.shouldReduceRisk ? (
                <Badge variant="outline" className="border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300">
                  <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                  Reduce risk
                </Badge>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
              <p className="text-sm text-foreground">{result.summary}</p>
            </div>

            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">Position sizing advice</p>
              <p className="mt-2 text-sm text-foreground">{result.positionSizingAdvice}</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Key risks</p>
                <div className="mt-3 space-y-2">
                  {result.keyRisks.length > 0 ? (
                    result.keyRisks.map((item) => (
                      <p key={item} className="text-sm text-foreground">{item}</p>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No acute risk driver was highlighted.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Action items</p>
                <div className="mt-3 space-y-2">
                  {result.actionItems.length > 0 ? (
                    result.actionItems.map((item) => (
                      <p key={item} className="text-sm text-foreground">{item}</p>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No immediate action item was generated.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
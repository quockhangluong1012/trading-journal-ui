"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, BrainCircuit, Layers, Loader2, Radar, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { analyzeChartScreenshot, type ChartScreenshotAnalysisResult } from "@/lib/ai-insights-api"
import { cn } from "@/lib/utils"
import type { UploadedTradeScreenshot } from "./notes-evidence-section"

interface AiChartScreenshotAnalysisProps {
  asset: string
  position: string
  entryPrice: string
  stopLoss: string
  targetTier1: string
  tradingZone: string | null
  notes: string
  screenshots: UploadedTradeScreenshot[]
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function parseOptionalNumber(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function AiChartScreenshotAnalysis({
  asset,
  position,
  entryPrice,
  stopLoss,
  targetTier1,
  tradingZone,
  notes,
  screenshots,
}: AiChartScreenshotAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ChartScreenshotAnalysisResult | null>(null)
  const analyzedScreenshots = screenshots.slice(0, 3)

  useEffect(() => {
    setResult(null)
    setError(null)
  }, [asset, position, entryPrice, stopLoss, targetTier1, tradingZone, notes, screenshots])

  const canAnalyze = asset.trim().length > 0 && analyzedScreenshots.length > 0

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const analysis = await analyzeChartScreenshot({
        asset: asset.trim().toUpperCase(),
        position,
        entryPrice: parseOptionalNumber(entryPrice),
        stopLoss: parseOptionalNumber(stopLoss),
        targetTier1: parseOptionalNumber(targetTier1),
        tradingZone,
        notes: notes.trim() || null,
        screenshots: analyzedScreenshots.map((screenshot) => screenshot.url),
      })

      setResult(analysis)
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Chart analysis is unavailable right now.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/5 via-background to-cyan-500/5 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BrainCircuit className="h-4 w-4 text-primary" />
              AI Chart Read
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask the vision model to read up to your first three uploaded charts before you commit risk.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void handleAnalyze()} disabled={!canAnalyze || isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isLoading ? "Analyzing chart..." : "Analyze screenshots"}
          </Button>
        </div>

        {!canAnalyze ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
            Add at least one screenshot and the asset symbol to unlock AI chart analysis.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/85 p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  Confidence {formatPercent(result.confidenceScore)}
                </Badge>
                <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                  {result.amdPhase || "Unclear phase"}
                </Badge>
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  {result.premiumDiscount || "Unclear pricing"}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{result.summary}</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Layers className="h-4 w-4 text-cyan-500" />
                    Market structure
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{result.marketStructure}</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Radar className="h-4 w-4 text-primary" />
                    Confluences & key levels
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.detectedConfluences.map((item) => (
                      <span key={item} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {item}
                      </span>
                    ))}
                    {result.keyLevels.map((level) => (
                      <span key={level} className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs font-medium text-foreground">
                        {level}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Warnings
                  </div>
                  <div className="mt-3 space-y-2">
                    {result.warnings.length > 0 ? result.warnings.map((warning) => (
                      <p key={warning} className="text-sm text-muted-foreground">{warning}</p>
                    )) : <p className="text-sm text-muted-foreground">No major warnings surfaced from the chart read.</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">Suggested next actions</p>
                  <div className="mt-3 space-y-2">
                    {result.suggestedActions.map((action) => (
                      <p key={action} className={cn("text-sm text-muted-foreground", result.confidenceScore < 0.45 && "text-amber-700 dark:text-amber-300")}>
                        {action}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
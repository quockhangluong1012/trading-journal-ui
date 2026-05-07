"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Loader2, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  generateEconomicImpactPrediction,
  type AiEconomicImpactPredictorResult,
} from "@/lib/ai-insights-api"
import { cn } from "@/lib/utils"

interface AiEconomicImpactCardProps {
  symbols: string[]
}

const riskLevelStyles: Record<string, string> = {
  low: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  medium: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  critical: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
}

function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z]/g, "")
}

export function AiEconomicImpactCard({ symbols }: AiEconomicImpactCardProps) {
  const uniqueSymbols = useMemo(
    () => [...new Set(symbols.map(normalizeSymbol).filter((symbol) => symbol.length >= 6))],
    [symbols],
  )
  const [selectedSymbol, setSelectedSymbol] = useState(uniqueSymbols[0] ?? "EURUSD")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AiEconomicImpactPredictorResult | null>(null)

  useEffect(() => {
    if (uniqueSymbols.length === 0) {
      return
    }

    setSelectedSymbol((current) => (uniqueSymbols.includes(normalizeSymbol(current)) ? current : uniqueSymbols[0]))
  }, [uniqueSymbols])

  const handleGenerate = async () => {
    const symbol = normalizeSymbol(selectedSymbol)
    if (!symbol) {
      setError("Enter an FX symbol like EURUSD to evaluate economic-event impact.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setResult(await generateEconomicImpactPrediction(symbol))
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "AI economic impact prediction is unavailable right now.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-primary/15 bg-linear-to-br from-primary/5 via-background to-background shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <AlertTriangle className="h-4 w-4 text-primary" />
          AI economic impact predictor
        </CardTitle>
        <CardDescription>
          Pressure-test the next event window for an FX symbol before you add or hold risk into the release.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uniqueSymbols.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {uniqueSymbols.map((symbol) => {
              const isActive = normalizeSymbol(selectedSymbol) === symbol
              return (
                <Button
                  key={symbol}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSymbol(symbol)}
                  className="rounded-full"
                >
                  {symbol}
                </Button>
              )
            })}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            value={selectedSymbol}
            aria-label="Economic impact symbol"
            onChange={(event) => setSelectedSymbol(event.target.value)}
            placeholder="EURUSD"
            className="border-primary/20 bg-background lg:max-w-xs"
          />
          <Button type="button" variant="outline" onClick={() => void handleGenerate()} disabled={isLoading} className="gap-2 lg:w-auto">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isLoading ? "Analyzing..." : "Predict impact"}
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
                {result.riskLevel} risk
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background text-muted-foreground">
                {Math.round(result.confidence * 100)}% confidence
              </Badge>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
              <p className="text-sm text-foreground">{result.summary}</p>
            </div>

            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">Trade stance</p>
              <p className="mt-2 text-sm text-foreground">{result.tradeStance}</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Key drivers</p>
                <div className="mt-3 space-y-2">
                  {result.keyDrivers.length > 0 ? (
                    result.keyDrivers.map((item) => (
                      <p key={item} className="text-sm text-foreground">{item}</p>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific driver was returned.</p>
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
                    <p className="text-sm text-muted-foreground">No action item was generated.</p>
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
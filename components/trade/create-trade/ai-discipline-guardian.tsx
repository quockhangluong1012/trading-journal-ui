"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, ShieldAlert, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { generateDisciplineGuardian, type AiDisciplineGuardianResult } from "@/lib/ai-insights-api"
import { cn } from "@/lib/utils"

const riskLevelStyles: Record<string, string> = {
  low: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  medium: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  critical: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
}

export function AiDisciplineGuardian() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AiDisciplineGuardianResult | null>(null)

  const handleCheck = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setResult(await generateDisciplineGuardian())
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "AI discipline guardian is unavailable right now.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-amber-500/20 bg-linear-to-br from-amber-500/8 via-background to-background p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">AI discipline guardian</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Check for tilt, cooldown, and rule-pressure signals before opening another position.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void handleCheck()} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isLoading ? "Checking..." : result ? "Refresh guard" : "Check discipline"}
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
            <Badge variant="outline" className="border-border/70 bg-background text-muted-foreground capitalize">
              {result.tiltType || "general discipline"}
            </Badge>
            {result.shouldNotify ? (
              <Badge variant="outline" className="border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300">
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                Alert-worthy
              </Badge>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">{result.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
          </div>

          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Action items</p>
            <div className="mt-3 space-y-2">
              {result.actionItems.length > 0 ? (
                result.actionItems.map((item) => (
                  <p key={item} className="text-sm text-foreground">{item}</p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No extra action item was generated.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
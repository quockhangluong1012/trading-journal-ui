"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sun, Loader2, AlertTriangle, Target, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateMorningBriefing, getMorningBriefing, type MorningBriefingResult } from "@/lib/ai-insights-api"
import { cn } from "@/lib/utils"

const moodConfig: Record<string, { border: string; glow: string }> = {
  positive: { border: "border-emerald-500/20", glow: "shadow-emerald-500/5" },
  cautious: { border: "border-amber-500/20", glow: "shadow-amber-500/5" },
  warning: { border: "border-red-500/20", glow: "shadow-red-500/5" },
}

export function AiMorningBriefing() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<MorningBriefingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const loadMorningBriefing = async () => {
      try {
        const savedBriefing = await getMorningBriefing()

        if (!isActive) {
          return
        }

        setResult(savedBriefing)
      } catch {
        if (isActive) {
          setError("Could not load the saved briefing.")
        }
      } finally {
        if (isActive) {
          setIsInitializing(false)
        }
      }
    }

    void loadMorningBriefing()

    return () => {
      isActive = false
    }
  }, [])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const nextBriefing = await generateMorningBriefing()
      setResult(nextBriefing)
    } catch {
      setError("Could not reach AI service.")
    } finally {
      setIsGenerating(false)
      setIsInitializing(false)
    }
  }

  const mood = result ? moodConfig[result.overallMood] || moodConfig.cautious : null
  const isBusy = isInitializing || isGenerating

  return (
    <div className="space-y-4">
      {!result && (
        <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={handleGenerate}
          className={cn("gap-2 rounded-full border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]")}>
          {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sun className="h-3.5 w-3.5" />}
          {isInitializing ? "Loading briefing..." : isGenerating ? "Generating briefing..." : "Morning Briefing"}
        </Button>
      )}
      <AnimatePresence mode="wait">
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-red-400">{error}</motion.p>
        )}
        {result && mood && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className={cn("rounded-2xl border bg-linear-to-br from-background/90 to-amber-500/5 p-5 backdrop-blur-md shadow-lg", mood.border, mood.glow)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">Morning Briefing</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={isGenerating}
                className="h-7 gap-1 rounded-full px-2 text-[10px] text-muted-foreground hover:text-amber-400">
                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} {isGenerating ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            <p className="text-sm font-semibold text-foreground">{result.greeting}</p>
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">{result.briefing}</p>

            {result.focusAreas.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Focus areas</p>
                {result.focusAreas.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                    <Target className="mt-0.5 h-3 w-3 shrink-0 text-primary/60" />{f}
                  </div>
                ))}
              </div>
            )}
            {result.warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Warnings</p>
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-300/90">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{w}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Today&apos;s action</p>
              <p className="mt-1 text-xs font-medium text-foreground/90">{result.actionItem}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

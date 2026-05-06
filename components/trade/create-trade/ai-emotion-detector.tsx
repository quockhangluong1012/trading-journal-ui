"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Loader2, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, ApiResponse } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { EmotionTagApi } from "@/lib/trade-store"

interface DetectedEmotion {
  emotionName: string
  confidence: number
}

interface EmotionDetectionResult {
  detectedEmotions: DetectedEmotion[]
  overallSentiment: string
  psychologySummary: string
  tradingReadiness: string
  tradingReadinessExplanation: string
}

interface AiEmotionDetectorProps {
  textContent: string
  apiTags: EmotionTagApi[]
  selectedEmotions: string[]
  onSelectEmotions: (emotionIds: string[]) => void
}

const sentimentConfig: Record<string, { color: string; label: string }> = {
  positive: { color: "text-emerald-400", label: "Positive" },
  negative: { color: "text-red-400", label: "Negative" },
  neutral: { color: "text-blue-400", label: "Neutral" },
  mixed: { color: "text-amber-400", label: "Mixed" },
}

const readinessConfig: Record<string, { color: string; bg: string; label: string }> = {
  ready: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Ready to trade" },
  caution: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Proceed with caution" },
  not_ready: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Not ready" },
}

export function AiEmotionDetector({ textContent, apiTags, selectedEmotions, onSelectEmotions }: AiEmotionDetectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<EmotionDetectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canDetect = textContent.trim().length >= 10

  const handleDetect = async () => {
    if (!canDetect) return
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await api.post<ApiResponse<EmotionDetectionResult>>("/v1/ai-emotions/detect", { textContent: textContent.trim() })
      if (response.data.isSuccess && response.data.value) {
        const r = response.data.value
        setResult(r)
        if (r.detectedEmotions.length > 0) {
          const matchedIds = [...selectedEmotions]
          for (const d of r.detectedEmotions) {
            const tag = apiTags.find(t => t.name.toLowerCase() === d.emotionName.toLowerCase())
            if (tag && !matchedIds.includes(tag.id.toString())) matchedIds.push(tag.id.toString())
          }
          if (matchedIds.length > selectedEmotions.length) onSelectEmotions(matchedIds)
        }
      } else { setError("Emotion detection failed.") }
    } catch { setError("Could not reach the AI service.") }
    finally { setIsLoading(false) }
  }

  const sentiment = result ? sentimentConfig[result.overallSentiment] || sentimentConfig.neutral : null
  const readiness = result ? readinessConfig[result.tradingReadiness] || readinessConfig.caution : null

  return (
    <div className="space-y-3">
      <Button type="button" variant="ghost" size="sm" disabled={!canDetect || isLoading} onClick={handleDetect}
        className={cn("gap-2 rounded-full text-xs font-medium border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40")}>
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {isLoading ? "Analyzing..." : "AI Detect Emotions"}
      </Button>
      <AnimatePresence mode="wait">
        {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-red-400">{error}</motion.p>}
        {result && sentiment && readiness && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 rounded-xl border border-accent/15 bg-accent/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-accent" /><span className="text-[10px] font-bold uppercase tracking-widest text-accent/80">Emotion Analysis</span></div>
              <span className={cn("text-xs font-semibold", sentiment.color)}>{sentiment.label}</span>
            </div>
            <p className="text-xs leading-relaxed text-foreground/80">{result.psychologySummary}</p>
            {result.detectedEmotions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.detectedEmotions.map((e, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                    {e.emotionName}<span className="text-[9px] text-accent/60">{Math.round(e.confidence * 100)}%</span>
                  </span>
                ))}
              </div>
            )}
            <div className={cn("rounded-lg border p-2.5", readiness.bg)}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trading readiness</span>
                <span className={cn("text-xs font-semibold", readiness.color)}>{readiness.label}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-foreground/70">{result.tradingReadinessExplanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Brain,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, ApiResponse } from "@/lib/api"
import { cn } from "@/lib/utils"

interface PreTradeValidationResult {
  grade: string
  gradeExplanation: string
  ictAlignment: string
  riskRewardAssessment: string
  emotionalReadiness: string
  warnings: string[]
  recommendations: string[]
  shouldProceed: boolean
}

interface PreTradeValidationRequest {
  asset: string
  position: string
  entryPrice: number
  stopLoss: number
  targetTier1: number
  targetTier2: number | null
  targetTier3: number | null
  confidenceLevel: number
  tradingZone: string | null
  technicalAnalysisTags: string[] | null
  checklistStatus: string | null
  emotionTags: string[] | null
  notes: string | null
}

interface AiPreTradeValidationProps {
  asset: string
  position: string
  entryPrice: string
  stopLoss: string
  targetTier1: string
  targetTier2: string
  targetTier3: string
  confidenceLevel: number
  tradingZone: string | null
  technicalAnalysisTags: string[]
  checklistStatus: string
  emotionTags: string[]
  notes: string
}

const gradeConfig: Record<string, { color: string; icon: React.ReactNode; bg: string }> = {
  A: { color: "text-emerald-400", icon: <CheckCircle2 className="h-5 w-5" />, bg: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30" },
  B: { color: "text-emerald-400", icon: <CheckCircle2 className="h-5 w-5" />, bg: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/25" },
  C: { color: "text-amber-400", icon: <AlertTriangle className="h-5 w-5" />, bg: "from-amber-500/15 to-amber-500/5 border-amber-500/25" },
  D: { color: "text-red-400", icon: <ShieldAlert className="h-5 w-5" />, bg: "from-red-500/15 to-red-500/5 border-red-500/25" },
  F: { color: "text-red-500", icon: <XCircle className="h-5 w-5" />, bg: "from-red-500/20 to-red-500/5 border-red-500/30" },
}

export function AiPreTradeValidation({
  asset,
  position,
  entryPrice,
  stopLoss,
  targetTier1,
  targetTier2,
  targetTier3,
  confidenceLevel,
  tradingZone,
  technicalAnalysisTags,
  checklistStatus,
  emotionTags,
  notes,
}: AiPreTradeValidationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<PreTradeValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canValidate = asset.trim() && parseFloat(entryPrice) > 0 && parseFloat(stopLoss) > 0 && parseFloat(targetTier1) > 0

  const handleValidate = async () => {
    if (!canValidate) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const payload: PreTradeValidationRequest = {
        asset: asset.trim().toUpperCase(),
        position,
        entryPrice: parseFloat(entryPrice),
        stopLoss: parseFloat(stopLoss),
        targetTier1: parseFloat(targetTier1),
        targetTier2: targetTier2 ? parseFloat(targetTier2) : null,
        targetTier3: targetTier3 ? parseFloat(targetTier3) : null,
        confidenceLevel,
        tradingZone,
        technicalAnalysisTags: technicalAnalysisTags.length > 0 ? technicalAnalysisTags : null,
        checklistStatus,
        emotionTags: emotionTags.length > 0 ? emotionTags : null,
        notes: notes || null,
      }

      const response = await api.post<ApiResponse<PreTradeValidationResult>>(
        "/v1/ai-validation/validate",
        payload
      )

      if (response.data.isSuccess && response.data.value) {
        setResult(response.data.value)
      } else {
        setError("AI validation failed. Please try again.")
      }
    } catch {
      setError("Could not reach the AI service. Try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  const gradeStyle = result ? gradeConfig[result.grade] || gradeConfig.C : null

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canValidate || isLoading}
        onClick={handleValidate}
        className={cn(
          "w-full gap-2 rounded-xl border-primary/30 bg-primary/10 text-primary transition-all duration-300",
          "hover:bg-primary/20 hover:shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:-translate-y-0.5",
          "disabled:opacity-50 disabled:pointer-events-none"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Brain className="h-4 w-4" />
        )}
        {isLoading ? "Analyzing setup..." : "AI Validate Setup"}
      </Button>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400"
          >
            {error}
          </motion.div>
        )}

        {result && gradeStyle && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
              "space-y-4 rounded-2xl border bg-gradient-to-br p-5 backdrop-blur-md",
              gradeStyle.bg
            )}
          >
            {/* Grade header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full border bg-background/50", gradeStyle.color)}>
                  <span className="text-xl font-black">{result.grade}</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Setup Grade
                  </p>
                  <p className={cn("text-sm font-semibold", gradeStyle.color)}>
                    {result.shouldProceed ? "Proceed with caution" : "Do not proceed"}
                  </p>
                </div>
              </div>
              <div className={gradeStyle.color}>{gradeStyle.icon}</div>
            </div>

            {/* Grade explanation */}
            <p className="text-xs leading-relaxed text-foreground/90">
              {result.gradeExplanation}
            </p>

            {/* Analysis sections */}
            <div className="space-y-3">
              <DetailBlock
                title="ICT Alignment"
                content={result.ictAlignment}
                icon={<ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />}
              />
              <DetailBlock
                title="Risk/Reward"
                content={result.riskRewardAssessment}
                icon={<Sparkles className="h-3.5 w-3.5 text-amber-400" />}
              />
              <DetailBlock
                title="Emotional Readiness"
                content={result.emotionalReadiness}
                icon={<Brain className="h-3.5 w-3.5 text-purple-400" />}
              />
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  ⚠ Warnings
                </p>
                <ul className="space-y-1">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-amber-300/90">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                  ✦ Recommendations
                </p>
                <ul className="space-y-1">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary/60" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DetailBlock({ title, content, icon }: { title: string; content: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-background/30 p-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {icon}
        {title}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">{content}</p>
    </div>
  )
}

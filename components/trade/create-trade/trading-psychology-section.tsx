import React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Brain } from "lucide-react"
import { getTagCategory } from "@/lib/trade-store"
import { TradeFormSection } from "./trade-form-section"
import { getConfidenceLabel } from "./shared-utils"
import type { EmotionTagApi } from "@/lib/trade-store"

export interface TradingPsychologySectionProps {
  apiTags: EmotionTagApi[]
  selectedEmotions: string[]
  toggleEmotion: (id: string) => void
  confidenceLevel: number
  setConfidenceLevel: (level: number) => void
  errors: Record<string, string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

export function TradingPsychologySection({
  apiTags,
  selectedEmotions,
  toggleEmotion,
  confidenceLevel,
  setConfidenceLevel,
  errors,
  setErrors,
}: TradingPsychologySectionProps) {
  return (
    <TradeFormSection
      title="Trading Psychology"
      description="Track your emotional state and conviction so you can spot behavioral patterns over time."
      icon={<Brain className="h-4 w-4 text-accent" />}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_260px]">
        <div className="space-y-4">
          <Label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            How are you feeling about this trade?
          </Label>

          {(["positive", "negative", "neutral"] as const).map((category) => (
            <div key={category} className="space-y-2">
              <span className="text-xs font-medium capitalize text-muted-foreground">
                {category}
              </span>
              <div className="flex flex-wrap gap-2">
                {apiTags
                  .filter((tag) => getTagCategory(tag.name) === category)
                  .map((tag) => {
                    const isSelected = selectedEmotions.includes(tag.id.toString())
                    const colorMap = {
                      positive: isSelected
                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400",
                      negative: isSelected
                        ? "border-red-500/40 bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400",
                      neutral: isSelected
                        ? "border-blue-500/40 bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400",
                    }

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleEmotion(tag.id.toString())}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                          colorMap[category].replace("border-border bg-secondary/40", "border-white/10 bg-background/50"),
                        )}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Confidence Level
            </Label>
            {errors.confidenceLevel ? (
              <p className="text-xs text-destructive">{errors.confidenceLevel}</p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setConfidenceLevel(level === confidenceLevel ? 0 : level)

                  if (errors.confidenceLevel) {
                    setErrors((prev) => {
                      const nextErrors = { ...prev }
                      delete nextErrors.confidenceLevel
                      return nextErrors
                    })
                  }
                }}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border text-base font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                  errors.confidenceLevel && confidenceLevel === 0 && "border-destructive/50",
                  confidenceLevel >= level
                    ? "border-primary bg-primary/20 text-primary shadow-[0_0_15px_rgba(79,70,229,0.3)] ring-2 ring-primary/40 scale-110"
                    : "border-white/10 bg-background/50 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
                aria-label={`Confidence level ${level}`}
              >
                {level}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm font-medium text-foreground">
            {getConfidenceLabel(confidenceLevel)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Use this to compare conviction against the eventual outcome in your review workflow.
          </p>
        </div>
      </div>
    </TradeFormSection>
  )
}

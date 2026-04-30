"use client"

import { Brain, Heart, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { UseReviewWizardResult } from "@/hooks/use-review-wizard"

function DistributionBar({ items }: { items: { label: string; percentage: number; count: number }[] }) {
  const colors = [
    "bg-primary", "bg-emerald-500", "bg-amber-500", "bg-violet-500",
    "bg-cyan-500", "bg-rose-500", "bg-indigo-500", "bg-orange-500",
  ]

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No data for this period</p>
  }

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-6 overflow-hidden rounded-full">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`${colors[i % colors.length]} transition-all`}
            style={{ width: `${Math.max(item.percentage, 2)}%` }}
            title={`${item.label}: ${item.percentage}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${colors[i % colors.length]}`} />
            <span className="text-xs text-muted-foreground">
              {item.label} <span className="font-semibold text-foreground">{item.count}</span>
              <span className="ml-0.5 opacity-60">({item.percentage}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WizardStepPsychology({ wizard }: { wizard: UseReviewWizardResult }) {
  const { wizardData, form, updateForm } = wizard

  return (
    <div className="space-y-6">
      {/* Emotion distribution */}
      <Card className="border-border/70 bg-card/85">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-rose-400" />
            Emotion Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DistributionBar items={wizardData?.emotionDistribution ?? []} />
          {wizardData?.current.dominantEmotion && (
            <p className="mt-3 text-sm text-muted-foreground">
              Dominant emotion: <span className="font-semibold text-foreground">{wizardData.current.dominantEmotion}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confidence distribution */}
      <Card className="border-border/70 bg-card/85">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            Confidence Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DistributionBar items={wizardData?.confidenceDistribution ?? []} />
          <p className="mt-3 text-sm text-muted-foreground">
            High-confidence trades: <span className="font-semibold text-foreground">
              {wizardData?.current.highConfidenceTrades ?? 0}
            </span> of {wizardData?.current.totalTrades ?? 0}
          </p>
        </CardContent>
      </Card>

      {/* Psychology rating + notes */}
      <Card className="border-border/70 bg-card/85">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-violet-400" />
            Emotional Management Rating
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">How well did you manage emotions? (1 = poor, 5 = excellent)</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateForm("psychologyRating", v)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 text-sm font-bold transition-all ${
                    form.psychologyRating === v
                      ? "border-violet-500 bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                      : "border-border/70 bg-background/80 text-muted-foreground hover:border-violet-500/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Risk management rating (1-5)</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateForm("riskManagementRating", v)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 text-sm font-bold transition-all ${
                    form.riskManagementRating === v
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "border-border/70 bg-background/80 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            placeholder="How did your emotions affect your trading? Any patterns you noticed?"
            value={form.psychologyNotes}
            onChange={(e) => updateForm("psychologyNotes", e.target.value)}
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>
    </div>
  )
}

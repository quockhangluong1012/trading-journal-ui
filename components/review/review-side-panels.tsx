"use client"

import { Brain, Calendar, ClipboardList, Loader2, Save, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { ReviewData } from "@/lib/review-api"

interface ReviewNotesPanelProps {
  isSaving: boolean
  notes: string
  onChange: (value: string) => void
  onSave: () => void
}

export function ReviewNotesPanel({ isSaving, notes, onChange, onSave }: ReviewNotesPanelProps) {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <ClipboardList className="h-4 w-4 text-primary" />
              Review notes
            </CardTitle>
            <CardDescription>
              Capture what happened, what felt off, and what should change next session.
            </CardDescription>
          </div>

          <Button variant="outline" size="sm" className="gap-2" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Document the setups you trusted, the moments you forced, and the specific adjustments you want live on the next period review."
          className="min-h-70 resize-none border-border/70 bg-background/70 text-sm leading-relaxed"
        />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {isSaving ? "Saving note draft..." : "Autosaves after a short pause while you write."}
        </div>
      </CardContent>
    </Card>
  )
}

interface ReviewPeriodDetailsCardProps {
  bounds: { start: Date; end: Date }
  periodLabel: string
  review: ReviewData | null
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value)
}

export function ReviewPeriodDetailsCard({ bounds, periodLabel, review }: ReviewPeriodDetailsCardProps) {
  const items = [
    { label: "Period", value: periodLabel, icon: <Calendar className="h-3.5 w-3.5 text-primary" /> },
    { label: "Start", value: formatDate(bounds.start), icon: <Calendar className="h-3.5 w-3.5 text-primary" /> },
    { label: "End", value: formatDate(bounds.end), icon: <Calendar className="h-3.5 w-3.5 text-primary" /> },
    { label: "Top asset", value: review?.topAsset ?? "No leader yet", icon: <Sparkles className="h-3.5 w-3.5 text-amber-400" /> },
    { label: "Primary zone", value: review?.primaryTradingZone ?? "No dominant zone", icon: <Sparkles className="h-3.5 w-3.5 text-amber-400" /> },
    { label: "Dominant emotion", value: review?.dominantEmotion ?? "No pattern logged", icon: <Brain className="h-3.5 w-3.5 text-indigo-400" /> },
  ]

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="gap-1">
        <CardTitle className="text-lg text-foreground">Period details</CardTitle>
        <CardDescription>Context anchors for this review window.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              {item.icon}
              <span>{item.label}</span>
            </div>
            <span className="truncate text-right text-sm font-medium text-foreground">{item.value}</span>
          </div>
        ))}

        {review?.topTechnicalTheme ? (
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Technical theme in play
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                {review.topTechnicalTheme}
              </Badge>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
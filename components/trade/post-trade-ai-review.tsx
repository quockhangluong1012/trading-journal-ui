"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Gauge,
  Lightbulb,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getPlainTextFromRichText } from "@/lib/rich-text"
import {
  generatePostTradeReview,
  type PostTradeReviewResult,
} from "@/lib/ai-insights-api"

interface PostTradeAiReviewProps {
  tradeId: string
  // The summary already persisted on the trade (rich text or plain).
  savedSummary?: string | null
  isEditing: boolean
  // Called with a plain-text digest of a freshly generated review so the parent
  // can persist it into the trade's aiSummary on save.
  onSummaryGenerated: (summary: string) => void
}

function formatPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
}

function buildSummaryDigest(result: PostTradeReviewResult): string {
  const lines: string[] = [result.summary.trim()]

  if (result.whatWentWell.length > 0) {
    lines.push("", "What went well:", ...result.whatWentWell.map((item) => `• ${item}`))
  }
  if (result.whatWentWrong.length > 0) {
    lines.push("", "What went wrong:", ...result.whatWentWrong.map((item) => `• ${item}`))
  }
  if (result.lessons.length > 0) {
    lines.push("", "Lessons:", ...result.lessons.map((item) => `• ${item}`))
  }
  if (result.suggestedActions.length > 0) {
    lines.push("", "Next time:", ...result.suggestedActions.map((item) => `• ${item}`))
  }

  return lines.join("\n").trim()
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const tone =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-destructive"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">{formatPercent(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function BulletGroup({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string
  items: string[]
  icon: typeof CheckCircle2
  tone: string
}) {
  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className={cn("h-4 w-4", tone)} />
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PostTradeAiReview({
  tradeId,
  savedSummary,
  isEditing,
  onSummaryGenerated,
}: PostTradeAiReviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PostTradeReviewResult | null>(null)

  const handleGenerate = async () => {
    const numericId = Number(tradeId)
    if (!Number.isFinite(numericId)) {
      setError("This trade can't be reviewed yet.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const review = await generatePostTradeReview(numericId)
      setResult(review)
      onSummaryGenerated(buildSummaryDigest(review))
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Post-trade review is unavailable right now.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  const savedSummaryText = getPlainTextFromRichText(savedSummary || "")

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/15 bg-gradient-to-br from-fuchsia-500/5 via-background to-primary/5 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Brain className="h-4 w-4 text-fuchsia-500" />
            Post-trade AI review
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Let your AI assistant grade this trade against its screenshots, notes, R:R, checklist, and logged emotions.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleGenerate()}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isLoading ? "Reviewing trade..." : result || savedSummaryText ? "Regenerate review" : "Generate AI review"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/85 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300">
                Grade {result.grade}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{result.summary}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ScoreBar label="Execution" value={result.executionScore} />
              <ScoreBar label="Discipline" value={result.disciplineScore} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <BulletGroup title="What went well" items={result.whatWentWell} icon={CheckCircle2} tone="text-emerald-500" />
            <BulletGroup title="What went wrong" items={result.whatWentWrong} icon={XCircle} tone="text-destructive" />
            <BulletGroup title="Lessons" items={result.lessons} icon={Lightbulb} tone="text-amber-500" />
            <BulletGroup title="Next time" items={result.suggestedActions} icon={Sparkles} tone="text-primary" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {result.emotionalInsight ? (
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Brain className="h-4 w-4 text-blue-500" />
                  Emotional insight
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.emotionalInsight}</p>
              </div>
            ) : null}
            {result.riskAssessment ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Gauge className="h-4 w-4 text-amber-500" />
                  Risk assessment
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.riskAssessment}</p>
              </div>
            ) : null}
          </div>

          {isEditing ? (
            <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              This review has been captured into the trade summary — save your changes to keep it.
            </div>
          ) : null}
        </div>
      ) : savedSummaryText ? (
        <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Saved review
          </p>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {savedSummaryText}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 ring-1 ring-border/50">
            <Brain className="h-5 w-5 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-semibold text-foreground/80">No review yet</p>
          <p className="max-w-[280px] text-xs leading-relaxed text-muted-foreground">
            Generate an AI review to get a graded breakdown of how this trade was planned and executed.
          </p>
        </div>
      )}
    </div>
  )
}

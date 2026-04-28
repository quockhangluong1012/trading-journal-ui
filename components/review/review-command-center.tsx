"use client"

import { type ReactNode } from "react"
import {
  Brain,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ReviewPeriodNavigator } from "@/components/review/review-period-navigator"
import type { ReviewPeriodType, ReviewData } from "@/lib/review-api"
import type { ReviewNarrative, ReviewPulse, ReviewTone } from "@/lib/review-overview"

const toneClasses: Record<ReviewTone, string> = {
  positive: "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
  neutral: "border-border/70 bg-background/70 text-foreground",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-400",
}

interface ReviewCommandCenterProps {
  currentDate: Date
  isExporting: boolean
  isGeneratingSummary: boolean
  isLoading: boolean
  isRefreshing: boolean
  lastUpdatedAt: Date | null
  narrative: ReviewNarrative
  periodLabel: string
  periodType: ReviewPeriodType
  pulseCards: ReviewPulse[]
  review: ReviewData | null
  syncWarning?: string | null
  onExportReport: () => void
  onGenerateSummary: () => void
  onNavigate: (date: Date) => void
  onRefresh: () => void
}

function formatLastUpdated(lastUpdatedAt: Date | null): string {
  if (!lastUpdatedAt) {
    return "Waiting for first sync"
  }

  return `Updated ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(lastUpdatedAt)}`
}

function buildFocusCopy(review: ReviewData | null, narrative: ReviewNarrative): string {
  if (review?.aiSummary) {
    return review.aiSummary.length > 220
      ? `${review.aiSummary.slice(0, 220)}...`
      : review.aiSummary
  }

  return narrative.detail
}

function buildSignalBadges(review: ReviewData | null): Array<{ icon: ReactNode; label: string }> {
  if (!review) {
    return []
  }

  const badges: Array<{ icon: ReactNode; label: string }> = []

  if (review.topAsset) {
    badges.push({ icon: <Trophy className="h-3.5 w-3.5" />, label: `Top asset · ${review.topAsset}` })
  }

  if (review.dominantEmotion) {
    badges.push({ icon: <Brain className="h-3.5 w-3.5" />, label: `Mindset · ${review.dominantEmotion}` })
  }

  if (review.topTechnicalTheme) {
    badges.push({ icon: <Target className="h-3.5 w-3.5" />, label: `Technical theme · ${review.topTechnicalTheme}` })
  }

  return badges
}

export function ReviewCommandCenter({
  currentDate,
  isExporting,
  isGeneratingSummary,
  isLoading,
  isRefreshing,
  lastUpdatedAt,
  narrative,
  periodLabel,
  periodType,
  pulseCards,
  review,
  syncWarning,
  onExportReport,
  onGenerateSummary,
  onNavigate,
  onRefresh,
}: ReviewCommandCenterProps) {
  const isEmptyState = !review || review.totalTrades === 0
  const canGenerateSummary = (review?.totalTrades ?? 0) > 0
  const highConfidenceProgress =
    review && review.totalTrades > 0
      ? Math.round((review.highConfidenceTrades / review.totalTrades) * 100)
      : 0
  const signalBadges = buildSignalBadges(review)
  const emptyStateSteps: Array<{ detail: string; eyebrow: string; icon: ReactNode; title: string }> = [
    {
      eyebrow: "Capture outcomes",
      icon: <Target className="h-4 w-4 text-primary" />,
      title: "Close the trades you want reviewed",
      detail: "The workspace needs completed trades before it can separate edge from noise.",
    },
    {
      eyebrow: "Add context",
      icon: <Brain className="h-4 w-4 text-primary" />,
      title: "Leave a short note while the session is fresh",
      detail: "A quick debrief gives the AI the emotional and decision context behind the numbers.",
    },
    {
      eyebrow: "Generate coaching",
      icon: <Sparkles className="h-4 w-4 text-primary" />,
      title: "Run the summary once the period has shape",
      detail: "The coaching becomes useful when it can compare trade quality, mistakes, and psychology together.",
    },
  ]
  const summaryActionLabel = isGeneratingSummary
    ? "Generating"
    : review?.aiSummary
      ? "Regenerate summary"
      : canGenerateSummary
        ? "Generate AI summary"
        : "Awaiting close"

  return (
    <section className="overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-background via-background to-primary/5 shadow-sm">
      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.3fr)_360px] lg:px-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Review intelligence
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[11px]"
            >
              {periodLabel}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground"
            >
              {formatLastUpdated(lastUpdatedAt)}
            </Badge>
            {isRefreshing || isGeneratingSummary ? (
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {isGeneratingSummary ? "Generating" : "Refreshing"}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Review workspace
            </h1>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full max-w-2xl rounded-md" />
                <Skeleton className="h-4 w-full max-w-3xl rounded-md" />
                <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
              </div>
            ) : (
              <>
                <p className="max-w-3xl text-base leading-relaxed text-foreground md:text-lg">
                  {narrative.headline}
                </p>
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  {narrative.detail}
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ReviewPeriodNavigator
              currentDate={currentDate}
              periodType={periodType}
              onNavigate={onNavigate}
            />

            {/* <Button variant="outline" size="sm" className="gap-2" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button> */}

            <Button variant="outline" size="sm" className="gap-2" onClick={onExportReport} disabled={isExporting || isLoading || (review?.totalTrades ?? 0) === 0}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExporting ? "Exporting" : "Export PDF"}
            </Button>
          </div>

          {syncWarning ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
              {syncWarning}
            </div>
          ) : null}

          {!isLoading && isEmptyState ? (
            <div className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Before AI coaching
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    Give this review a little signal first
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    The workspace is ready, but this period is still empty. One or two closed trades plus a short note
                    will make the summary materially better and much more specific.
                  </p>
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 lg:max-w-[220px]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary/80">
                    Best first move
                  </p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
                    Capture the first exit note while the session is still fresh.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {emptyStateSteps.map((step) => (
                  <div key={step.title} className="rounded-2xl border border-border/70 bg-linear-to-b from-background to-primary/5 p-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl border border-primary/20 bg-primary/10 p-2">
                        {step.icon}
                      </div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {step.eyebrow}
                      </p>
                    </div>
                    <p className="mt-4 text-sm font-medium leading-relaxed text-foreground">
                      {step.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isLoading && !isEmptyState && pulseCards.length > 0 ? (
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {pulseCards.map((card) => (
                <div key={card.label} className={`rounded-2xl border p-4 shadow-sm ${toneClasses[card.tone]}`}>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] opacity-80">
                    {card.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">{card.value}</p>
                  <p className="mt-2 text-xs leading-relaxed opacity-80">{card.detail}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/85 p-5 shadow-sm backdrop-blur-sm">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {isEmptyState ? "How this workspace helps" : "Current focus"}
              </p>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-foreground">
                  {buildFocusCopy(review, narrative)}
                </p>
              )}
            </div>

            {signalBadges.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {signalBadges.map((badge) => (
                  <Badge
                    key={badge.label}
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/80 px-2.5 py-1 text-[11px]"
                  >
                    {badge.icon}
                    {badge.label}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  High-confidence participation
                </div>
                <span className="text-muted-foreground">{highConfidenceProgress}%</span>
              </div>
              <Progress className="mt-3 h-2.5" value={highConfidenceProgress} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
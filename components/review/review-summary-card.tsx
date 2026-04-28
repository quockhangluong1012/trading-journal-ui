"use client"

import {
  AlertTriangle,
  ArrowUpCircle,
  Brain,
  CheckCircle2,
  Crosshair,
  Eye,
  Lightbulb,
  Loader2,
  Sparkles,
  Trophy,
} from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ReviewData } from "@/lib/review-api"
import { splitReviewItems } from "@/lib/review-overview"

interface ReviewSummaryCardProps {
  isGenerating: boolean
  review: ReviewData | null
  onGenerateSummary: () => void
}

function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <Skeleton className="h-4 w-32 rounded-md" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-5/6 rounded-md" />
          <Skeleton className="h-3 w-3/4 rounded-md" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <Skeleton className="h-4 w-24 rounded-md" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-4/5 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BulletList({ items, toneClass }: { items: string[]; toneClass: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/85">
          <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${toneClass} shrink-0`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function ReviewSummaryCard({ isGenerating, review, onGenerateSummary }: ReviewSummaryCardProps) {
  const actionItems = splitReviewItems(review?.aiActionItems)
  const improvementItems = splitReviewItems(review?.aiWhatToImprove)
  const technicalMistakes = splitReviewItems(review?.aiCriticalMistakesTechnical)
  const psychologyMistakes = splitReviewItems(review?.aiCriticalMistakesPsychological)
  const hasSummary = Boolean(review?.aiSummary)

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <Sparkles className="h-5 w-5 text-amber-400" />
              AI review summary
            </CardTitle>
            <CardDescription>
              Structured coaching from your trade outcomes, discipline patterns, and psychology notes.
            </CardDescription>
          </div>

          <Button
            className={`gap-2 self-start transition-all duration-300 ${
              !isGenerating
                ? "bg-linear-to-r from-primary to-primary/80 hover:from-primary hover:to-primary border-0 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                : ""
            }`}
            onClick={onGenerateSummary}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-amber-300" />
            )}
            {hasSummary ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isGenerating ? (
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              AI is reviewing the period across performance, technical execution, and psychology context.
            </div>
            <SummarySkeleton />
          </div>
        ) : hasSummary ? (
          <>
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Period summary
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{review?.aiSummary}</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {review?.aiStrengths ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-400">
                    <Trophy className="h-4 w-4" />
                    Strengths
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/85">{review.aiStrengths}</p>
                </div>
              ) : null}

              {review?.aiWeaknesses ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    Weaknesses
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/85">{review.aiWeaknesses}</p>
                </div>
              ) : null}
            </div>

            <Accordion type="multiple" className="rounded-2xl border border-border/70 px-5">
              {review?.aiTechnicalInsights ? (
                <AccordionItem value="technical">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <Eye className="h-4 w-4 text-purple-400" />
                      Technical insights
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm leading-relaxed text-foreground/85">{review.aiTechnicalInsights}</p>
                  </AccordionContent>
                </AccordionItem>
              ) : null}

              {review?.aiPsychologyAnalysis ? (
                <AccordionItem value="psychology">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <Brain className="h-4 w-4 text-indigo-400" />
                      Psychology analysis
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm leading-relaxed text-foreground/85">{review.aiPsychologyAnalysis}</p>
                  </AccordionContent>
                </AccordionItem>
              ) : null}

              {technicalMistakes.length > 0 || psychologyMistakes.length > 0 ? (
                <AccordionItem value="mistakes">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <Crosshair className="h-4 w-4 text-rose-400" />
                      Critical mistakes
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {technicalMistakes.length > 0 ? (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-400/80">
                            Technical
                          </p>
                          <BulletList items={technicalMistakes} toneClass="bg-rose-400" />
                        </div>
                      ) : null}

                      {psychologyMistakes.length > 0 ? (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-400/80">
                            Psychological
                          </p>
                          <BulletList items={psychologyMistakes} toneClass="bg-rose-400" />
                        </div>
                      ) : null}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ) : null}

              {actionItems.length > 0 ? (
                <AccordionItem value="actions">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      Action items
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <BulletList items={actionItems} toneClass="bg-amber-400" />
                  </AccordionContent>
                </AccordionItem>
              ) : null}

              {improvementItems.length > 0 ? (
                <AccordionItem value="improve">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <ArrowUpCircle className="h-4 w-4 text-sky-400" />
                      What to improve next
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <BulletList items={improvementItems} toneClass="bg-sky-400" />
                  </AccordionContent>
                </AccordionItem>
              ) : null}
            </Accordion>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/70 px-6 py-10 text-center">
            <Sparkles className="h-9 w-9 text-muted-foreground/50" />
            <p className="mt-4 text-base font-medium text-foreground">No AI review yet</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Generate a review once the trade list and notes look right. The new summary now reads richer trade evidence, rule breaks, and psychology history for the whole period.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
"use client"

import { Award, CheckCircle2, Flame, PartyPopper, Star, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { UseReviewWizardResult } from "@/hooks/use-review-wizard"

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
})

function RatingSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((v) => (
          <Star
            key={v}
            className={`h-4 w-4 ${v <= value ? "fill-primary text-primary" : "text-border/70"}`}
          />
        ))}
      </div>
    </div>
  )
}

export function WizardStepComplete({ wizard }: { wizard: UseReviewWizardResult }) {
  const { wizardData, form, isCompleted, periodLabel } = wizard

  return (
    <div className="space-y-6">
      {/* Completion card */}
      <div className={`overflow-hidden rounded-3xl border-2 p-8 text-center shadow-sm transition-all ${
        isCompleted
          ? "border-emerald-500/30 bg-linear-to-br from-emerald-500/5 via-background to-emerald-500/10"
          : "border-primary/20 bg-linear-to-br from-background via-background to-primary/5"
      }`}>
        {isCompleted ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <PartyPopper className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Review Complete! 🎉</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You've completed your review for <span className="font-semibold text-foreground">{periodLabel}</span>.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Ready to Submit</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Review your summary below, then click <span className="font-semibold text-primary">Complete Review</span> to finish.
            </p>
          </>
        )}

        {/* Streak */}
        {(wizardData?.reviewStreak ?? 0) > 0 && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">
              {wizardData!.reviewStreak} review streak!
            </span>
          </div>
        )}
      </div>

      {/* Summary overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Metrics summary */}
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Period Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Net P&L</p>
                <p className={`mt-1 text-xl font-bold ${
                  (wizardData?.current.totalPnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {currencyFmt.format(wizardData?.current.totalPnl ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Win Rate</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {(wizardData?.current.winRate ?? 0).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Trades</p>
                <p className="mt-1 text-xl font-bold text-foreground">{wizardData?.current.totalTrades ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rule Breaks</p>
                <p className="mt-1 text-xl font-bold text-foreground">{wizardData?.current.ruleBreakTrades ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ratings summary */}
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-amber-400" />
              Your Ratings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <RatingSummary label="Execution" value={form.executionRating} />
            <RatingSummary label="Discipline" value={form.disciplineRating} />
            <RatingSummary label="Psychology" value={form.psychologyRating} />
            <RatingSummary label="Risk Mgmt" value={form.riskManagementRating} />
            <RatingSummary label="Overall" value={form.overallRating} />
          </CardContent>
        </Card>
      </div>

      {/* Action items count */}
      {form.actionItems.length > 0 && (
        <Card className="border-border/70 bg-card/85">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {form.actionItems.length} action {form.actionItems.length === 1 ? "item" : "items"} created
                </p>
                <p className="text-xs text-muted-foreground">
                  These will be tracked and shown in your next review.
                </p>
              </div>
              <Badge variant="outline" className="ml-auto border-primary/20 text-primary">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes preview */}
      {(form.keyTakeaways || form.goalsForNextPeriod) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {form.keyTakeaways && (
            <Card className="border-border/70 bg-card/85">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Key Takeaways</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{form.keyTakeaways}</p>
              </CardContent>
            </Card>
          )}
          {form.goalsForNextPeriod && (
            <Card className="border-border/70 bg-card/85">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Goals for Next Period</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{form.goalsForNextPeriod}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

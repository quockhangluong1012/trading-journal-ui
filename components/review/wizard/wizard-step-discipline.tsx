"use client"

import { ShieldCheck, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import type { UseReviewWizardResult } from "@/hooks/use-review-wizard"

export function WizardStepDiscipline({ wizard }: { wizard: UseReviewWizardResult }) {
  const { wizardData, form, updateForm } = wizard
  const disc = wizardData?.discipline

  return (
    <div className="space-y-6">
      {/* Compliance gauge */}
      <Card className="border-border/70 bg-card/85">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Rule Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-bold tracking-tight text-foreground">
                {disc ? `${disc.complianceRate.toFixed(0)}%` : "–"}
              </p>
              <p className="text-sm text-muted-foreground">
                {disc ? `${disc.rulesFollowed} followed / ${disc.rulesBroken} broken` : "No rule checks logged"}
              </p>
            </div>
            <div className={`rounded-2xl border p-3 ${
              (disc?.complianceRate ?? 100) >= 80
                ? "border-emerald-500/20 bg-emerald-500/10"
                : "border-amber-500/20 bg-amber-500/10"
            }`}>
              {(disc?.complianceRate ?? 100) >= 80 ? (
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-amber-400" />
              )}
            </div>
          </div>
          <Progress value={disc?.complianceRate ?? 100} className="h-3" />
        </CardContent>
      </Card>

      {/* Rule breakdown */}
      {disc && disc.ruleBreakdowns.length > 0 && (
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Rule-by-Rule Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {disc.ruleBreakdowns.map((rule) => {
              const total = rule.timesFollowed + rule.timesBroken
              const rate = total > 0 ? (rule.timesFollowed / total) * 100 : 100
              return (
                <div key={rule.ruleName} className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{rule.ruleName}</span>
                    <span className={`text-xs font-semibold ${
                      rate >= 80 ? "text-emerald-400" : rate >= 50 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {rate.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={rate} className="mt-2 h-1.5" />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {rule.timesFollowed} followed · {rule.timesBroken} broken
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Trade rule breaks */}
      <Card className="border-border/70 bg-card/85">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Trade Rule Breaks: {wizardData?.current.ruleBreakTrades ?? 0}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Rate your discipline this period (1 = poor, 5 = excellent)
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateForm("disciplineRating", v)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 text-sm font-bold transition-all ${
                    form.disciplineRating === v
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
            placeholder="What rules did you break? What caused the discipline slip?"
            value={form.disciplineNotes}
            onChange={(e) => updateForm("disciplineNotes", e.target.value)}
            rows={3}
            className="resize-none"
          />
        </CardContent>
      </Card>
    </div>
  )
}

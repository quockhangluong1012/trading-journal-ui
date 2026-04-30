"use client"

import { Check, ChevronLeft, ChevronRight, Loader2, Save, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WIZARD_STEPS } from "@/lib/wizard-api"
import type { UseReviewWizardResult } from "@/hooks/use-review-wizard"
import { WizardStepPerformance } from "./wizard-step-performance"
import { WizardStepTrades } from "./wizard-step-trades"
import { WizardStepDiscipline } from "./wizard-step-discipline"
import { WizardStepPsychology } from "./wizard-step-psychology"
import { WizardStepGoals } from "./wizard-step-goals"
import { WizardStepComplete } from "./wizard-step-complete"

interface WizardContainerProps {
  wizard: UseReviewWizardResult
}

function StepIndicator({
  currentStep,
  totalSteps,
  onStepClick,
}: {
  currentStep: number
  totalSteps: number
  onStepClick: (step: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {WIZARD_STEPS.map((step, index) => {
        const isActive = index === currentStep
        const isDone = index < currentStep

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick(index)}
            className="group flex flex-col items-center gap-1.5"
          >
            <div className="flex items-center gap-1">
              {index > 0 && (
                <div
                  className={`h-px w-6 transition-colors sm:w-10 ${
                    isDone ? "bg-primary" : "bg-border/70"
                  }`}
                />
              )}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : isDone
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/70 bg-background/80 text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </div>
            </div>
            <span
              className={`hidden text-[10px] font-medium uppercase tracking-wider sm:block ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {step.title}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function WizardContainer({ wizard }: WizardContainerProps) {
  const stepContent = (() => {
    switch (wizard.currentStepId) {
      case "performance":
        return <WizardStepPerformance wizard={wizard} />
      case "trades":
        return <WizardStepTrades wizard={wizard} />
      case "discipline":
        return <WizardStepDiscipline wizard={wizard} />
      case "psychology":
        return <WizardStepPsychology wizard={wizard} />
      case "goals":
        return <WizardStepGoals wizard={wizard} />
      case "complete":
        return <WizardStepComplete wizard={wizard} />
      default:
        return null
    }
  })()

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-background via-background to-primary/5 px-6 py-5 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <StepIndicator
            currentStep={wizard.currentStep}
            totalSteps={wizard.totalSteps}
            onStepClick={wizard.goToStep}
          />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              {WIZARD_STEPS[wizard.currentStep].title}
            </p>
            <p className="text-sm text-muted-foreground">
              {WIZARD_STEPS[wizard.currentStep].description}
            </p>
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">{stepContent}</div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/85 px-6 py-4 shadow-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={wizard.goPrev}
          disabled={!wizard.canGoPrev}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {wizard.currentStepId !== "complete" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { void wizard.saveDraft() }}
              disabled={wizard.isSaving}
              className="gap-2 text-muted-foreground"
            >
              {wizard.isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save draft
            </Button>
          )}

          {wizard.canGoNext ? (
            <Button size="sm" onClick={wizard.goNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : wizard.currentStepId === "complete" && !wizard.isCompleted ? (
            <Button
              size="sm"
              onClick={() => { void wizard.completeReview() }}
              disabled={wizard.isSaving}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {wizard.isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Complete Review
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

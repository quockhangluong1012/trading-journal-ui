"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import {
  ReviewPeriodType,
  getPeriodBounds,
  toISODateString,
  formatPeriodLabel,
} from "@/lib/review-api"
import {
  fetchWizardData,
  saveWizardReview,
  WIZARD_STEPS,
  type WizardData,
  type WizardStepId,
  type ActionItemRequest,
  type SaveWizardRequest,
  type TradingReviewData,
} from "@/lib/wizard-api"

export interface WizardFormState {
  executionRating: number
  disciplineRating: number
  psychologyRating: number
  riskManagementRating: number
  overallRating: number
  performanceNotes: string
  bestTradeReflection: string
  worstTradeReflection: string
  disciplineNotes: string
  psychologyNotes: string
  goalsForNextPeriod: string
  keyTakeaways: string
  actionItems: ActionItemRequest[]
}

const DEFAULT_FORM: WizardFormState = {
  executionRating: 3,
  disciplineRating: 3,
  psychologyRating: 3,
  riskManagementRating: 3,
  overallRating: 3,
  performanceNotes: "",
  bestTradeReflection: "",
  worstTradeReflection: "",
  disciplineNotes: "",
  psychologyNotes: "",
  goalsForNextPeriod: "",
  keyTakeaways: "",
  actionItems: [],
}

export interface UseReviewWizardResult {
  wizardData: WizardData | null
  form: WizardFormState
  currentStep: number
  currentStepId: WizardStepId
  isLoading: boolean
  isSaving: boolean
  isCompleted: boolean
  periodLabel: string
  periodType: ReviewPeriodType
  totalSteps: number
  canGoNext: boolean
  canGoPrev: boolean
  goNext: () => void
  goPrev: () => void
  goToStep: (step: number) => void
  updateForm: <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => void
  addActionItem: (item: Omit<ActionItemRequest, "id">) => void
  removeActionItem: (index: number) => void
  updateActionItem: (index: number, item: ActionItemRequest) => void
  saveDraft: () => Promise<void>
  completeReview: () => Promise<void>
}

export function useReviewWizard(
  periodType: ReviewPeriodType,
  referenceDate: Date
): UseReviewWizardResult {
  const { toast } = useToast()
  const mountedRef = useRef(true)

  const [wizardData, setWizardData] = useState<WizardData | null>(null)
  const [form, setForm] = useState<WizardFormState>(DEFAULT_FORM)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  const bounds = getPeriodBounds(periodType, referenceDate)
  const periodStart = toISODateString(bounds.start)
  const periodEnd = toISODateString(bounds.end)
  const periodLabel = formatPeriodLabel(periodType, referenceDate)
  const totalSteps = WIZARD_STEPS.length
  const currentStepId = WIZARD_STEPS[currentStep].id

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Load wizard data
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    fetchWizardData(periodType, periodStart)
      .then((data) => {
        if (cancelled || !mountedRef.current) return
        setWizardData(data)

        if (data.existingReview) {
          const r = data.existingReview
          setForm({
            executionRating: r.executionRating ?? 3,
            disciplineRating: r.disciplineRating ?? 3,
            psychologyRating: r.psychologyRating ?? 3,
            riskManagementRating: r.riskManagementRating ?? 3,
            overallRating: r.overallRating ?? 3,
            performanceNotes: r.performanceNotes ?? "",
            bestTradeReflection: r.bestTradeReflection ?? "",
            worstTradeReflection: r.worstTradeReflection ?? "",
            disciplineNotes: r.disciplineNotes ?? "",
            psychologyNotes: r.psychologyNotes ?? "",
            goalsForNextPeriod: r.goalsForNextPeriod ?? "",
            keyTakeaways: r.keyTakeaways ?? "",
            actionItems: r.actionItems.map((ai) => ({
              id: ai.id,
              title: ai.title,
              description: ai.description,
              priority: ai.priority,
              status: ai.status,
              category: ai.category,
              dueDate: ai.dueDate,
            })),
          })
          setIsCompleted(r.status === 1)
        } else {
          setForm(DEFAULT_FORM)
          setIsCompleted(false)
        }
      })
      .catch(() => {
        if (!mountedRef.current) return
        toast({
          title: "Could not load wizard data",
          description: "Try refreshing the page.",
          variant: "destructive",
        })
      })
      .finally(() => {
        if (mountedRef.current) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [periodType, periodStart, toast])

  const updateForm = useCallback(<K extends keyof WizardFormState>(
    key: K, value: WizardFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const addActionItem = useCallback((item: Omit<ActionItemRequest, "id">) => {
    setForm((prev) => ({
      ...prev,
      actionItems: [...prev.actionItems, { ...item }],
    }))
  }, [])

  const removeActionItem = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter((_, i) => i !== index),
    }))
  }, [])

  const updateActionItem = useCallback((index: number, item: ActionItemRequest) => {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((ai, i) => (i === index ? item : ai)),
    }))
  }, [])

  const buildRequest = useCallback(
    (markAsCompleted: boolean): SaveWizardRequest => ({
      periodType,
      periodStart,
      periodEnd,
      markAsCompleted,
      executionRating: form.executionRating,
      disciplineRating: form.disciplineRating,
      psychologyRating: form.psychologyRating,
      riskManagementRating: form.riskManagementRating,
      overallRating: form.overallRating,
      performanceNotes: form.performanceNotes || undefined,
      bestTradeReflection: form.bestTradeReflection || undefined,
      worstTradeReflection: form.worstTradeReflection || undefined,
      disciplineNotes: form.disciplineNotes || undefined,
      psychologyNotes: form.psychologyNotes || undefined,
      goalsForNextPeriod: form.goalsForNextPeriod || undefined,
      keyTakeaways: form.keyTakeaways || undefined,
      totalTrades: wizardData?.current.totalTrades ?? 0,
      wins: wizardData?.current.wins ?? 0,
      losses: wizardData?.current.losses ?? 0,
      totalPnl: wizardData?.current.totalPnl ?? 0,
      winRate: wizardData?.current.winRate ?? 0,
      ruleBreaks: wizardData?.current.ruleBreakTrades ?? 0,
      actionItems: form.actionItems,
    }),
    [form, periodType, periodStart, periodEnd, wizardData]
  )

  const saveDraft = useCallback(async () => {
    setIsSaving(true)
    try {
      await saveWizardReview(buildRequest(false))
      if (mountedRef.current) {
        toast({ title: "Draft saved", description: "Your progress has been saved." })
      }
    } catch {
      if (mountedRef.current) {
        toast({
          title: "Could not save",
          description: "Try again in a moment.",
          variant: "destructive",
        })
      }
    } finally {
      if (mountedRef.current) setIsSaving(false)
    }
  }, [buildRequest, toast])

  const completeReview = useCallback(async () => {
    setIsSaving(true)
    try {
      await saveWizardReview(buildRequest(true))
      if (mountedRef.current) {
        setIsCompleted(true)
        toast({ title: "Review completed! 🎉", description: "Great job finishing your review." })
      }
    } catch {
      if (mountedRef.current) {
        toast({
          title: "Could not complete review",
          description: "Try again in a moment.",
          variant: "destructive",
        })
      }
    } finally {
      if (mountedRef.current) setIsSaving(false)
    }
  }, [buildRequest, toast])

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1))
  }, [totalSteps])

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0))
  }, [])

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)))
  }, [totalSteps])

  return {
    wizardData,
    form,
    currentStep,
    currentStepId,
    isLoading,
    isSaving,
    isCompleted,
    periodLabel,
    periodType,
    totalSteps,
    canGoNext: currentStep < totalSteps - 1,
    canGoPrev: currentStep > 0,
    goNext,
    goPrev,
    goToStep,
    updateForm,
    addActionItem,
    removeActionItem,
    updateActionItem,
    saveDraft,
    completeReview,
  }
}

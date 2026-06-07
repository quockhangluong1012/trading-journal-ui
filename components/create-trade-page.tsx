"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTrades } from "@/lib/trade-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Save,
  Target,
  TrendingUp,
  TrendingDown,
  FileText,
  ClipboardCheck,
  Check,
  CircleAlert,
  Loader2,
  Layers,
} from "lucide-react"
import {
  EmotionTagApi,
  ChecklistModelApi,
  ChecklistModelDetailApi,
} from "@/lib/trade-store"
import { useToast } from "@/hooks/use-toast"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"
import { api, ApiResponse } from "@/lib/api"
import {
  interpretPreTradeChecklist,
  type PreTradeChecklistInterpretationResult,
} from "@/lib/ai-insights-api"
import type { TradingSetupSummaryDto } from "@/lib/setup-api"
import { cn } from "@/lib/utils"
import { AxiosResponse } from "axios"
import { IctContextFields } from "@/components/trade/ict-trade-fields"
import {
  buildCreateTradePayload,
  calculateTradeRiskMetrics,
  CREATE_TRADE_SCREENSHOT_MAX_COUNT,
  DEFAULT_CREATE_TRADE_RETURN_PATH,
  getInitialTradeFormData,
  hasMeaningfulCreateTradeNotes,
  isAllowedCreateTradeScreenshotDataUrl,
  type TradeFormData,
  validateCreateTradeScreenshot,
} from "@/lib/create-trade-form"
import { getTemplateById } from "@/lib/template-api"

export interface TradingZoneApi {
  id: number
  name: string
  description: string | null
  fromTime: string
  toTime: string
}

export interface PreTradeChecklistApi {
  id: number
  name: string
  checkListType: number
}

export interface TechnicalAnalysisTagApi {
  id: number
  name: string
  shortName: string
  description: string
}

interface CreateTradePageProps {
  returnTo?: string
  templateId?: number
  queryOverrides?: {
    asset?: string
    position?: string
    entry?: string
    sl?: string
    t1?: string
    zone?: string
    confidence?: string
  }
  onSuccess?: () => void
}

import { TradeFormSection } from "./trade/create-trade/trade-form-section"
import { TradeSummaryStat } from "./trade/create-trade/trade-summary-stat"
import { TradeSetupSection } from "./trade/create-trade/trade-setup-section"
import { AiChartScreenshotAnalysis } from "./trade/create-trade/ai-chart-screenshot-analysis"
import { AiDisciplineGuardian } from "./trade/create-trade/ai-discipline-guardian"
import { AiPreTradeValidation } from "./trade/create-trade/ai-pre-trade-validation"
import { RiskManagementSection } from "./trade/create-trade/risk-management-section"
import { PreTradeChecklistSection } from "./trade/create-trade/pre-trade-checklist-section"
import { MarketContextSection } from "./trade/create-trade/market-context-section"
import { TradingPsychologySection } from "./trade/create-trade/trading-psychology-section"
import { NotesEvidenceSection, type UploadedTradeScreenshot } from "./trade/create-trade/notes-evidence-section"
import {
  formatTradeDate,
  getConfidenceLabel,
  getProgressTone,
  getRRColorClass,
  surfaceFieldClassName,
} from "./trade/create-trade/shared-utils"

const WIZARD_STEPS = [
  {
    id: "setup",
    label: "Setup",
    description: "Define the instrument, trade direction, entry, stop, and targets.",
    icon: Target,
  },
  {
    id: "context",
    label: "Context",
    description: "Capture checklist status, market context, and trading psychology.",
    icon: ClipboardCheck,
  },
  {
    id: "evidence",
    label: "Evidence & Submit",
    description: "Add notes or charts, then review the setup before saving it.",
    icon: FileText,
  },
] as const

const STEP_VALIDATION_FIELDS = [
  ["asset", "entryPrice", "stopLoss", "date", "targetTier1"],
  ["checklist", "tradingSession", "confidenceLevel"],
  [],
] as const

const VALIDATION_GUIDANCE: Record<string, string> = {
  asset: "Add the asset or market you are planning to trade.",
  entryPrice: "Enter a valid entry price for the setup.",
  stopLoss: "Set a protective stop loss before continuing.",
  date: "Choose the date for this trade idea.",
  targetTier1: "Add at least one target so the reward plan is clear.",
  checklist: "Choose a checklist model if you want pre-trade criteria.",
  tradingSession: "Select the trading zone or session for this setup.",
  confidenceLevel: "Set your confidence level to capture conviction.",
}

function getCreateTradeValidationErrors({
  formData,
  checklistCount,
  checkedItemCount,
  tradingSession,
  confidenceLevel,
}: {
  formData: TradeFormData
  checklistCount: number
  checkedItemCount: number
  tradingSession: string
  confidenceLevel: number
}): Record<string, string> {
  const nextErrors: Record<string, string> = {}

  if (!formData.asset.trim()) {
    nextErrors.asset = "Asset name is required"
  }

  if (!formData.entryPrice || Number.parseFloat(formData.entryPrice) <= 0) {
    nextErrors.entryPrice = "Valid entry price is required"
  }

  if (!formData.stopLoss || Number.parseFloat(formData.stopLoss) <= 0) {
    nextErrors.stopLoss = "Valid stop loss is required"
  }

  if (!formData.date) {
    nextErrors.date = "Trade date is required"
  }

  if (!formData.targetTier1 && !formData.targetTier2 && !formData.targetTier3) {
    nextErrors.targetTier1 = "At least one target price is required"
  }

  if (checklistCount > 0 && checkedItemCount === 0) {
    nextErrors.checklist = "Please complete at least one checklist item"
  }

  if (!tradingSession) {
    nextErrors.tradingSession = "Trading zone is required"
  }

  if (confidenceLevel === 0) {
    nextErrors.confidenceLevel = "Confidence level is required"
  }

  return nextErrors
}

export function CreateTradePage({
  returnTo = DEFAULT_CREATE_TRADE_RETURN_PATH,
  templateId,
  queryOverrides,
  onSuccess,
}: CreateTradePageProps) {
  const router = useRouter()
  const { addTrade, activeSession } = useTrades()
  const { toast } = useToast()
  const overrideAsset = queryOverrides?.asset
  const overridePosition = queryOverrides?.position
  const overrideEntry = queryOverrides?.entry
  const overrideStopLoss = queryOverrides?.sl
  const overrideTargetTier1 = queryOverrides?.t1
  const overrideTradingZone = queryOverrides?.zone
  const overrideConfidence = queryOverrides?.confidence

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [screenshots, setScreenshots] = useState<UploadedTradeScreenshot[]>([])
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [confidenceLevel, setConfidenceLevel] = useState<number>(overrideConfidence ? Number(overrideConfidence) : 0)
  const [analysisTags, setAnalysisTags] = useState<string[]>([])
  const [tradingSession, setTradingSession] = useState(overrideTradingZone || "")
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [apiTags, setApiTags] = useState<EmotionTagApi[]>([])
  const [apiChecklists, setApiChecklists] = useState<PreTradeChecklistApi[]>([])
  const [apiTechTags, setApiTechTags] = useState<TechnicalAnalysisTagApi[]>([])
  const [apiTradingZones, setApiTradingZones] = useState<TradingZoneApi[]>([])
  const [assetOptions, setAssetOptions] = useState<string[]>([])
  const [setupOptions, setSetupOptions] = useState<TradingSetupSummaryDto[]>([])
  const [checklistModels, setChecklistModels] = useState<ChecklistModelApi[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [selectedModelDetail, setSelectedModelDetail] =
    useState<ChecklistModelDetailApi | null>(null)
  const [checklistAiInput, setChecklistAiInput] = useState("")
  const [checklistInterpretation, setChecklistInterpretation] =
    useState<PreTradeChecklistInterpretationResult | null>(null)
  const [isChecklistInterpreting, setIsChecklistInterpreting] = useState(false)
  const [formData, setFormData] = useState<TradeFormData>(() => {
    const initial = getInitialTradeFormData()
    if (overrideAsset) initial.asset = overrideAsset
    if (overridePosition) initial.position = Number(overridePosition) as PositionType
    if (overrideEntry) initial.entryPrice = overrideEntry
    if (overrideStopLoss) initial.stopLoss = overrideStopLoss
    if (overrideTargetTier1) initial.targetTier1 = overrideTargetTier1
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState(0)

  // ICT Methodology state
  const [ictPowerOf3, setIctPowerOf3] = useState<number | null>(null)
  const [ictDailyBias, setIctDailyBias] = useState<number | null>(null)
  const [ictMarketStructure, setIctMarketStructure] = useState<number | null>(null)
  const [ictPremiumDiscount, setIctPremiumDiscount] = useState<number | null>(null)

  const checklistDetailRequestRef = useRef(0)

  // Effect to load template
  useEffect(() => {
    if (!templateId) return
    let isActive = true
    const loadTemplate = async () => {
      try {
        const res = await getTemplateById(templateId)
        if (!isActive) return
        if (res.data.isSuccess && res.data.value) {
          const tpl = res.data.value
          setFormData((prev) => ({
            ...prev,
            asset: overrideAsset || tpl.asset || prev.asset,
            tradingSetupId: tpl.tradingSetupId != null ? String(tpl.tradingSetupId) : prev.tradingSetupId,
            position: overridePosition ? (Number(overridePosition) as PositionType) : (tpl.position != null ? (tpl.position as PositionType) : prev.position),
            stopLoss: overrideStopLoss || (tpl.defaultStopLoss != null ? String(tpl.defaultStopLoss) : prev.stopLoss),
            targetTier1: overrideTargetTier1 || (tpl.defaultTargetTier1 != null ? String(tpl.defaultTargetTier1) : prev.targetTier1),
            targetTier2: tpl.defaultTargetTier2 != null ? String(tpl.defaultTargetTier2) : prev.targetTier2,
            targetTier3: tpl.defaultTargetTier3 != null ? String(tpl.defaultTargetTier3) : prev.targetTier3,
            notes: tpl.defaultNotes || prev.notes,
          }))
          if (!overrideTradingZone && tpl.tradingZoneId != null) {
            setTradingSession(String(tpl.tradingZoneId))
          }
          if (!overrideConfidence && tpl.defaultConfidenceLevel != null) {
            setConfidenceLevel(tpl.defaultConfidenceLevel)
          }
          if (tpl.defaultEmotionTagIds && tpl.defaultEmotionTagIds.length > 0) {
             setSelectedEmotions(tpl.defaultEmotionTagIds.map(String))
          }
          if (tpl.defaultTechnicalAnalysisTagIds && tpl.defaultTechnicalAnalysisTagIds.length > 0) {
             setAnalysisTags(tpl.defaultTechnicalAnalysisTagIds.map(String))
          }
          if (tpl.defaultChecklistIds && tpl.defaultChecklistIds.length > 0) {
            setCheckedItems(tpl.defaultChecklistIds.map(String))
          }
        }
      } catch (err) {
        console.error("Failed to load template", err)
      }
    }
    void loadTemplate()
    return () => { isActive = false }
  }, [
    overrideAsset,
    overrideConfidence,
    overridePosition,
    overrideStopLoss,
    overrideTargetTier1,
    overrideTradingZone,
    templateId,
  ])

  useEffect(() => {
    let isActive = true

    const loadReferenceData = async () => {
      const results = await Promise.allSettled([
        api.get<ApiResponse<EmotionTagApi[]>>("/v1/emotions"),
        api.get<ApiResponse<ChecklistModelApi[]>>("/v1/checklist-models"),
        api.get<ApiResponse<TechnicalAnalysisTagApi[]>>("/v1/technical-analysis"),
        api.get<ApiResponse<TradingZoneApi[]>>("/v1/trading-zones"),
        api.get<ApiResponse<string[]>>("/v1/trade-histories/assets"),
        api.get<ApiResponse<TradingSetupSummaryDto[]>>("/v1/trading-setups"),
      ])

      if (!isActive) {
        return
      }

      const failedResources: string[] = []
      const [emotionsResult, checklistModelsResult, technicalTagsResult, tradingZonesResult, assetOptionsResult, setupsResult] =
        results

      if (
        emotionsResult.status === "fulfilled" &&
        emotionsResult.value.data.isSuccess
      ) {
        setApiTags(emotionsResult.value.data.value)
      } else {
        failedResources.push("emotion tags")
      }

      if (
        checklistModelsResult.status === "fulfilled" &&
        checklistModelsResult.value.data.isSuccess
      ) {
        setChecklistModels(checklistModelsResult.value.data.value)

        if (checklistModelsResult.value.data.value.length > 0) {
          setSelectedModelId((currentValue) => currentValue || checklistModelsResult.value.data.value[0].id.toString())
        }
      } else {
        failedResources.push("checklist models")
      }

      if (
        technicalTagsResult.status === "fulfilled" &&
        technicalTagsResult.value.data.isSuccess
      ) {
        setApiTechTags(technicalTagsResult.value.data.value)
      } else {
        failedResources.push("technical analysis tags")
      }

      if (
        tradingZonesResult.status === "fulfilled" &&
        tradingZonesResult.value.data.isSuccess
      ) {
        setApiTradingZones(tradingZonesResult.value.data.value)
      } else {
        failedResources.push("trading zones")
      }

      if (
        assetOptionsResult.status === "fulfilled" &&
        assetOptionsResult.value.data.isSuccess
      ) {
        setAssetOptions(assetOptionsResult.value.data.value)
      } else {
        failedResources.push("asset names")
      }

      if (
        setupsResult.status === "fulfilled" &&
        setupsResult.value.data.isSuccess
      ) {
        setSetupOptions(setupsResult.value.data.value)
      } else {
        failedResources.push("trading setups")
      }

      if (failedResources.length > 0) {
        toast({
          variant: "destructive",
          title: "Some trade planner data could not be loaded",
          description: `Unavailable: ${failedResources.join(", ")}. You can still complete the rest of the form.`,
        })
      }
    }

    void loadReferenceData()

    return () => {
      isActive = false
    }
  }, [toast])

  useEffect(() => {
    checklistDetailRequestRef.current += 1
    const requestId = checklistDetailRequestRef.current
    let isActive = true

    setSelectedModelDetail(null)
    setApiChecklists([])
    setChecklistInterpretation(null)

    if (!selectedModelId) {
      return
    }

    const loadChecklistDetail = async () => {
      try {
        const response: AxiosResponse<ApiResponse<ChecklistModelDetailApi>> = await api.get(
          `/v1/checklist-models/${selectedModelId}`,
        )

        if (!isActive || requestId !== checklistDetailRequestRef.current) {
          return
        }

        if (!response.data.isSuccess) {
          toast({
            variant: "destructive",
            title: "Checklist model unavailable",
            description: "The selected checklist could not be loaded. Choose another model or refresh the page.",
          })
          return
        }

        setSelectedModelDetail(response.data.value)
        setApiChecklists(response.data.value.criteria)
      } catch {
        if (!isActive || requestId !== checklistDetailRequestRef.current) {
          return
        }

        toast({
          variant: "destructive",
          title: "Checklist model unavailable",
          description: "The selected checklist could not be loaded. Choose another model or refresh the page.",
        })
      }
    }

    void loadChecklistDetail()

    return () => {
      isActive = false
    }
  }, [selectedModelId, toast])

  const checklistProgress =
    apiChecklists.length > 0
      ? Math.round((checkedItems.length / apiChecklists.length) * 100)
      : 0

  const riskMetrics = useMemo(() => calculateTradeRiskMetrics(formData), [formData])

  const toggleChecklistItem = (id: string) => {
    setCheckedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    )

    if (errors.checklist) {
      setErrors((prev) => {
        const nextErrors = { ...prev }
        delete nextErrors.checklist
        return nextErrors
      })
    }
  }

  const handleInterpretChecklist = async () => {
    if (!selectedModelId) {
      toast({
        variant: "destructive",
        title: "Select a checklist model",
        description: "Choose the checklist model you want the notes mapped against.",
      })
      return
    }

    if (!checklistAiInput.trim()) {
      toast({
        variant: "destructive",
        title: "Add a short checklist note",
        description: "Describe the setup in plain English before asking AI to interpret it.",
      })
      return
    }

    try {
      setIsChecklistInterpreting(true)

      const result = await interpretPreTradeChecklist({
        checklistModelId: Number(selectedModelId),
        input: checklistAiInput,
      })

      setChecklistInterpretation(result)

      toast({
        title: "Checklist suggestions ready",
        description: result.summary,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to interpret checklist notes",
        description: error instanceof Error ? error.message : "Try again in a moment.",
      })
    } finally {
      setIsChecklistInterpreting(false)
    }
  }

  const handleApplyChecklistSuggestions = () => {
    if (!checklistInterpretation) {
      return
    }

    const nextChecklistIds = Array.from(new Set([
      ...checkedItems,
      ...checklistInterpretation.suggestedChecklistIds.map(String),
    ]))

    setCheckedItems(nextChecklistIds)

    if (errors.checklist) {
      setErrors((prev) => {
        const nextErrors = { ...prev }
        delete nextErrors.checklist
        return nextErrors
      })
    }

    toast({
      title: "Checklist suggestions applied",
      description: `Added ${checklistInterpretation.suggestedChecklistIds.length} suggested item${checklistInterpretation.suggestedChecklistIds.length === 1 ? "" : "s"}.`,
    })
  }

  const validateForm = () => {
    const nextErrors = getCreateTradeValidationErrors({
      formData,
      checklistCount: apiChecklists.length,
      checkedItemCount: checkedItems.length,
      tradingSession,
      confidenceLevel,
    })

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const validateStep = (stepIndex: number) => {
    const relevantFields = [...STEP_VALIDATION_FIELDS[stepIndex]] as string[]

    if (relevantFields.length === 0) {
      return true
    }

    const nextErrors = getCreateTradeValidationErrors({
      formData,
      checklistCount: apiChecklists.length,
      checkedItemCount: checkedItems.length,
      tradingSession,
      confidenceLevel,
    })

    setErrors((prev) => {
      const mergedErrors = { ...prev }

      relevantFields.forEach((field) => {
        delete mergedErrors[field]
      })

      Object.entries(nextErrors).forEach(([field, message]) => {
        if (relevantFields.includes(field)) {
          mergedErrors[field] = message
        }
      })

      return mergedErrors
    })

    return relevantFields.every((field) => !nextErrors[field])
  }

  const scrollToWizardTop = () => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" })
  }

  const handleStepChange = (nextStep: number) => {
    if (nextStep === currentStep || nextStep < 0 || nextStep >= WIZARD_STEPS.length) {
      return
    }

    if (nextStep > currentStep) {
      for (let stepIndex = currentStep; stepIndex < nextStep; stepIndex += 1) {
        const isStepValid = validateStep(stepIndex)

        if (!isStepValid) {
          if (stepIndex !== currentStep) {
            setCurrentStep(stepIndex)
          }

          toast({
            variant: "destructive",
            title: "Complete this step first",
            description: "Fill the highlighted fields before moving to the next section.",
          })
          scrollToWizardTop()
          return
        }
      }
    }

    setCurrentStep(nextStep)
    scrollToWizardTop()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const payload = buildCreateTradePayload({
        formData,
        screenshots,
        analysisTags,
        selectedEmotions,
        confidenceLevel,
        checkedItems,
        tradingSession,
        activeSessionId: activeSession?.id ?? null,
        ictPowerOf3: ictPowerOf3,
        ictDailyBias: ictDailyBias,
        ictMarketStructure: ictMarketStructure,
        ictPremiumDiscount: ictPremiumDiscount,
      })

      const response = await api.post<ApiResponse<number>>("/v1/trade-histories", payload)

      if (!response.data.isSuccess) {
        throw new Error("Failed to create trade via API")
      }

      toast({
        title: "Trade Created",
        description: "Your trade has been successfully recorded.",
      })

      addTrade({
        asset: formData.asset.toUpperCase().trim(),
        tradingSetupId: formData.tradingSetupId || undefined,
        position: Number(formData.position),
        entryPrice: Number.parseFloat(formData.entryPrice),
        targetTier1: Number.parseFloat(formData.targetTier1) || 0,
        targetTier2: Number.parseFloat(formData.targetTier2) || 0,
        targetTier3: Number.parseFloat(formData.targetTier3) || 0,
        stopLoss: Number.parseFloat(formData.stopLoss),
        notes: formData.notes,
        date: formData.date,
        status: TradeStatus.Open,
        screenshots:
          screenshots.length > 0
            ? screenshots.map((screenshot) => ({ url: screenshot.url }))
            : undefined,
        emotionTags: selectedEmotions.length > 0 ? selectedEmotions : undefined,
        confidenceLevel: confidenceLevel > 0 ? confidenceLevel : undefined,
        analysisTags: analysisTags.length > 0 ? analysisTags : undefined,
        tradingSession: tradingSession || undefined,
        pretradeChecklist: checkedItems.length > 0 ? checkedItems : undefined,
        powerOf3Phase: ictPowerOf3 ?? null,
        dailyBias: ictDailyBias ?? null,
        marketStructure: ictMarketStructure ?? null,
        premiumDiscount: ictPremiumDiscount ?? null,
      })

      onSuccess?.()
      router.push(returnTo)
    } catch (error: unknown) {
      const description =
        error instanceof Error
          ? error.message
          : "Failed to create trade. Please try again."

      toast({
        variant: "destructive",
        title: "Error",
        description,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleEmotion = (id: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(id) ? prev.filter((emotionId) => emotionId !== id) : [...prev, id],
    )
  }

  const toggleAnalysisTag = (tagId: string) => {
    setAnalysisTags((prev) =>
      prev.includes(tagId) ? prev.filter((itemId) => itemId !== tagId) : [...prev, tagId],
    )
  }

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) {
      return
    }

    const currentTotalSizeBytes = screenshots.reduce(
      (totalSize, screenshot) => totalSize + screenshot.sizeBytes,
      0,
    )
    let nextScreenshotCount = screenshots.length
    let nextTotalSizeBytes = currentTotalSizeBytes
    const validFiles: File[] = []
    const validationMessages: string[] = []

    Array.from(files).forEach((file) => {
      const validationMessage = validateCreateTradeScreenshot(
        {
          name: file.name,
          type: file.type,
          size: file.size,
        },
        nextScreenshotCount,
        nextTotalSizeBytes,
      )

      if (validationMessage) {
        validationMessages.push(validationMessage)
        return
      }

      validFiles.push(file)
      nextScreenshotCount += 1
      nextTotalSizeBytes += file.size
    })

    if (validationMessages.length > 0) {
      toast({
        variant: "destructive",
        title: "Some screenshots were skipped",
        description: validationMessages[0],
      })
    }

    validFiles.forEach((file) => {
      const fileReader = new FileReader()

      fileReader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Screenshot upload failed",
          description: `Could not read ${file.name}. Please try a different image.`,
        })
      }

      fileReader.onload = (loadEvent) => {
        const result = loadEvent.target?.result as string
        if (!result || !isAllowedCreateTradeScreenshotDataUrl(result)) {
          toast({
            variant: "destructive",
            title: "Unsupported screenshot format",
            description: "Only PNG, JPG, and WebP screenshots are supported.",
          })
          return
        }

        setScreenshots((prev) => [...prev, { url: result, sizeBytes: file.size }])
      }

      fileReader.readAsDataURL(file)
    })

    event.target.value = ""
  }

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleInputChange = (
    field: keyof Omit<TradeFormData, "position">,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors((prev) => {
        const nextErrors = { ...prev }
        delete nextErrors[field]
        return nextErrors
      })
    }
  }

  const handlePositionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      position: Number.parseInt(value, 10) as PositionType,
    }))
  }


  const selectedTradingZone = apiTradingZones.find(
    (zone) => zone.id.toString() === tradingSession,
  )
  const selectedTradingZoneName = selectedTradingZone?.name ?? null
  const selectedTradingSetup = useMemo(
    () => setupOptions.find((setup) => setup.id.toString() === formData.tradingSetupId) ?? null,
    [formData.tradingSetupId, setupOptions],
  )
  const selectedChecklistModel = useMemo(
    () => checklistModels.find((model) => model.id.toString() === selectedModelId),
    [checklistModels, selectedModelId],
  )
  const hasMeaningfulNotes = hasMeaningfulCreateTradeNotes(formData.notes)
  const hasTargetConfigured = Boolean(
    formData.targetTier1 || formData.targetTier2 || formData.targetTier3,
  )
  const completionChecks = [
    formData.asset.trim().length > 0,
    Number.parseFloat(formData.entryPrice) > 0,
    Number.parseFloat(formData.stopLoss) > 0,
    Boolean(formData.date),
    hasTargetConfigured,
    apiChecklists.length === 0 || checkedItems.length > 0,
    Boolean(tradingSession),
    confidenceLevel > 0,
  ]
  const completionProgress = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100,
  )
  const previewAsset = formData.asset.trim().toUpperCase() || "Untitled trade"
  const isLongPosition = formData.position === PositionType.Long
  const riskTone = getProgressTone(riskMetrics.riskScore)
  const checklistTone = getProgressTone(checklistProgress)
  const completionTone = getProgressTone(completionProgress)
  const validationErrors = useMemo(
    () => getCreateTradeValidationErrors({
      formData,
      checklistCount: apiChecklists.length,
      checkedItemCount: checkedItems.length,
      tradingSession,
      confidenceLevel,
    }),
    [apiChecklists.length, checkedItems.length, confidenceLevel, formData, tradingSession],
  )
  const stepReadiness = [
    {
      completed: [
        formData.asset.trim().length > 0,
        Number.parseFloat(formData.entryPrice) > 0,
        Number.parseFloat(formData.stopLoss) > 0,
        Boolean(formData.date),
        hasTargetConfigured,
      ].filter(Boolean).length,
      total: 5,
    },
    {
      completed: [
        apiChecklists.length === 0 || checkedItems.length > 0,
        Boolean(tradingSession),
        confidenceLevel > 0,
      ].filter(Boolean).length,
      total: 3,
    },
    {
      completed: [hasMeaningfulNotes, screenshots.length > 0].filter(Boolean).length,
      total: 2,
    },
  ]
  const currentStepMeta = WIZARD_STEPS[currentStep]
  const currentStepReadiness = stepReadiness[currentStep]
  const currentStepTone = getProgressTone(
    Math.round((currentStepReadiness.completed / currentStepReadiness.total) * 100),
  )
  const currentStepAttentionItems = STEP_VALIDATION_FIELDS[currentStep]
    .filter((field) => validationErrors[field])
    .map((field) => {
      if (field === "checklist" && apiChecklists.length > 0) {
        return "Check at least one checklist item for this model."
      }

      return VALIDATION_GUIDANCE[field] ?? validationErrors[field]
    })
  const reviewSuggestions = [
    hasMeaningfulNotes
      ? null
      : "Add a short trade rationale so the later review has context.",
    screenshots.length > 0
      ? null
      : `Upload up to ${CREATE_TRADE_SCREENSHOT_MAX_COUNT} screenshots if you want AI chart analysis.`,
    selectedTradingZoneName
      ? null
      : "Confirm the trading zone so session-based review stays accurate.",
  ].filter((item): item is string => Boolean(item))
  const sidebarGuidanceItems =
    currentStepAttentionItems.length > 0
      ? currentStepAttentionItems
      : currentStep === WIZARD_STEPS.length - 1
        ? reviewSuggestions.length > 0
          ? reviewSuggestions
          : ["Notes and evidence are in place. Review the live preview and submit when ready."]
        : ["This step has the required inputs. Use the live preview to sanity check before moving on."]
  const remainingRequiredCount = Object.keys(validationErrors).length
  const nextStepLabel =
    currentStep < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[currentStep + 1].label : null
  const currentStepStatusLabel =
    currentStepAttentionItems.length > 0
      ? `${currentStepAttentionItems.length} item${currentStepAttentionItems.length === 1 ? "" : "s"} to fix`
      : currentStep === WIZARD_STEPS.length - 1
        ? "Optional review aids"
        : "Ready to continue"

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 pb-28">
      <section className="rounded-xl border border-slate-200/80 bg-background/90 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/85">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="-ml-2 h-8 shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
              <Link href={returnTo}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  Create New Trade
                </h1>
                <Badge variant="outline" className="hidden h-6 rounded-md border-slate-200/80 bg-background/75 px-2 text-[10px] dark:border-slate-700/70 dark:bg-slate-900/75 sm:inline-flex">
                  {activeSession ? "Session linked" : "Manual entry"}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Current focus: <span className="font-medium text-foreground">{currentStepMeta.label}</span>
                <span className="text-muted-foreground/80"> - {currentStepMeta.description}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline" className={cn("h-7 rounded-md px-2.5 text-[11px]", riskTone.pillClassName)}>
              Risk {riskMetrics.riskScore}/100
            </Badge>
            <Badge variant="outline" className={cn("h-7 rounded-md px-2.5 text-[11px]", completionTone.pillClassName)}>
              {completionProgress}% ready
            </Badge>
          </div>
        </div>

        <div className="mt-3 border-t border-slate-200/70 pt-3 dark:border-slate-700/60">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Wizard progress
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {WIZARD_STEPS.map((step, index) => {
              const StepIcon = step.icon
              const stepState = stepReadiness[index]
              const stepPercent = Math.round((stepState.completed / stepState.total) * 100)
              const stepErrors = STEP_VALIDATION_FIELDS[index].filter((field) => validationErrors[field])
              const isActive = index === currentStep
              const isCompleted = index < currentStep || stepPercent === 100

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepChange(index)}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                    isActive
                      ? "border-primary/45 bg-primary/10"
                      : "border-slate-200/70 bg-background/60 hover:border-slate-300/90 hover:bg-background/80 dark:border-slate-700/70 dark:bg-slate-950/60 dark:hover:border-slate-500/80",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                      isActive
                        ? "border-primary/35 bg-primary/15 text-primary"
                        : isCompleted
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                          : stepErrors.length > 0
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : "border-slate-200/70 bg-background text-muted-foreground dark:border-slate-700/70 dark:bg-slate-900",
                    )}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      <span className="mr-1 text-muted-foreground">{index + 1}.</span>
                      {step.label}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        isActive
                          ? currentStepTone.textClassName
                          : isCompleted
                            ? "text-emerald-400"
                            : stepErrors.length > 0
                              ? "text-red-400"
                              : "text-muted-foreground",
                      )}
                    >
                      {stepState.completed}/{stepState.total} ready
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="relative overflow-visible">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
            <TradeSetupSection
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
              handlePositionChange={handlePositionChange}
              assetOptions={assetOptions}
              setupOptions={setupOptions}
              selectedTradingSetupId={formData.tradingSetupId}
              selectedTradingSetup={selectedTradingSetup}
              surfaceFieldClassName={surfaceFieldClassName}
            />

            <RiskManagementSection
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
              surfaceFieldClassName={surfaceFieldClassName}
              riskMetrics={riskMetrics}
              riskTone={riskTone}
              getRRColorClass={getRRColorClass}
            />
                </motion.div>
              )}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >

            <PreTradeChecklistSection
              selectedModelDetail={selectedModelDetail}
              checkedItems={checkedItems}
              apiChecklists={apiChecklists}
              checklistTone={checklistTone}
              selectedModelId={selectedModelId}
              setSelectedModelId={setSelectedModelId}
              setCheckedItems={setCheckedItems}
              checklistModels={checklistModels}
              checklistProgress={checklistProgress}
              errors={errors}
              toggleChecklistItem={toggleChecklistItem}
              checklistAiInput={checklistAiInput}
              setChecklistAiInput={setChecklistAiInput}
              checklistInterpretation={checklistInterpretation}
              isChecklistInterpreting={isChecklistInterpreting}
              handleInterpretChecklist={handleInterpretChecklist}
              handleApplyChecklistSuggestions={handleApplyChecklistSuggestions}
              surfaceFieldClassName={surfaceFieldClassName}
            />

            <MarketContextSection
              apiTechTags={apiTechTags}
              analysisTags={analysisTags}
              toggleAnalysisTag={toggleAnalysisTag}
              apiTradingZones={apiTradingZones}
              tradingSession={tradingSession}
              setTradingSession={setTradingSession}
              errors={errors}
              setErrors={setErrors}
            />

            <TradingPsychologySection
              apiTags={apiTags}
              selectedEmotions={selectedEmotions}
              toggleEmotion={toggleEmotion}
              confidenceLevel={confidenceLevel}
              setConfidenceLevel={setConfidenceLevel}
              errors={errors}
              setErrors={setErrors}
              notesText={formData.notes}
            />

            {/* ICT Methodology Section */}
            <TradeFormSection
              title="ICT Methodology"
              description="Annotate your trade with ICT concepts — Power of 3 (AMD), market structure, and zone classification."
              icon={<Layers className="h-4 w-4 text-cyan-400" />}
            >
              <IctContextFields
                  powerOf3Phase={ictPowerOf3}
                  dailyBias={ictDailyBias}
                  marketStructure={ictMarketStructure}
                  premiumDiscount={ictPremiumDiscount}
                  onPowerOf3Change={setIctPowerOf3}
                  onDailyBiasChange={setIctDailyBias}
                  onMarketStructureChange={setIctMarketStructure}
                  onPremiumDiscountChange={setIctPremiumDiscount}
                />
            </TradeFormSection>
                </motion.div>
              )}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >

            <NotesEvidenceSection
              formData={formData}
              handleInputChange={handleInputChange}
              surfaceFieldClassName={surfaceFieldClassName}
              screenshots={screenshots}
              handleScreenshotUpload={handleScreenshotUpload}
              removeScreenshot={removeScreenshot}
            />

            <AiChartScreenshotAnalysis
              asset={formData.asset}
              position={formData.position === PositionType.Long ? "Long" : "Short"}
              entryPrice={formData.entryPrice}
              stopLoss={formData.stopLoss}
              targetTier1={formData.targetTier1}
              tradingZone={selectedTradingZoneName}
              notes={formData.notes}
              screenshots={screenshots}
            />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <aside className="order-last self-start space-y-3 xl:sticky xl:top-20">
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-background/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/85">
              <div className="border-b border-slate-200/70 px-3 py-3 dark:border-slate-700/60">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200/80 bg-background/80 px-2.5 py-0.5 text-[10px] dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-200"
                  >
                    Open trade
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px]",
                      isLongPosition
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                        : "border-red-500/30 bg-red-500/15 text-red-400",
                    )}
                  >
                    {isLongPosition ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {isLongPosition ? "Long" : "Short"}
                  </Badge>
                </div>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Live preview
                    </p>
                    <h2 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-foreground">
                      {previewAsset}
                    </h2>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-muted-foreground/80">
                    {formatTradeDate(formData.date)}
                  </p>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Form completion</span>
                    <span className={completionTone.textClassName}>{completionProgress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        completionTone.barClassName,
                      )}
                      style={{ width: `${completionProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 px-3 py-3">
                <div className="rounded-lg border border-slate-200/80 bg-background/80 p-3 dark:border-slate-700/70 dark:bg-slate-950/70">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                        currentStepAttentionItems.length > 0
                          ? "border-red-500/25 bg-red-500/10 text-red-400"
                          : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
                      )}
                    >
                      {currentStepAttentionItems.length > 0 ? (
                        <CircleAlert className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {currentStepAttentionItems.length > 0
                          ? "Needs attention"
                          : currentStep === WIZARD_STEPS.length - 1
                            ? "Helpful before submit"
                            : "Current step status"}
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {currentStepMeta.label}
                      </p>
                      <p className="text-sm text-muted-foreground/80">
                        {currentStepStatusLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {sidebarGuidanceItems.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-2 rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-foreground/90 dark:border-slate-700/70 dark:bg-slate-900/75 dark:text-slate-100"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <TradeSummaryStat
                    label="Entry"
                    value={formData.entryPrice || "--"}
                    helper="Price at execution"
                  />
                  <TradeSummaryStat
                    label="Stop loss"
                    value={formData.stopLoss || "--"}
                    helper="Protective exit"
                  />
                  <TradeSummaryStat
                    label="R : R"
                    value={riskMetrics.rrRatio > 0 ? `1 : ${riskMetrics.rrRatio.toFixed(2)}` : "--"}
                    helper="Tier 1 target vs stop"
                    valueClassName={
                      riskMetrics.rrRatio > 0
                        ? getRRColorClass(riskMetrics.rrRatio)
                        : undefined
                    }
                  />
                  <TradeSummaryStat
                    label="Confidence"
                    value={getConfidenceLabel(confidenceLevel)}
                    helper="Your conviction level"
                  />
                </div>

                <div className="rounded-lg border border-slate-200/80 bg-background/80 p-3 dark:border-slate-700/70 dark:bg-slate-950/70">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Captured context
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Checklist</span>
                      <span className="text-right font-medium text-foreground">
                        {selectedChecklistModel
                          ? `${checkedItems.length}/${apiChecklists.length || selectedChecklistModel.criteriaCount}`
                          : "Not selected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Trading zone</span>
                      <span className="text-right font-medium text-foreground">
                        {selectedTradingZone?.name || "Not selected"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Emotion tags</span>
                      <span className="font-medium text-foreground">{selectedEmotions.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">TA tags</span>
                      <span className="font-medium text-foreground">{analysisTags.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Screenshots</span>
                      <span className="font-medium text-foreground">{screenshots.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/70 px-3 py-3 dark:border-slate-700/60">
                <div className="space-y-3">
                  <AiPreTradeValidation
                    asset={formData.asset}
                    position={formData.position === PositionType.Long ? "Long" : "Short"}
                    entryPrice={formData.entryPrice}
                    stopLoss={formData.stopLoss}
                    targetTier1={formData.targetTier1}
                    targetTier2={formData.targetTier2}
                    targetTier3={formData.targetTier3}
                    confidenceLevel={confidenceLevel}
                    tradingZone={selectedTradingZoneName}
                    technicalAnalysisTags={analysisTags.map((id) => apiTechTags.find((tag) => tag.id.toString() === id)?.name || id)}
                    checklistStatus={apiChecklists.length > 0 ? `${checkedItems.length}/${apiChecklists.length} completed` : "No checklist"}
                    emotionTags={selectedEmotions.map((id) => apiTags.find((tag) => tag.id.toString() === id)?.name || id)}
                    notes={formData.notes}
                  />

                  <AiDisciplineGuardian />
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 rounded-xl border border-slate-200/80 bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-950/92">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {currentStep === WIZARD_STEPS.length - 1
                  ? "Final review before you submit"
                  : `Step ${currentStep + 1}: ${currentStepMeta.label}`}
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                  remainingRequiredCount > 0 ? completionTone.pillClassName : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
                )}
              >
                {remainingRequiredCount > 0
                  ? `${remainingRequiredCount} required item${remainingRequiredCount === 1 ? "" : "s"} remaining`
                  : "Ready to submit"}
              </Badge>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                key="back-button"
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  if (currentStep > 0) handleStepChange(currentStep - 1)
                  else router.push(returnTo)
                }}
                className="rounded-lg sm:min-w-24"
              >
                {currentStep > 0 ? "Back" : "Cancel"}
              </Button>
              {currentStep < WIZARD_STEPS.length - 1 ? (
                <Button
                  key="continue-button"
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    handleStepChange(currentStep + 1)
                  }}
                  className="rounded-lg sm:min-w-40"
                >
                  Continue to {nextStepLabel}
                </Button>
              ) : (
                <Button key="submit-button" type="submit" size="sm" disabled={isSubmitting} className="gap-2 rounded-lg sm:min-w-40">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Creating..." : "Create Trade"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

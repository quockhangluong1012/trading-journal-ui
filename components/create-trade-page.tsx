"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTrades } from "@/lib/trade-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Save,
  Target,
  TrendingUp,
  TrendingDown,
  Shield,
  FileText,
  ImagePlus,
  X,
  Brain,
  Tags,
  Clock,
  ClipboardCheck,
  Check,
  CircleAlert,
  Gauge,
  AlertTriangle,
  Loader2,
  Layers,
} from "lucide-react"
import {
  EmotionTagApi,
  getTagCategory,
  TradeScreenshot,
  ChecklistModelApi,
  ChecklistModelDetailApi,
} from "@/lib/trade-store"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"
import { api, ApiResponse } from "@/lib/api"
import { getPlainTextFromRichText } from "@/lib/rich-text"
import { cn } from "@/lib/utils"
import { AxiosResponse } from "axios"
import { IctContextFields } from "@/components/trade/ict-trade-fields"
import {
  buildCreateTradePayload,
  calculateTradeRiskMetrics,
  CREATE_TRADE_SCREENSHOT_MAX_COUNT,
  DEFAULT_CREATE_TRADE_RETURN_PATH,
  getInitialTradeFormData,
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

export function CreateTradePage({
  returnTo = DEFAULT_CREATE_TRADE_RETURN_PATH,
  templateId,
  queryOverrides,
  onSuccess,
}: CreateTradePageProps) {
  const router = useRouter()
  const { addTrade, activeSession } = useTrades()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [screenshots, setScreenshots] = useState<UploadedTradeScreenshot[]>([])
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [confidenceLevel, setConfidenceLevel] = useState<number>(queryOverrides?.confidence ? Number(queryOverrides.confidence) : 0)
  const [analysisTags, setAnalysisTags] = useState<string[]>([])
  const [tradingSession, setTradingSession] = useState(queryOverrides?.zone || "")
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [apiTags, setApiTags] = useState<EmotionTagApi[]>([])
  const [apiChecklists, setApiChecklists] = useState<PreTradeChecklistApi[]>([])
  const [apiTechTags, setApiTechTags] = useState<TechnicalAnalysisTagApi[]>([])
  const [apiTradingZones, setApiTradingZones] = useState<TradingZoneApi[]>([])
  const [checklistModels, setChecklistModels] = useState<ChecklistModelApi[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [selectedModelDetail, setSelectedModelDetail] =
    useState<ChecklistModelDetailApi | null>(null)
  const [formData, setFormData] = useState<TradeFormData>(() => {
    const initial = getInitialTradeFormData()
    if (queryOverrides?.asset) initial.asset = queryOverrides.asset
    if (queryOverrides?.position) initial.position = Number(queryOverrides.position) as PositionType
    if (queryOverrides?.entry) initial.entryPrice = queryOverrides.entry
    if (queryOverrides?.sl) initial.stopLoss = queryOverrides.sl
    if (queryOverrides?.t1) initial.targetTier1 = queryOverrides.t1
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState(0)

  // ICT Methodology state
  const [ictPowerOf3, setIctPowerOf3] = useState<number | null>(null)
  const [ictDailyBias, setIctDailyBias] = useState<number | null>(null)
  const [ictMarketStructure, setIctMarketStructure] = useState<number | null>(null)
  const [ictPremiumDiscount, setIctPremiumDiscount] = useState<number | null>(null)


  const WIZARD_STEPS = [
    { id: "setup", label: "Setup" },
    { id: "context", label: "Context" },
    { id: "evidence", label: "Review" },
  ]

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
            asset: queryOverrides?.asset || tpl.asset || prev.asset,
            position: queryOverrides?.position ? (Number(queryOverrides.position) as PositionType) : (tpl.position != null ? (tpl.position as PositionType) : prev.position),
            stopLoss: queryOverrides?.sl || (tpl.defaultStopLoss != null ? String(tpl.defaultStopLoss) : prev.stopLoss),
            targetTier1: queryOverrides?.t1 || (tpl.defaultTargetTier1 != null ? String(tpl.defaultTargetTier1) : prev.targetTier1),
            targetTier2: tpl.defaultTargetTier2 != null ? String(tpl.defaultTargetTier2) : prev.targetTier2,
            targetTier3: tpl.defaultTargetTier3 != null ? String(tpl.defaultTargetTier3) : prev.targetTier3,
            notes: tpl.defaultNotes || prev.notes,
          }))
          if (!queryOverrides?.zone && tpl.tradingZoneId != null) {
            setTradingSession(String(tpl.tradingZoneId))
          }
          if (!queryOverrides?.confidence && tpl.defaultConfidenceLevel != null) {
            setConfidenceLevel(tpl.defaultConfidenceLevel)
          }
          if (tpl.defaultEmotionTagIds && tpl.defaultEmotionTagIds.length > 0) {
             setSelectedEmotions(tpl.defaultEmotionTagIds.map(String))
          }
          if (tpl.defaultTechnicalAnalysisTagIds && tpl.defaultTechnicalAnalysisTagIds.length > 0) {
             setAnalysisTags(tpl.defaultTechnicalAnalysisTagIds.map(String))
          }
          if (tpl.tradingSetupId != null) {
            setSelectedModelId(String(tpl.tradingSetupId))
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
  }, [templateId, queryOverrides])

  useEffect(() => {
    let isActive = true

    const loadReferenceData = async () => {
      const results = await Promise.allSettled([
        api.get<ApiResponse<EmotionTagApi[]>>("/v1/emotions"),
        api.get<ApiResponse<ChecklistModelApi[]>>("/v1/checklist-models"),
        api.get<ApiResponse<TechnicalAnalysisTagApi[]>>("/v1/technical-analysis"),
        api.get<ApiResponse<TradingZoneApi[]>>("/v1/trading-zones"),
      ])

      if (!isActive) {
        return
      }

      const failedResources: string[] = []
      const [emotionsResult, checklistModelsResult, technicalTagsResult, tradingZonesResult] =
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
          setSelectedModelId(checklistModelsResult.value.data.value[0].id.toString())
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

  const validateForm = () => {
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

    if (apiChecklists.length > 0 && checkedItems.length === 0) {
      nextErrors.checklist = "Please complete at least one checklist item"
    }

    if (!tradingSession) {
      nextErrors.tradingSession = "Trading zone is required"
    }

    if (confidenceLevel === 0) {
      nextErrors.confidenceLevel = "Confidence level is required"
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
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
  const selectedChecklistModel = checklistModels.find(
    (model) => model.id.toString() === selectedModelId,
  )
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

  return (
    <div className="relative space-y-8 pb-32">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] left-[-5%] h-[600px] w-[600px] animate-pulse rounded-full bg-primary/10 blur-[120px] duration-1000" />
        <div className="absolute right-[-5%] top-[20%] h-[500px] w-[500px] animate-pulse rounded-full bg-accent/10 blur-[100px] duration-700" />
        <div className="absolute bottom-[10%] left-[10%] h-[700px] w-[700px] animate-pulse rounded-full bg-emerald-500/5 blur-[150px] duration-1000" />
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-background/40 shadow-sm backdrop-blur-2xl">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
        <div className="relative flex flex-col gap-8 px-8 py-10 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 space-y-5">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="-ml-2 w-fit gap-2 text-muted-foreground transition-all hover:text-foreground hover:bg-white/5"
            >
              <Link href={returnTo}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/30 bg-primary/15 px-3 py-1.5 text-[11px] font-medium text-primary shadow-inner"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Trade Planner
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-white/10 bg-background/60 px-3 py-1.5 text-[11px] backdrop-blur-md"
              >
                {activeSession ? "Session linked" : "Manual entry"}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-white/10 bg-background/60 px-3 py-1.5 text-[11px] backdrop-blur-md"
              >
                Standalone page
              </Badge>
            </div>

            <div>
              <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent drop-shadow-sm">
                Create New Trade
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground/80">
                Capture execution details, risk guardrails, and trading psychology before the position goes live.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TradeSummaryStat
              label="Risk score"
              value={`${riskMetrics.riskScore}/100`}
              helper="Live based on stop and target setup"
              valueClassName={riskTone.textClassName}
            />
            <TradeSummaryStat
              label="Form completion"
              value={`${completionProgress}%`}
              helper="Core trade fields ready"
              valueClassName={completionTone.textClassName}
            />
          </div>
        </div>
      </div>

        {/* Stepper Progress */}
        <div className="mx-auto mt-4 mb-4 flex w-full max-w-3xl justify-between relative px-2 sm:px-6">
          <div className="absolute left-6 right-6 top-1/2 -z-10 h-1.5 -translate-y-1/2 rounded-full bg-secondary/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
              style={{ width: `${(currentStep / (WIZARD_STEPS.length - 1)) * 100}%` }}
            />
          </div>
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500",
                  index <= currentStep
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-110"
                    : "border-white/10 bg-background/80 text-muted-foreground backdrop-blur-sm",
                )}
              >
                {index < currentStep ? <Check className="h-6 w-6" /> : <span className="text-sm font-bold">{index + 1}</span>}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-[0.15em] transition-colors duration-300 text-center",
                  index <= currentStep ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative overflow-visible">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
            <TradeSetupSection
              formData={formData}
              errors={errors}
              handleInputChange={handleInputChange}
              handlePositionChange={handlePositionChange}
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
                  className="space-y-6"
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
                  className="space-y-6"
                >

            <NotesEvidenceSection
              formData={formData}
              handleInputChange={handleInputChange}
              surfaceFieldClassName={surfaceFieldClassName}
              screenshots={screenshots}
              handleScreenshotUpload={handleScreenshotUpload}
              removeScreenshot={removeScreenshot}
            />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <aside className="order-last self-start space-y-6 xl:sticky xl:top-24">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-background/50 shadow-xl backdrop-blur-2xl transition-all duration-500 hover:shadow-2xl">
              <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent opacity-50" />
              <div className="relative border-b border-border/30 px-6 py-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-white/10 bg-background/80 px-3 py-1.5 text-[11px] shadow-sm backdrop-blur-md"
                  >
                    Open trade
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[11px] shadow-sm backdrop-blur-md",
                      isLongPosition
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                        : "border-red-500/30 bg-red-500/15 text-red-400",
                    )}
                  >
                    {isLongPosition ? (
                      <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {isLongPosition ? "Long" : "Short"}
                  </Badge>
                </div>

                <div className="mt-5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Live preview
                  </p>
                  <h2 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text mt-2 text-3xl font-bold tracking-tight text-transparent">
                    {previewAsset}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-muted-foreground/80">
                    {formatTradeDate(formData.date)}
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Form completion</span>
                    <span className={completionTone.textClassName}>{completionProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
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

              <div className="px-5 pt-4">
                <AiPreTradeValidation
                  asset={formData.asset}
                  position={formData.position === PositionType.Long ? "Long" : "Short"}
                  entryPrice={formData.entryPrice}
                  stopLoss={formData.stopLoss}
                  targetTier1={formData.targetTier1}
                  targetTier2={formData.targetTier2}
                  targetTier3={formData.targetTier3}
                  confidenceLevel={confidenceLevel}
                  tradingZone={apiTradingZones.find(z => z.id.toString() === tradingSession)?.name || null}
                  technicalAnalysisTags={analysisTags.map(id => apiTechTags.find(t => t.id.toString() === id)?.name || id)}
                  checklistStatus={apiChecklists.length > 0 ? `${checkedItems.length}/${apiChecklists.length} completed` : "No checklist"}
                  emotionTags={selectedEmotions.map(id => apiTags.find(t => t.id.toString() === id)?.name || id)}
                  notes={formData.notes}
                />
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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

                <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm">
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
            </div>
          </aside>
        </div>

        <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-5xl -translate-x-1/2 overflow-hidden rounded-[2rem] border border-white/10 bg-background/60 px-6 py-4 shadow-2xl backdrop-blur-2xl transition-all duration-500">
          <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-transparent to-accent/10 opacity-30" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                Review the guardrails before you submit
              </p>
              <p className="text-xs font-medium text-muted-foreground/80">
                This trade will be saved as open and synced to your dashboard immediately.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                key="back-button"
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  if (currentStep > 0) setCurrentStep(prev => prev - 1)
                  else router.push(returnTo)
                }}
                className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10 sm:min-w-32 backdrop-blur-md transition-all duration-300"
              >
                {currentStep > 0 ? "Back" : "Cancel"}
              </Button>
              {currentStep < WIZARD_STEPS.length - 1 ? (
                <Button 
                  key="continue-button"
                  type="button" 
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentStep(prev => prev + 1)
                  }}
                  className="rounded-xl sm:min-w-44 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40"
                >
                  Continue to Next Step
                </Button>
              ) : (
                <Button key="submit-button" type="submit" disabled={isSubmitting} className="rounded-xl gap-2 sm:min-w-44 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40">
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
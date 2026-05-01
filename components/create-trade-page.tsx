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
import { IctContextFields, IctPreTradeChecklist } from "@/components/trade/ict-trade-fields"
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
  onSuccess?: () => void
}

interface TradeFormSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  headerAccessory?: React.ReactNode
}

interface TradeSummaryStatProps {
  label: string
  value: string
  helper?: string
  valueClassName?: string
}

interface UploadedTradeScreenshot extends TradeScreenshot {
  sizeBytes: number
}

const categoryLabel: Record<number, string> = {
  1: "Market Structure",
  2: "Trade Setup",
  3: "Risk Management",
  4: "Psychology",
}

const categoryColor: Record<number, string> = {
  1: "text-cyan-400",
  2: "text-primary",
  3: "text-red-400",
  4: "text-blue-400",
}

const formatTradeDate = (value: string): string => {
  if (!value) {
    return "Select trade date"
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return "Select trade date"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate)
}

const getConfidenceLabel = (confidenceLevel: number): string => {
  switch (confidenceLevel) {
    case 1:
      return "Very Low"
    case 2:
      return "Low"
    case 3:
      return "Neutral"
    case 4:
      return "High"
    case 5:
      return "Very High"
    default:
      return "Not set"
  }
}

const getProgressTone = (progress: number) => {
  if (progress >= 75) {
    return {
      barClassName: "bg-emerald-500",
      pillClassName: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      textClassName: "text-emerald-400",
    }
  }

  if (progress >= 50) {
    return {
      barClassName: "bg-amber-400",
      pillClassName: "border-amber-500/20 bg-amber-500/10 text-amber-400",
      textClassName: "text-amber-400",
    }
  }

  if (progress >= 25) {
    return {
      barClassName: "bg-orange-400",
      pillClassName: "border-orange-500/20 bg-orange-500/10 text-orange-400",
      textClassName: "text-orange-400",
    }
  }

  return {
    barClassName: "bg-red-500",
    pillClassName: "border-red-500/20 bg-red-500/10 text-red-400",
    textClassName: "text-red-400",
  }
}

function TradeFormSection({
  title,
  description,
  icon,
  children,
  className,
  contentClassName,
  headerAccessory,
}: TradeFormSectionProps) {
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/10 border-t-[3px] border-t-primary/70 dark:border-white/5 dark:border-t-primary bg-background/30 shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/5 via-transparent to-background/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex flex-col gap-4 border-b border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-linear-to-br from-background/80 to-muted/50 text-foreground shadow-inner transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">
            {icon}
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-xs leading-relaxed text-muted-foreground/80">
              {description}
            </p>
          </div>
        </div>
        {headerAccessory ? <div className="ml-[64px] sm:ml-0">{headerAccessory}</div> : null}
      </div>
      <div className={cn("relative z-10 px-6 py-6", contentClassName)}>{children}</div>
    </section>
  )
}

function TradeSummaryStat({
  label,
  value,
  helper,
  valueClassName,
}: TradeSummaryStatProps) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-background/40 p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-background/60 hover:shadow-md">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-foreground/80">
        {label}
      </p>
      <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        <span className={cn("inline-block transition-transform duration-300 group-hover:translate-x-0.5", valueClassName)}>{value}</span>
      </div>
      {helper ? (
        <p className="mt-2 border-t border-border/30 pt-2 text-[11px] leading-relaxed text-muted-foreground/80">
          {helper}
        </p>
      ) : null}
    </div>
  )
}

export function CreateTradePage({
  returnTo = DEFAULT_CREATE_TRADE_RETURN_PATH,
  onSuccess,
}: CreateTradePageProps) {
  const router = useRouter()
  const { addTrade, activeSession } = useTrades()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [screenshots, setScreenshots] = useState<UploadedTradeScreenshot[]>([])
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0)
  const [analysisTags, setAnalysisTags] = useState<string[]>([])
  const [tradingSession, setTradingSession] = useState("")
  const [checkedItems, setCheckedItems] = useState<string[]>([])
  const [apiTags, setApiTags] = useState<EmotionTagApi[]>([])
  const [apiChecklists, setApiChecklists] = useState<PreTradeChecklistApi[]>([])
  const [apiTechTags, setApiTechTags] = useState<TechnicalAnalysisTagApi[]>([])
  const [apiTradingZones, setApiTradingZones] = useState<TradingZoneApi[]>([])
  const [checklistModels, setChecklistModels] = useState<ChecklistModelApi[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>("")
  const [selectedModelDetail, setSelectedModelDetail] =
    useState<ChecklistModelDetailApi | null>(null)
  const [formData, setFormData] = useState<TradeFormData>(getInitialTradeFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentStep, setCurrentStep] = useState(0)

  // ICT Methodology state
  const [ictPowerOf3, setIctPowerOf3] = useState<number | null>(null)
  const [ictDailyBias, setIctDailyBias] = useState<number | null>(null)
  const [ictMarketStructure, setIctMarketStructure] = useState<number | null>(null)
  const [ictPremiumDiscount, setIctPremiumDiscount] = useState<number | null>(null)
  const [ictChecklist, setIctChecklist] = useState<string[]>([])

  const WIZARD_STEPS = [
    { id: "setup", label: "Setup" },
    { id: "context", label: "Context & Psych" },
    { id: "evidence", label: "Review" },
  ]

  const checklistDetailRequestRef = useRef(0)

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

  const getRRColorClass = (rrRatio: number) => {
    if (rrRatio >= 2) {
      return "text-emerald-400"
    }

    if (rrRatio >= 1) {
      return "text-amber-400"
    }

    return "text-red-400"
  }

  const surfaceFieldClassName = "border-white/10 bg-background/50 backdrop-blur-sm shadow-inner transition-all hover:border-primary/40 focus:bg-background/80 focus:ring-2 focus:ring-primary/20"
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
                  "text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] transition-colors duration-300",
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
            <TradeFormSection
              title="Trade Setup"
              description="Set the core execution details first, then define a clear profit ladder before the trade is live."
              icon={<FileText className="h-4 w-4 text-primary" />}
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="asset">Asset Name</Label>
                      <Input
                        id="asset"
                        placeholder="e.g., BTC/USD, AAPL, ETH"
                        value={formData.asset}
                        onChange={(event) => handleInputChange("asset", event.target.value)}
                        className={cn(surfaceFieldClassName, errors.asset && "border-destructive")}
                      />
                      {errors.asset ? (
                        <p className="text-xs text-destructive">{errors.asset}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position">Position Type</Label>
                      <Select
                        value={formData.position.toString()}
                        onValueChange={handlePositionChange}
                      >
                        <SelectTrigger id="position" className={surfaceFieldClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PositionType.Long.toString()}>
                            <span className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-success" />
                              Long
                            </span>
                          </SelectItem>
                          <SelectItem value={PositionType.Short.toString()}>
                            <span className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-destructive" />
                              Short
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="entryPrice">Entry Price</Label>
                      <Input
                        id="entryPrice"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.entryPrice}
                        onChange={(event) => handleInputChange("entryPrice", event.target.value)}
                        className={cn(surfaceFieldClassName, errors.entryPrice && "border-destructive")}
                      />
                      {errors.entryPrice ? (
                        <p className="text-xs text-destructive">{errors.entryPrice}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Trade Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(event) => handleInputChange("date", event.target.value)}
                        className={cn(surfaceFieldClassName, errors.date && "border-destructive")}
                      />
                      {errors.date ? (
                        <p className="text-xs text-destructive">{errors.date}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-emerald-400" />
                    Profit ladder
                  </div>

                  <div className="mt-4 grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetTier1">Tier 1 Target</Label>
                      <Input
                        id="targetTier1"
                        type="number"
                        step="0.01"
                        placeholder="Conservative"
                        value={formData.targetTier1}
                        onChange={(event) => handleInputChange("targetTier1", event.target.value)}
                        className={cn(surfaceFieldClassName, errors.targetTier1 && "border-destructive")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="targetTier2">Tier 2 Target</Label>
                      <Input
                        id="targetTier2"
                        type="number"
                        step="0.01"
                        placeholder="Moderate"
                        value={formData.targetTier2}
                        onChange={(event) => handleInputChange("targetTier2", event.target.value)}
                        className={surfaceFieldClassName}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="targetTier3">Tier 3 Target</Label>
                      <Input
                        id="targetTier3"
                        type="number"
                        step="0.01"
                        placeholder="Aggressive"
                        value={formData.targetTier3}
                        onChange={(event) => handleInputChange("targetTier3", event.target.value)}
                        className={surfaceFieldClassName}
                      />
                    </div>

                    {errors.targetTier1 ? (
                      <p className="text-xs text-destructive">{errors.targetTier1}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </TradeFormSection>

            <TradeFormSection
              title="Risk Management & Guardrails"
              description="Pressure-test the stop, reward profile, and risk score before you commit capital."
              icon={<Shield className="h-4 w-4 text-destructive" />}
              headerAccessory={
                <Badge
                  variant="outline"
                  className={cn("rounded-full px-3 py-1 text-[11px]", riskTone.pillClassName)}
                >
                  {riskMetrics.riskScore}/100 score
                </Badge>
              }
            >
              <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                  <div className="space-y-2">
                    <Label htmlFor="stopLoss">Stop Loss Price</Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.stopLoss}
                      onChange={(event) => handleInputChange("stopLoss", event.target.value)}
                      className={cn(surfaceFieldClassName, errors.stopLoss && "border-destructive")}
                    />
                    {errors.stopLoss ? (
                      <p className="text-xs text-destructive">{errors.stopLoss}</p>
                    ) : null}
                    {riskMetrics.riskPctFromSl > 0 ? (
                      <p
                        className={cn(
                          "text-[11px]",
                          riskMetrics.riskPctFromSl > 5
                            ? "text-red-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {riskMetrics.riskPctFromSl.toFixed(1)}% away from entry
                        {riskMetrics.riskPctFromSl > 5 ? " - wide stop" : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <TradeSummaryStat
                      label="Risk / unit"
                      value={`$${riskMetrics.riskPerUnit.toFixed(2)}`}
                      helper="Distance to stop"
                    />
                    <TradeSummaryStat
                      label="Reward / unit"
                      value={`$${riskMetrics.rewardPerUnit.toFixed(2)}`}
                      helper="Tier 1 upside"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.entryPrice || formData.stopLoss ? (
                    <div className="rounded-2xl border border-border/60 bg-secondary/15 p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Gauge className="h-3.5 w-3.5" />
                          Risk Assessment Score
                        </span>
                        <span className={cn("text-sm font-bold", riskTone.textClassName)}>
                          {riskMetrics.riskScore}/100
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            riskTone.barClassName,
                          )}
                          style={{ width: `${riskMetrics.riskScore}%` }}
                        />
                      </div>

                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        {riskMetrics.riskScore >= 75
                          ? "Excellent risk profile. This setup is aligned with disciplined trade planning."
                          : riskMetrics.riskScore >= 50
                            ? "Decent setup. Tighten the stop or improve the reward ladder if possible."
                            : riskMetrics.riskScore >= 25
                              ? "Below average. Rework the stop placement or refine your targets."
                              : "High risk. Define the stop and at least one target before submitting this trade."}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-4 text-sm text-muted-foreground shadow-sm">
                      Add the entry and stop loss to preview the trade&apos;s risk score.
                    </div>
                  )}

                  {riskMetrics.rrRatio > 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Risk : Reward Ratio
                        </span>
                        <span className={cn("text-sm font-bold", getRRColorClass(riskMetrics.rrRatio))}>
                          1 : {riskMetrics.rrRatio.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full border-r border-background bg-red-500/50"
                          style={{
                            width: `${Math.min((1 / (1 + riskMetrics.rrRatio)) * 100, 80)}%`,
                          }}
                        />
                        <div
                          className="h-full bg-emerald-500/50"
                          style={{
                            width: `${Math.min((riskMetrics.rrRatio / (1 + riskMetrics.rrRatio)) * 100, 80)}%`,
                          }}
                        />
                      </div>

                      <div className="mt-2 flex justify-between text-[11px]">
                        <span className="text-red-400">
                          Risk: ${riskMetrics.riskPerUnit.toFixed(2)}
                        </span>
                        <span className="text-emerald-400">
                          Reward: ${riskMetrics.rewardPerUnit.toFixed(2)}
                        </span>
                      </div>

                      {riskMetrics.rrRatio < 1.5 ? (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          R:R is below 1.5. Consider improving the target ladder or tightening the stop.
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-4 text-sm text-muted-foreground shadow-sm">
                      Add at least one target to preview the reward profile.
                    </div>
                  )}
                </div>
              </div>
            </TradeFormSection>
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

            <TradeFormSection
              title="Pre-trade Checklist"
              description="Run through your model before the order is placed so the trade follows a repeatable process."
              icon={<ClipboardCheck className="h-4 w-4 text-amber-400" />}
              headerAccessory={
                selectedModelDetail ? (
                  <Badge
                    variant="outline"
                    className={cn("rounded-full px-3 py-1 text-[11px]", checklistTone.pillClassName)}
                  >
                    {checkedItems.length}/{apiChecklists.length} complete
                  </Badge>
                ) : null
              }
            >
              <div className="space-y-4">
                <div className="max-w-xl space-y-2">
                  <Label>Checklist Model</Label>
                  <Select
                    value={selectedModelId}
                    onValueChange={(value: string) => {
                      setSelectedModelId(value)
                      setCheckedItems([])
                    }}
                  >
                    <SelectTrigger className={surfaceFieldClassName}>
                      <SelectValue placeholder="Select a checklist model" />
                    </SelectTrigger>
                    <SelectContent>
                      {checklistModels.map((model) => (
                        <SelectItem key={model.id} value={model.id.toString()}>
                          <span className="flex items-center gap-2">
                            {model.name}
                            <span className="text-[10px] text-muted-foreground">
                              ({model.criteriaCount} criteria)
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedModelDetail?.description ? (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {getPlainTextFromRichText(selectedModelDetail.description)}
                    </p>
                  ) : null}
                </div>

                {selectedModelDetail ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Checklist completion</span>
                        <span className={checklistTone.textClassName}>{checklistProgress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            checklistTone.barClassName,
                          )}
                          style={{ width: `${checklistProgress}%` }}
                        />
                      </div>
                    </div>

                    {checklistProgress < 100 && checkedItems.length > 0 ? (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5">
                        <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <span className="text-xs text-amber-400">
                          {apiChecklists.length - checkedItems.length} item
                          {apiChecklists.length - checkedItems.length !== 1 ? "s" : ""} remaining. Complete your checklist before trading.
                        </span>
                      </div>
                    ) : null}

                    {errors.checklist ? (
                      <p className="text-xs text-destructive">{errors.checklist}</p>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      {[1, 2, 3, 4].map((typeId) => {
                        const items = apiChecklists.filter(
                          (item) => item.checkListType === typeId,
                        )

                        if (items.length === 0) {
                          return null
                        }

                        return (
                          <div
                            key={typeId}
                            className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-sm"
                          >
                            <span className={cn("text-xs font-medium", categoryColor[typeId])}>
                              {categoryLabel[typeId]}
                            </span>
                            <div className="mt-3 space-y-2">
                              {items.map((item) => {
                                const isChecked = checkedItems.includes(item.id.toString())

                                return (
                                  <label
                                    key={item.id}
                                    className={cn(
                                      "group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 hover:shadow-sm",
                                      isChecked
                                        ? "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                        : "border-white/10 bg-background/50 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:-translate-y-0.5",
                                    )}
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={() =>
                                        toggleChecklistItem(item.id.toString())
                                      }
                                      className="shrink-0"
                                    />
                                    <span
                                      className={cn(
                                        "text-sm transition-colors",
                                        isChecked ? "text-emerald-400" : "text-foreground",
                                      )}
                                    >
                                      {item.name}
                                    </span>
                                    {isChecked ? (
                                      <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                    ) : null}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : checklistModels.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No pre-trade models yet. <Link href="/settings/pretrade-models" className="text-primary underline underline-offset-4">Create one in settings</Link>.
                  </p>
                ) : (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Select a checklist model above to see criteria.
                  </p>
                )}
              </div>
            </TradeFormSection>

            <TradeFormSection
              title="Market Context"
              description="Capture the structural reasons for the trade and the trading zone where it was executed."
              icon={<Tags className="h-4 w-4 text-primary" />}
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Technical Analysis Tags
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Tag the methods or structures that support this setup.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {apiTechTags.map((tag) => {
                      const isSelected = analysisTags.includes(tag.id.toString())
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleAnalysisTag(tag.id.toString())}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)]",
                            isSelected
                              ? "border-primary/50 bg-primary/20 text-primary ring-2 ring-primary/30 shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                              : "border-white/10 bg-background/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
                          )}
                          title={tag.description}
                        >
                          {tag.name} {tag.shortName ? `(${tag.shortName})` : ""}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Clock className="h-4 w-4 text-amber-400" />
                      Trading Zone
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select the market session or killzone when the trade was taken.
                    </p>
                  </div>

                  {errors.tradingSession ? (
                    <p className="text-xs text-destructive">{errors.tradingSession}</p>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                    {apiTradingZones.map((zone) => {
                      const isSelected = tradingSession === zone.id.toString()
                      return (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => {
                            setTradingSession(isSelected ? "" : zone.id.toString())

                            if (errors.tradingSession) {
                              setErrors((prev) => {
                                const nextErrors = { ...prev }
                                delete nextErrors.tradingSession
                                return nextErrors
                              })
                            }
                          }}
                          className={cn(
                            "group flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]",
                            errors.tradingSession && !isSelected && "border-destructive/50",
                            isSelected
                              ? "border-amber-500/50 bg-amber-500/15 ring-2 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                              : "border-white/10 bg-background/50 hover:border-amber-500/40 hover:bg-amber-500/10",
                          )}
                          title={getPlainTextFromRichText(zone.description || "") || undefined}
                        >
                          <span
                            className={cn(
                              "text-xs font-medium",
                              isSelected ? "text-amber-400" : "text-foreground",
                            )}
                          >
                            {zone.name}
                          </span>
                          <span
                            className={cn(
                              "mt-1 text-[10px] leading-tight",
                              isSelected ? "text-amber-400/70" : "text-muted-foreground",
                            )}
                          >
                            {zone.fromTime} - {zone.toTime}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </TradeFormSection>

            <TradeFormSection
              title="Trading Psychology"
              description="Track your emotional state and conviction so you can spot behavioral patterns over time."
              icon={<Brain className="h-4 w-4 text-accent" />}
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_260px]">
                <div className="space-y-4">
                  <Label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    How are you feeling about this trade?
                  </Label>

                  {(["positive", "negative", "neutral"] as const).map((category) => (
                    <div key={category} className="space-y-2">
                      <span className="text-xs font-medium capitalize text-muted-foreground">
                        {category}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {apiTags
                          .filter((tag) => getTagCategory(tag.name) === category)
                          .map((tag) => {
                            const isSelected = selectedEmotions.includes(tag.id.toString())
                            const colorMap = {
                              positive: isSelected
                                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                                : "border-border bg-secondary/40 text-muted-foreground hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400",
                              negative: isSelected
                                ? "border-red-500/40 bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
                                : "border-border bg-secondary/40 text-muted-foreground hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400",
                              neutral: isSelected
                                ? "border-blue-500/40 bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
                                : "border-border bg-secondary/40 text-muted-foreground hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400",
                            }

                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleEmotion(tag.id.toString())}
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                                  colorMap[category].replace("border-border bg-secondary/40", "border-white/10 bg-background/50"),
                                )}
                              >
                                {tag.name}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Confidence Level
                    </Label>
                    {errors.confidenceLevel ? (
                      <p className="text-xs text-destructive">{errors.confidenceLevel}</p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          setConfidenceLevel(level === confidenceLevel ? 0 : level)

                          if (errors.confidenceLevel) {
                            setErrors((prev) => {
                              const nextErrors = { ...prev }
                              delete nextErrors.confidenceLevel
                              return nextErrors
                            })
                          }
                        }}
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full border text-base font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                          errors.confidenceLevel && confidenceLevel === 0 && "border-destructive/50",
                          confidenceLevel >= level
                            ? "border-primary bg-primary/20 text-primary shadow-[0_0_15px_rgba(79,70,229,0.3)] ring-2 ring-primary/40 scale-110"
                            : "border-white/10 bg-background/50 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                        aria-label={`Confidence level ${level}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>

                  <p className="mt-4 text-sm font-medium text-foreground">
                    {getConfidenceLabel(confidenceLevel)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Use this to compare conviction against the eventual outcome in your review workflow.
                  </p>
                </div>
              </div>
            </TradeFormSection>

            {/* ICT Methodology Section */}
            <TradeFormSection
              title="ICT Methodology"
              description="Annotate your trade with ICT concepts — Power of 3 (AMD), market structure, and zone classification."
              icon={<Layers className="h-4 w-4 text-cyan-400" />}
            >
              <div className="space-y-6">
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

                <div className="border-t border-border/40 pt-4">
                  <IctPreTradeChecklist
                    checkedItems={ictChecklist}
                    onToggle={(id) => setIctChecklist((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
                  />
                </div>
              </div>
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

            <TradeFormSection
              title="Notes & Evidence"
              description="Capture why the trade exists and attach chart context or setup screenshots for later review."
              icon={<ImagePlus className="h-4 w-4 text-primary" />}
            >
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-3">
                  <Label htmlFor="trade-notes">Trade Notes</Label>
                  <Textarea
                    id="trade-notes"
                    placeholder="Add your rationale, market conditions, trigger, or execution notes..."
                    value={formData.notes}
                    onChange={(event) => handleInputChange("notes", event.target.value)}
                    rows={12}
                    className={cn(surfaceFieldClassName, "min-h-96 resize-y")}
                  />
                </div>

                <div className="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-foreground">Screenshots</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Upload up to {CREATE_TRADE_SCREENSHOT_MAX_COUNT} PNG, JPG, or WebP screenshots, 5MB each.
                    </p>
                  </div>

                  <label
                    htmlFor="screenshot-upload"
                    className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-linear-to-br from-muted/20 to-background px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <ImagePlus className="mb-3 h-8 w-8 text-muted-foreground transition-transform group-hover:scale-105 group-hover:text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Click to upload screenshots
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG, or WebP
                    </span>
                    <input
                      id="screenshot-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      className="sr-only"
                      onChange={handleScreenshotUpload}
                    />
                  </label>

                  {screenshots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {screenshots.map((src, index) => (
                        <div
                          key={index}
                          className="group relative overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm"
                        >
                          <img
                            src={src.url}
                            alt={`Screenshot ${index + 1}`}
                            className="aspect-video w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeScreenshot(index)}
                            className="absolute right-1.5 top-1.5 rounded-full bg-background/85 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                            aria-label={`Remove screenshot ${index + 1}`}
                          >
                            <X className="h-3.5 w-3.5 text-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </TradeFormSection>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <aside className="order-first self-start space-y-6 xl:sticky xl:top-24 xl:order-last">
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
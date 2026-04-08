"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useTrades } from "@/lib/trade-context"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
import { Save, Target, TrendingUp, TrendingDown, Shield, FileText, ImagePlus, X, Brain, Tags, Clock, ClipboardCheck, Check, CircleAlert, Gauge, AlertTriangle, Info, DollarSign, Loader2 } from "lucide-react"
import { EmotionTagApi, getTagCategory, TradeScreenshot, ChecklistModelApi, ChecklistModelDetailApi } from "@/lib/trade-store"
import { useToast } from "@/hooks/use-toast"

export interface TradingZoneApi {
  id: number;
  name: string;
  description: string | null;
  fromTime: string;
  toTime: string;
}
import { Checkbox } from "@/components/ui/checkbox"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"
import { api, ApiResponse } from "@/lib/api"
import { Axios, AxiosResponse } from "axios"

export interface PreTradeChecklistApi {
  id: number;
  name: string;
  checkListType: number;
}

const categoryLabel: Record<number, string> = {
  1: "Market Structure",
  2: "Trade Setup",
  3: "Risk Management",
  4: "Psychology",
};
const categoryColor: Record<number, string> = {
  1: "text-cyan-400",
  2: "text-primary",
  3: "text-red-400",
  4: "text-blue-400",
};

export interface TechnicalAnalysisTagApi {
  id: number;
  name: string;
  shortName: string;
  description: string;
}

interface CreateTradeDialogProps {
  children: React.ReactNode
  onSuccess?: () => void
}

export function CreateTradeDialog({ children, onSuccess }: CreateTradeDialogProps) {
  const { addTrade, activeSession } = useTrades()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [screenshots, setScreenshots] = useState<TradeScreenshot[]>([])
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
  const [selectedModelDetail, setSelectedModelDetail] = useState<ChecklistModelDetailApi | null>(null)

  useEffect(() => {
    api
      .get<ApiResponse<EmotionTagApi[]>>("/v1/emotions")
      .then((response: AxiosResponse<ApiResponse<EmotionTagApi[]>>) => {
        let data = response.data;
        if (data.isSuccess) setApiTags(data.value);
      })
      .catch((err) => console.error("Failed to fetch API tags:", err));

    api.get<ApiResponse<ChecklistModelApi[]>>("/v1/checklist-models")
      .then((response: AxiosResponse<ApiResponse<ChecklistModelApi[]>>) => {
        let data = response.data;
        if (data.isSuccess) {
          setChecklistModels(data.value)
          // Auto-select first model if available
          if (data.value.length > 0) {
            setSelectedModelId(data.value[0].id.toString())
          }
        }
      })
      .catch((err) => console.error("Failed to fetch checklist models:", err))

    api.get<ApiResponse<TechnicalAnalysisTagApi[]>>("/v1/technical-analysis")
      .then((response: AxiosResponse<ApiResponse<TechnicalAnalysisTagApi[]>>) => {
        let data = response.data;
        if (data.isSuccess) setApiTechTags(data.value)
      })
      .catch((err) => console.error("Failed to fetch API technical analysis tags:", err))

    api.get<ApiResponse<TradingZoneApi[]>>("/v1/trading-zones")
      .then((response: AxiosResponse<ApiResponse<TradingZoneApi[]>>) => {
        let data = response.data;
        if (data.isSuccess) setApiTradingZones(data.value)
      })
      .catch((err) => console.error("Failed to fetch API trading zones:", err))
  }, [])

  const [formData, setFormData] = useState({
    asset: "",
    position: PositionType.Long,
    entryPrice: "",
    targetTier1: "",
    targetTier2: "",
    targetTier3: "",
    stopLoss: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  })

  // Reset form when opened completely
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Small delay to allow the dialog closing animation to finish before resetting
      setTimeout(() => {
        setFormData({
          asset: "",
          position: PositionType.Long,
          entryPrice: "",
          targetTier1: "",
          targetTier2: "",
          targetTier3: "",
          stopLoss: "",
          notes: "",
          date: new Date().toISOString().split("T")[0],
        })
        setScreenshots([])
        setSelectedEmotions([])
        setConfidenceLevel(0)
        setAnalysisTags([])
        setTradingSession("")
        setCheckedItems([])
        setErrors({})
      }, 300)
    }
  }

  const toggleChecklistItem = (id: string) => {
    setCheckedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
    if (errors.checklist) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.checklist
        return newErrors
      })
    }
  }

  // Load model detail when selectedModelId changes
  useEffect(() => {
    if (!selectedModelId) {
      setSelectedModelDetail(null)
      setApiChecklists([])
      return
    }
    api.get<ApiResponse<ChecklistModelDetailApi>>(`/v1/checklist-models/${selectedModelId}`)
      .then((response: AxiosResponse<ApiResponse<ChecklistModelDetailApi>>) => {
        let data = response.data;
        if (data.isSuccess) {
          setSelectedModelDetail(data.value)
          setApiChecklists(data.value.criteria)
        }
      })
      .catch((err) => console.error("Failed to fetch model detail:", err))
  }, [selectedModelId])

  const checklistProgress = apiChecklists.length > 0
    ? Math.round((checkedItems.length / apiChecklists.length) * 100)
    : 0

  const riskMetrics = useMemo(() => {
    const entry = Number.parseFloat(formData.entryPrice) || 0
    const sl = Number.parseFloat(formData.stopLoss) || 0
    const tp = Number.parseFloat(formData.targetTier1) || 0

    const riskPerUnit = entry > 0 && sl > 0 ? Math.abs(entry - sl) : 0
    const rewardPerUnit = entry > 0 && tp > 0 ? Math.abs(tp - entry) : 0
    const rrRatio = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0

    const riskPctFromSl = entry > 0 && sl > 0 ? (riskPerUnit / entry) * 100 : 0

    let riskScore = 0
    if (rrRatio >= 2) riskScore += 45
    else if (rrRatio >= 1.5) riskScore += 25
    else if (rrRatio >= 1) riskScore += 10
    if (sl > 0) riskScore += 30
    if (tp > 0 || Number.parseFloat(formData.targetTier1) > 0) riskScore += 25

    return { riskPerUnit, rewardPerUnit, rrRatio, riskPctFromSl, riskScore }
  }, [formData.entryPrice, formData.stopLoss, formData.targetTier1])

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.asset.trim()) {
      newErrors.asset = "Asset name is required"
    }

    if (!formData.entryPrice || Number.parseFloat(formData.entryPrice) <= 0) {
      newErrors.entryPrice = "Valid entry price is required"
    }

    if (!formData.stopLoss || Number.parseFloat(formData.stopLoss) <= 0) {
      newErrors.stopLoss = "Valid stop loss is required"
    }

    if (!formData.date) {
      newErrors.date = "Trade date is required"
    }

    if (!formData.targetTier1 && !formData.targetTier2 && !formData.targetTier3) {
      newErrors.targetTier1 = "At least one target price is required"
    }

    if (checkedItems.length === 0) {
      newErrors.checklist = "Please complete at least one checklist item"
    }

    if (!tradingSession) {
      newErrors.tradingSession = "Trading zone is required"
    }

    if (confidenceLevel === 0) {
      newErrors.confidenceLevel = "Confidence level is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // 1) Submit to Backend API
      const payload = {
        asset: formData.asset.toUpperCase().trim(),
        position: Number(formData.position),
        entryPrice: Number.parseFloat(formData.entryPrice),
        targetTier1: Number.parseFloat(formData.targetTier1) || 0,
        targetTier2: formData.targetTier2 ? Number.parseFloat(formData.targetTier2) : null,
        targetTier3: formData.targetTier3 ? Number.parseFloat(formData.targetTier3) : null,
        stopLoss: Number.parseFloat(formData.stopLoss),
        notes: formData.notes,
        date: new Date(formData.date).toISOString(),
        status: TradeStatus.Open,
        exitPrice: null,
        pnl: null,
        closedDate: null,
        screenshots: screenshots.length > 0 ? screenshots.map((s) => s.url) : null,
        tradeTechnicalAnalysisTags: analysisTags.length > 0 ? analysisTags.map(id => parseInt(id, 10)) : null,
        emotionTags: selectedEmotions.length > 0 ? selectedEmotions.map(id => parseInt(id, 10)) : null,
        confidenceLevel: confidenceLevel > 0 ? confidenceLevel : null,
        tradeHistoryChecklists: checkedItems.length > 0 ? checkedItems.map(id => parseInt(id, 10)) : null,
        tradingZoneId: tradingSession ? parseInt(tradingSession, 10) : null,
        tradingSessionId: activeSession ? Number.parseInt(activeSession.id, 10) : null,
      }

      const res = await api.post<ApiResponse<number>>("/v1/trade-histories", payload);

      if (!res.data.isSuccess) {
        throw new Error("Failed to create trade via API");
      }

      toast({
        title: "Trade Created",
        description: "Your trade has been successfully recorded.",
      });

      // 2) Keep context state updated for UI
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
        screenshots: screenshots.length > 0 ? screenshots : undefined,
        emotionTags: selectedEmotions.length > 0 ? selectedEmotions : undefined,
        confidenceLevel: confidenceLevel > 0 ? confidenceLevel : undefined,
        analysisTags: analysisTags.length > 0 ? analysisTags : undefined,
        tradingSession: tradingSession || undefined,
        pretradeChecklist: checkedItems.length > 0 ? checkedItems : undefined,
      })

      onSuccess?.()
      handleOpenChange(false)
    } catch (error: any) {
      console.error("Error creating trade:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to create trade. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleEmotion = (id: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  const toggleAnalysisTag = (tagId: string) => {
    setAnalysisTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return
      if (file.size > 5 * 1024 * 1024) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (result) {
          setScreenshots((prev) => [...prev, { url: result }])
        }
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ""
  }

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const getRRColorClass = (rrRatio: number) => {
    if (rrRatio >= 2) return "text-emerald-400"
    if (rrRatio >= 1) return "text-amber-400"
    return "text-red-400"
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-11/12 p-0">
        <div className="sticky top-0 z-10 bg-background pt-6 px-6 pb-2 border-b border-border shadow-sm flex items-center justify-between">
          <div>
            <DialogTitle className="text-xl text-foreground">
              Create New Trade
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              Enter the details of your trade below
            </DialogDescription>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Basic Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="asset">Asset Name</Label>
                  <Input
                    id="asset"
                    placeholder="e.g., BTC/USD, AAPL, ETH"
                    value={formData.asset}
                    onChange={(e) => handleInputChange("asset", e.target.value)}
                    className={errors.asset ? "border-destructive" : ""}
                  />
                  {errors.asset && (
                    <p className="text-xs text-destructive">{errors.asset}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position Type</Label>
                  <Select
                    defaultValue={formData.position.toString()}
                    value={formData.position.toString()}
                    onValueChange={(value: string) =>
                      handleInputChange("position", value)
                    }
                  >
                    <SelectTrigger>
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
                    onChange={(e) =>
                      handleInputChange("entryPrice", e.target.value)
                    }
                    className={errors.entryPrice ? "border-destructive" : ""}
                  />
                  {errors.entryPrice && (
                    <p className="text-xs text-destructive">
                      {errors.entryPrice}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Trade Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    className={errors.date ? "border-destructive" : ""}
                  />
                  {errors.date && (
                    <p className="text-xs text-destructive">{errors.date}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Targets */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Target className="h-4 w-4 text-success" />
                Target Prices
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="targetTier1">Tier 1 Target</Label>
                  <Input
                    id="targetTier1"
                    type="number"
                    step="0.01"
                    placeholder="Conservative"
                    value={formData.targetTier1}
                    onChange={(e) =>
                      handleInputChange("targetTier1", e.target.value)
                    }
                    className={errors.targetTier1 ? "border-destructive" : ""}
                  />
                  {errors.targetTier1 && (
                    <p className="text-xs text-destructive">
                      {errors.targetTier1}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetTier2">Tier 2 Target</Label>
                  <Input
                    id="targetTier2"
                    type="number"
                    step="0.01"
                    placeholder="Moderate"
                    value={formData.targetTier2}
                    onChange={(e) =>
                      handleInputChange("targetTier2", e.target.value)
                    }
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
                    onChange={(e) =>
                      handleInputChange("targetTier3", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Risk Management & Guardrails */}
            <div className="space-y-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="h-4 w-4 text-destructive" />
                Risk Management & Guardrails
              </h3>

              {/* Risk Score Gauge */}
              {(formData.entryPrice || formData.stopLoss) && (
                <div className="rounded-lg border border-border bg-secondary/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Gauge className="h-3.5 w-3.5" />
                      Risk Assessment Score
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        riskMetrics.riskScore >= 75
                          ? "text-emerald-400"
                          : riskMetrics.riskScore >= 50
                            ? "text-amber-400"
                            : riskMetrics.riskScore >= 25
                              ? "text-orange-400"
                              : "text-red-400"
                      }`}
                    >
                      {riskMetrics.riskScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        riskMetrics.riskScore >= 75
                          ? "bg-emerald-500"
                          : riskMetrics.riskScore >= 50
                            ? "bg-amber-400"
                            : riskMetrics.riskScore >= 25
                              ? "bg-orange-400"
                              : "bg-red-500"
                      }`}
                      style={{ width: `${riskMetrics.riskScore}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {riskMetrics.riskScore >= 75
                      ? "Excellent risk profile. This trade follows best practices."
                      : riskMetrics.riskScore >= 50
                        ? "Decent setup. Consider improving R:R or tightening risk."
                        : riskMetrics.riskScore >= 25
                          ? "Below average. Review stop loss and position sizing."
                          : "High risk. Set stop loss and targets before proceeding."}
                  </p>
                </div>
              )}

              {/* Core Risk Inputs */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stopLoss">Stop Loss Price</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.stopLoss}
                    onChange={(e) =>
                      handleInputChange("stopLoss", e.target.value)
                    }
                    className={errors.stopLoss ? "border-destructive" : ""}
                  />
                  {errors.stopLoss && (
                    <p className="text-xs text-destructive">
                      {errors.stopLoss}
                    </p>
                  )}
                  {riskMetrics.riskPctFromSl > 0 && (
                    <p
                      className={`text-[10px] ${riskMetrics.riskPctFromSl > 5 ? "text-red-400" : "text-muted-foreground"}`}
                    >
                      {riskMetrics.riskPctFromSl.toFixed(1)}% from entry
                      {riskMetrics.riskPctFromSl > 5 && " -- wide stop"}
                    </p>
                  )}
                </div>
              </div>

              {/* R:R Visual */}
              {riskMetrics.rrRatio > 0 && (
                <div className="rounded-lg border border-border bg-secondary/10 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Risk : Reward Ratio
                    </span>
                    <span
                      className={`text-sm font-bold ${getRRColorClass(riskMetrics.rrRatio)}`}
                    >
                      1 : {riskMetrics.rrRatio.toFixed(2)}
                    </span>
                  </div>
                  {/* Visual R:R bar */}
                  <div className="flex h-3 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full bg-red-500/50 border-r border-background"
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
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-red-400">
                      Risk: ${riskMetrics.riskPerUnit.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-400">
                      Reward: ${riskMetrics.rewardPerUnit.toFixed(2)}
                    </span>
                  </div>
                  {riskMetrics.rrRatio < 1.5 && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      R:R below 1.5 -- consider adjusting stop or target levels
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pre-trade Checklist (Model-based) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ClipboardCheck className="h-4 w-4 text-amber-400" />
                  Pre-trade Checklist
                </h3>
                <div className="flex items-center gap-2">
                  {selectedModelDetail && (
                    <>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            checklistProgress === 100
                              ? "bg-emerald-500"
                              : checklistProgress >= 50
                                ? "bg-amber-400"
                                : "bg-red-400"
                          }`}
                          style={{ width: `${checklistProgress}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          checklistProgress === 100
                            ? "text-emerald-400"
                            : checklistProgress >= 50
                              ? "text-amber-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {checkedItems.length}/{apiChecklists.length}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Model Selector */}
              <div className="space-y-2">
                <Label>Checklist Model</Label>
                <Select
                  value={selectedModelId}
                  onValueChange={(value: string) => {
                    setSelectedModelId(value)
                    setCheckedItems([])
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a checklist model" />
                  </SelectTrigger>
                  <SelectContent>
                    {checklistModels.map((model) => (
                      <SelectItem key={model.id} value={model.id.toString()}>
                        <span className="flex items-center gap-2">
                          {model.name}
                          <span className="text-[10px] text-muted-foreground">({model.criteriaCount} criteria)</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedModelDetail?.description && (
                  <p className="text-[10px] text-muted-foreground">{selectedModelDetail.description}</p>
                )}
              </div>

              {checklistProgress < 100 && checkedItems.length > 0 && (
                <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 border border-amber-500/20">
                  <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span className="text-xs text-amber-400">
                    {apiChecklists.length - checkedItems.length} item
                    {apiChecklists.length - checkedItems.length !== 1
                      ? "s"
                      : ""}{" "}
                    remaining. Complete your checklist before trading.
                  </span>
                </div>
              )}
              {errors.checklist && (
                <p className="text-xs text-destructive">{errors.checklist}</p>
              )}

              {selectedModelDetail && [1, 2, 3, 4].map((typeId) => {
                const items = apiChecklists.filter(
                  (item) => item.checkListType === typeId,
                );
                
                if (items.length === 0) return null;

                return (
                  <div key={typeId} className="space-y-2">
                    <span
                      className={`text-xs font-medium ${categoryColor[typeId]}`}
                    >
                      {categoryLabel[typeId]}
                    </span>
                    <div className="space-y-1">
                      {items.map((item) => {
                        const isChecked = checkedItems.includes(item.id.toString());
                        return (
                          <label
                            key={item.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-all ${
                              isChecked
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-border bg-secondary/20 hover:bg-secondary/40"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() =>
                                toggleChecklistItem(item.id.toString())
                              }
                              className="shrink-0"
                            />
                            <span
                              className={`text-sm transition-colors ${
                                isChecked
                                  ? "text-emerald-400"
                                  : "text-foreground"
                              }`}
                            >
                              {item.name}
                            </span>
                            {isChecked && (
                              <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {!selectedModelId && (
                <p className="text-xs text-muted-foreground text-center py-4">Select a checklist model above to see criteria.</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">
                Trade Notes
              </h3>
              <Textarea
                placeholder="Add any notes about your trade rationale, market conditions, or setup..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={4}
              />
            </div>

            {/* Technical Analysis Tags */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Tags className="h-4 w-4 text-primary" />
                Technical Analysis Tags
              </h3>
              <p className="text-xs text-muted-foreground">
                Tag the technical analysis methods used for this trade setup.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {apiTechTags.map((tag) => {
                  const isSelected = analysisTags.includes(tag.id.toString());
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleAnalysisTag(tag.id.toString())}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-primary/20 text-primary border-primary/40 ring-1 ring-primary/30"
                          : "bg-secondary/50 text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      }`}
                      title={tag.description}
                    >
                      {tag.name} {tag.shortName && `(${tag.shortName})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trading Session */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-amber-400" />
                Trading Zone
              </h3>
              <p className="text-xs text-muted-foreground">
                Select the market session or killzone when this trade was taken.
              </p>
              {errors.tradingSession && (
                <p className="text-xs text-destructive">{errors.tradingSession}</p>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {apiTradingZones.map((zone) => {
                  const isSelected = tradingSession === zone.id.toString();
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => {
                        setTradingSession(isSelected ? "" : zone.id.toString())
                        if (errors.tradingSession) {
                          setErrors((prev) => {
                            const newErrors = { ...prev }
                            delete newErrors.tradingSession
                            return newErrors
                          })
                        }
                      }}
                      className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-all ${
                        errors.tradingSession && !isSelected ? "border-destructive/50 " : ""
                      }${
                        isSelected
                          ? "border-amber-500/40 bg-amber-500/15 ring-1 ring-amber-500/30"
                          : "border-border bg-secondary/30 hover:border-amber-500/30 hover:bg-amber-500/5"
                      }`}
                      title={zone.description || undefined}
                    >
                      <span
                        className={`text-xs font-medium ${
                          isSelected ? "text-amber-400" : "text-foreground"
                        }`}
                      >
                        {zone.name}
                      </span>
                      <span
                        className={`mt-0.5 text-[10px] leading-tight ${
                          isSelected
                            ? "text-amber-400/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {zone.fromTime} - {zone.toTime}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trading Psychology */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Brain className="h-4 w-4 text-accent" />
                Trading Psychology
              </h3>
              <p className="text-xs text-muted-foreground">
                Track your emotional state to identify patterns in your trading
                behavior.
              </p>

              {/* Emotion Tags */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">
                  How are you feeling about this trade?
                </Label>
                {(["positive", "negative", "neutral"] as const).map(
                  (category) => (
                    <div key={category} className="space-y-1.5">
                      <span className="text-xs font-medium capitalize text-muted-foreground">
                        {category}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {apiTags.filter(
                          (t) => getTagCategory(t.name) === category,
                        ).map((tag) => {
                          const isSelected = selectedEmotions.includes(tag.id.toString());
                          const colorMap = {
                            positive: isSelected
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30"
                              : "bg-secondary/50 text-muted-foreground border-border hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30",
                            negative: isSelected
                              ? "bg-red-500/20 text-red-400 border-red-500/40 ring-1 ring-red-500/30"
                              : "bg-secondary/50 text-muted-foreground border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30",
                            neutral: isSelected
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30"
                              : "bg-secondary/50 text-muted-foreground border-border hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30",
                          };
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleEmotion(tag.id.toString())}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${colorMap[category]}`}
                            >
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>

              {/* Confidence Level */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Confidence Level
                </Label>
                {errors.confidenceLevel && (
                  <p className="text-xs text-destructive">{errors.confidenceLevel}</p>
                )}
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        setConfidenceLevel(
                          level === confidenceLevel ? 0 : level,
                        )
                        if (errors.confidenceLevel) {
                          setErrors((prev) => {
                            const newErrors = { ...prev }
                            delete newErrors.confidenceLevel
                            return newErrors
                          })
                        }
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition-all ${
                        errors.confidenceLevel && confidenceLevel < level && confidenceLevel === 0 ? "border-destructive/50 " : ""
                      }${
                        confidenceLevel >= level
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                      }`}
                      aria-label={`Confidence level ${level}`}
                    >
                      {level}
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {confidenceLevel === 0 && "Not set"}
                    {confidenceLevel === 1 && "Very Low"}
                    {confidenceLevel === 2 && "Low"}
                    {confidenceLevel === 3 && "Neutral"}
                    {confidenceLevel === 4 && "High"}
                    {confidenceLevel === 5 && "Very High"}
                  </span>
                </div>
              </div>
            </div>

            {/* Screenshots */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ImagePlus className="h-4 w-4 text-primary" />
                Screenshots
              </h3>
              <p className="text-xs text-muted-foreground">
                Upload chart screenshots or trade setup images (max 5MB each)
              </p>

              {/* Upload Area */}
              <label
                htmlFor="screenshot-upload"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-secondary/30"
              >
                <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Click to upload screenshots
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG, or WebP
                </span>
                <input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleScreenshotUpload}
                />
              </label>

              {/* Preview Grid */}
              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {screenshots.map((src, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-lg border border-border"
                    >
                      <img
                        src={src.url}
                        alt={`Screenshot ${index + 1}`}
                        className="aspect-video w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-background/80 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                        aria-label={`Remove screenshot ${index + 1}`}
                      >
                        <X className="h-3.5 w-3.5 text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-2 border-t border-border mt-6">
              <div className="mt-4 flex w-full gap-3">
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Creating..." : "Create Trade"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

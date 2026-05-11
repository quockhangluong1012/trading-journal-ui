"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  FileText,
  Loader2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { api, ApiResponse } from "@/lib/api"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"
import { TRADE_PRICE_INPUT_STEP } from "@/lib/trade-price-format"
import { type TradeTemplateDto, getTemplates } from "@/lib/template-api"
import { TradingZoneApi } from "@/components/create-trade-page"

interface QuickTradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefillTemplate?: TradeTemplateDto | null
}

export function QuickTradeModal({ open, onOpenChange, prefillTemplate }: QuickTradeModalProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Form state
  const [asset, setAsset] = useState("")
  const [position, setPosition] = useState<string>("0")
  const [entryPrice, setEntryPrice] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [targetTier1, setTargetTier1] = useState("")
  const [tradingZoneId, setTradingZoneId] = useState("")
  const [confidenceLevel, setConfidenceLevel] = useState("")

  // Data
  const [templates, setTemplates] = useState<TradeTemplateDto[]>([])
  const [zones, setZones] = useState<TradingZoneApi[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")

  // Load reference data
  useEffect(() => {
    if (!open) return
    let active = true
    const loadData = async () => {
      setIsLoading(true)
      const [tplRes, zoneRes] = await Promise.allSettled([
        getTemplates(),
        api.get<ApiResponse<TradingZoneApi[]>>("/v1/trading-zones"),
      ])
      if (!active) return
      if (tplRes.status === "fulfilled" && tplRes.value.data.isSuccess) {
        setTemplates(tplRes.value.data.value)
      }
      if (zoneRes.status === "fulfilled" && zoneRes.value.data.isSuccess) {
        setZones(zoneRes.value.data.value)
      }
      setIsLoading(false)
    }
    void loadData()
    return () => { active = false }
  }, [open])

  // Apply prefilled template
  useEffect(() => {
    if (open && prefillTemplate) {
      applyTemplate(prefillTemplate)
      setSelectedTemplateId(String(prefillTemplate.id))
    }
  }, [open, prefillTemplate])

  const applyTemplate = (tpl: TradeTemplateDto) => {
    if (tpl.asset) setAsset(tpl.asset)
    if (tpl.position != null) setPosition(String(tpl.position))
    if (tpl.defaultStopLoss != null) setStopLoss(String(tpl.defaultStopLoss))
    if (tpl.defaultTargetTier1 != null) setTargetTier1(String(tpl.defaultTargetTier1))
    if (tpl.tradingZoneId != null) setTradingZoneId(String(tpl.tradingZoneId))
    if (tpl.defaultConfidenceLevel != null) setConfidenceLevel(String(tpl.defaultConfidenceLevel))
  }

  const resetForm = () => {
    setAsset("")
    setPosition("0")
    setEntryPrice("")
    setStopLoss("")
    setTargetTier1("")
    setTradingZoneId("")
    setConfidenceLevel("")
    setSelectedTemplateId("")
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tpl = templates.find((t) => t.id === Number(templateId))
    if (tpl) {
      applyTemplate(tpl)
    }
  }

  const handleClose = (v: boolean) => {
    if (!v) resetForm()
    onOpenChange(v)
  }

  const handleSubmit = async () => {
    // Validate
    if (!asset.trim()) {
      toast({ variant: "destructive", title: "Asset required", description: "Enter the trading asset." })
      return
    }
    const entry = Number.parseFloat(entryPrice)
    if (!Number.isFinite(entry) || entry <= 0) {
      toast({ variant: "destructive", title: "Entry price required", description: "Enter a valid entry price." })
      return
    }
    const sl = Number.parseFloat(stopLoss)
    if (!Number.isFinite(sl) || sl <= 0) {
      toast({ variant: "destructive", title: "Stop loss required", description: "Enter a valid stop loss." })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        asset: asset.toUpperCase().trim(),
        position: Number(position),
        entryPrice: entry,
        targetTier1: Number.parseFloat(targetTier1) || 0,
        targetTier2: null,
        targetTier3: null,
        stopLoss: sl,
        notes: "",
        date: new Date().toISOString(),
        status: TradeStatus.Open,
        exitPrice: null,
        pnl: null,
        closedDate: null,
        screenshots: null,
        tradeTechnicalAnalysisTags: null,
        emotionTags: null,
        confidenceLevel: Number.parseInt(confidenceLevel, 10) || null,
        tradeHistoryChecklists: null,
        tradingZoneId: Number.parseInt(tradingZoneId, 10) || null,
        tradingSessionId: null,
        riskGuardrail: null,
      }

      const response = await api.post<ApiResponse<number>>("/v1/trade-histories", payload)
      if (!response.data.isSuccess) throw new Error("API error")

      toast({ title: "Trade created!", description: `${asset.toUpperCase()} trade opened successfully.` })
      handleClose(false)
      router.push("/history")
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not create the trade. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFullForm = () => {
    // Navigate to full form, passing template data via query
    const params = new URLSearchParams()
    if (selectedTemplateId) params.set("templateId", selectedTemplateId)
    if (asset) params.set("asset", asset)
    if (position) params.set("position", position)
    if (entryPrice) params.set("entry", entryPrice)
    if (stopLoss) params.set("sl", stopLoss)
    if (targetTier1) params.set("t1", targetTier1)
    if (tradingZoneId) params.set("zone", tradingZoneId)
    if (confidenceLevel) params.set("confidence", confidenceLevel)
    handleClose(false)
    router.push(`/trade/new${params.toString() ? `?${params.toString()}` : ""}`)
  }

  // Compute R:R
  const entry = Number.parseFloat(entryPrice) || 0
  const sl = Number.parseFloat(stopLoss) || 0
  const t1 = Number.parseFloat(targetTier1) || 0
  const risk = entry > 0 && sl > 0 ? Math.abs(entry - sl) : 0
  const reward = entry > 0 && t1 > 0 ? Math.abs(t1 - entry) : 0
  const rrRatio = risk > 0 ? reward / risk : 0

  const favoriteTemplates = templates.filter((t) => t.isFavorite)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            Quick Trade Entry
          </DialogTitle>
          <DialogDescription>
            Minimal form for fast trade creation. Use a template to pre-fill fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Template selector */}
          {isLoading ? (
            <Skeleton className="h-10 w-full rounded-lg" />
          ) : templates.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Template</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger id="quick-trade-template" className="h-10">
                  <SelectValue placeholder="Select a template to pre-fill..." />
                </SelectTrigger>
                <SelectContent>
                  {favoriteTemplates.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Favorites
                      </div>
                      {favoriteTemplates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          ⭐ {t.name} {t.asset ? `· ${t.asset}` : ""}
                        </SelectItem>
                      ))}
                      <div className="my-1 border-t border-border/50" />
                    </>
                  )}
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    All Templates
                  </div>
                  {templates.filter((t) => !t.isFavorite).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} {t.asset ? `· ${t.asset}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* Core fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Asset *</Label>
              <Input
                id="quick-trade-asset"
                placeholder="EURUSD, BTCUSD..."
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="font-semibold uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={position === "0" ? "default" : "outline"}
                  size="sm"
                  className={cn("gap-1.5", position === "0" && "bg-emerald-600 hover:bg-emerald-700")}
                  onClick={() => setPosition("0")}
                >
                  <TrendingUp className="h-3.5 w-3.5" /> Long
                </Button>
                <Button
                  type="button"
                  variant={position === "1" ? "default" : "outline"}
                  size="sm"
                  className={cn("gap-1.5", position === "1" && "bg-red-600 hover:bg-red-700")}
                  onClick={() => setPosition("1")}
                >
                  <TrendingDown className="h-3.5 w-3.5" /> Short
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Entry Price *</Label>
              <Input
                id="quick-trade-entry"
                type="number"
                step={TRADE_PRICE_INPUT_STEP}
                placeholder="0.00000"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Stop Loss *</Label>
              <Input
                id="quick-trade-sl"
                type="number"
                step={TRADE_PRICE_INPUT_STEP}
                placeholder="0.00000"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Target T1</Label>
              <Input
                id="quick-trade-t1"
                type="number"
                step={TRADE_PRICE_INPUT_STEP}
                placeholder="0.00000"
                value={targetTier1}
                onChange={(e) => setTargetTier1(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Trading Zone</Label>
              <Select value={tradingZoneId} onValueChange={setTradingZoneId}>
                <SelectTrigger id="quick-trade-zone">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Confidence</Label>
              <Select value={confidenceLevel} onValueChange={setConfidenceLevel}>
                <SelectTrigger id="quick-trade-confidence">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Very Low</SelectItem>
                  <SelectItem value="2">Low</SelectItem>
                  <SelectItem value="3">Neutral</SelectItem>
                  <SelectItem value="4">High</SelectItem>
                  <SelectItem value="5">Very High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live R:R indicator */}
          {rrRatio > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/30 px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">Risk : Reward</span>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full text-sm font-bold",
                  rrRatio >= 2
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : rrRatio >= 1
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                      : "border-red-500/30 bg-red-500/10 text-red-500",
                )}
              >
                1 : {rrRatio.toFixed(2)}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            onClick={handleFullForm}
            className="gap-2 text-muted-foreground"
          >
            <FileText className="h-4 w-4" />
            Full Form
            <ArrowRight className="h-3 w-3" />
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Create Trade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

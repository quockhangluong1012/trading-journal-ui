"use client"

import { useCallback, useEffect, useState } from "react"
import {
  BookOpen, Check, Clock, Crosshair, Edit3, Loader2, Save, Shield, Target, TrendingUp, Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  fetchPlaybookDetail, updatePlaybookRules,
  SETUP_STATUS_LABELS, GRADE_COLORS,
  type PlaybookDetail, type PlaybookRulesPayload, type PlaybookSetupCard,
} from "@/lib/playbook-api"

interface PlaybookDetailViewProps {
  setupId: number
  performance: PlaybookSetupCard | null
  onClose: () => void
  onSaved: () => void
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v)

const POSITIVE_TEXT_CLASS = "text-success"
const WARNING_TEXT_CLASS = "text-warning"
const NEGATIVE_TEXT_CLASS = "text-destructive"

function RulesSection({ title, icon: Icon, content, isEditing, editValue, onEditChange }: {
  title: string; icon: React.ElementType; content: string | null; isEditing: boolean; editValue: string; onEditChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      {isEditing ? (
        <textarea
          className="w-full rounded-xl border border-border/70 bg-secondary/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y min-h-[80px]"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          placeholder={`Add your ${title.toLowerCase()} here...`}
        />
      ) : (
        <div className="rounded-xl border border-border/50 bg-secondary/10 px-4 py-3">
          {content ? (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{content}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground/60">Not defined yet — click edit to add.</p>
          )}
        </div>
      )}
    </div>
  )
}

function ParamField({ label, value, isEditing, editValue, onEditChange, type = "text", placeholder }: {
  label: string; value: string | null; isEditing: boolean; editValue: string; onEditChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {isEditing ? (
        <input
          type={type}
          className="w-full rounded-lg border border-border/70 bg-secondary/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          placeholder={placeholder}
          step={type === "number" ? "0.01" : undefined}
        />
      ) : (
        <div className="rounded-lg border border-border/50 bg-secondary/10 px-3 py-2">
          <span className="text-sm text-foreground/90">{value || "—"}</span>
        </div>
      )}
    </div>
  )
}

export function PlaybookDetailView({ setupId, performance, onClose, onSaved }: PlaybookDetailViewProps) {
  const [detail, setDetail] = useState<PlaybookDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Edit state
  const [entryRules, setEntryRules] = useState("")
  const [exitRules, setExitRules] = useState("")
  const [conditions, setConditions] = useState("")
  const [riskPerTrade, setRiskPerTrade] = useState("")
  const [targetRR, setTargetRR] = useState("")
  const [timeframes, setTimeframes] = useState("")
  const [assets, setAssets] = useState("")

  const loadDetail = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchPlaybookDetail(setupId)
      setDetail(data)
      setEntryRules(data.entryRules ?? "")
      setExitRules(data.exitRules ?? "")
      setConditions(data.idealMarketConditions ?? "")
      setRiskPerTrade(data.riskPerTrade?.toString() ?? "")
      setTargetRR(data.targetRiskReward?.toString() ?? "")
      setTimeframes(data.preferredTimeframes ?? "")
      setAssets(data.preferredAssets ?? "")
    } catch (err) {
      console.error("Failed to load playbook detail:", err)
    } finally {
      setIsLoading(false)
    }
  }, [setupId])

  useEffect(() => { void loadDetail() }, [loadDetail])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload: PlaybookRulesPayload = {
        entryRules: entryRules.trim() || null,
        exitRules: exitRules.trim() || null,
        idealMarketConditions: conditions.trim() || null,
        riskPerTrade: riskPerTrade ? parseFloat(riskPerTrade) : null,
        targetRiskReward: targetRR ? parseFloat(targetRR) : null,
        preferredTimeframes: timeframes.trim() || null,
        preferredAssets: assets.trim() || null,
      }
      await updatePlaybookRules(setupId, payload)
      setIsEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      await loadDetail()
      onSaved()
    } catch (err) {
      console.error("Failed to save playbook rules:", err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!detail) return null

  const isRetired = detail.status === 4
  const gradeColors = performance ? (GRADE_COLORS[performance.grade] || GRADE_COLORS["N/A"]) : GRADE_COLORS["N/A"]

  return (
    <div className="space-y-5">
      {/* Header with status + grade */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(
            "text-xs",
            isRetired ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"
          )}>
            {SETUP_STATUS_LABELS[detail.status] ?? "Unknown"}
          </Badge>
          {performance && (
            <span className={cn("inline-flex items-center rounded-lg border px-2.5 py-1 text-sm font-bold", gradeColors)}>
              Grade: {performance.grade}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="animate-in fade-in flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" />Saved
            </span>
          )}
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="rounded-xl">Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="rounded-xl">
                {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-xl">
              <Edit3 className="mr-1.5 h-3.5 w-3.5" />Edit rules
            </Button>
          )}
        </div>
      </div>

      {/* Performance summary bar */}
      {performance && performance.totalTrades > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Win Rate</p>
            <p className={cn("mt-1 text-lg font-bold", performance.winRate >= 55 ? POSITIVE_TEXT_CLASS : performance.winRate >= 45 ? WARNING_TEXT_CLASS : NEGATIVE_TEXT_CLASS)}>
              {performance.winRate.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total P&L</p>
            <p className={cn("mt-1 text-lg font-bold", performance.totalPnl >= 0 ? POSITIVE_TEXT_CLASS : NEGATIVE_TEXT_CLASS)}>
              {fmt(performance.totalPnl)}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Profit Factor</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {performance.profitFactor >= 1e15 ? "∞" : performance.profitFactor.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-secondary/15 p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Expectancy</p>
            <p className={cn("mt-1 text-lg font-bold", performance.expectancy > 0 ? POSITIVE_TEXT_CLASS : NEGATIVE_TEXT_CLASS)}>
              {fmt(performance.expectancy)}
            </p>
          </div>
        </div>
      )}

      <Separator className="bg-border/50" />

      {/* Playbook rules */}
      <div className="space-y-4">
        <RulesSection title="Entry Rules" icon={TrendingUp} content={detail.entryRules} isEditing={isEditing} editValue={entryRules} onEditChange={setEntryRules} />
        <RulesSection title="Exit Rules" icon={Target} content={detail.exitRules} isEditing={isEditing} editValue={exitRules} onEditChange={setExitRules} />
        <RulesSection title="Ideal Market Conditions" icon={Zap} content={detail.idealMarketConditions} isEditing={isEditing} editValue={conditions} onEditChange={setConditions} />
      </div>

      <Separator className="bg-border/50" />

      {/* Parameters */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Shield className="h-4 w-4 text-primary" />Risk & Preferences
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <ParamField label="Risk per Trade (%)" value={detail.riskPerTrade ? `${detail.riskPerTrade}%` : null} isEditing={isEditing} editValue={riskPerTrade} onEditChange={setRiskPerTrade} type="number" placeholder="e.g., 1.0" />
          <ParamField label="Target R:R" value={detail.targetRiskReward ? `${detail.targetRiskReward}:1` : null} isEditing={isEditing} editValue={targetRR} onEditChange={setTargetRR} type="number" placeholder="e.g., 2.5" />
          <ParamField label="Preferred Timeframes" value={detail.preferredTimeframes} isEditing={isEditing} editValue={timeframes} onEditChange={setTimeframes} placeholder="e.g., 15m, 1H, 4H" />
          <ParamField label="Preferred Assets" value={detail.preferredAssets} isEditing={isEditing} editValue={assets} onEditChange={setAssets} placeholder="e.g., EUR/USD, XAU/USD" />
        </div>
      </div>

      {/* Retirement info */}
      {isRetired && detail.retiredReason && (
        <>
          <Separator className="bg-border/50" />
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <h4 className="text-sm font-semibold text-destructive">Retirement Reason</h4>
            <p className="mt-1 text-sm text-foreground/80">{detail.retiredReason}</p>
            {detail.retiredDate && (
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Retired on {new Date(detail.retiredDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

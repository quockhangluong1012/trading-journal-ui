"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Minus, Layers, TrendingUp, TrendingDown, Shield, Zap } from "lucide-react"

// ── Enums matching backend ──

export enum PowerOf3Phase {
  Accumulation = 0,
  Manipulation = 1,
  Distribution = 2,
}

export enum DailyBias {
  Bullish = 0,
  Bearish = 1,
  Neutral = 2,
}

export enum MarketStructure {
  BOS = 0,
  CHoCH = 1,
  HH = 2,
  HL = 3,
  LH = 4,
  LL = 5,
}

export enum PremiumDiscount {
  Premium = 0,
  Discount = 1,
  Equilibrium = 2,
}

// ── Labels & Icons ──

const PO3_OPTIONS = [
  { value: PowerOf3Phase.Accumulation, label: "Accumulation", desc: "Price consolidating / building cause", icon: "🔄" },
  { value: PowerOf3Phase.Manipulation, label: "Manipulation", desc: "Liquidity sweep / stop hunt phase", icon: "🎯" },
  { value: PowerOf3Phase.Distribution, label: "Distribution", desc: "Expansion / trend continuation", icon: "🚀" },
]

const BIAS_OPTIONS = [
  { value: DailyBias.Bullish, label: "Bullish", icon: ArrowUpRight, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { value: DailyBias.Bearish, label: "Bearish", icon: ArrowDownRight, color: "text-red-400 border-red-500/30 bg-red-500/10" },
  { value: DailyBias.Neutral, label: "Neutral", icon: Minus, color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
]

const STRUCTURE_OPTIONS = [
  { value: MarketStructure.BOS, label: "BOS", desc: "Break of Structure" },
  { value: MarketStructure.CHoCH, label: "CHoCH", desc: "Change of Character" },
  { value: MarketStructure.HH, label: "HH", desc: "Higher High" },
  { value: MarketStructure.HL, label: "HL", desc: "Higher Low" },
  { value: MarketStructure.LH, label: "LH", desc: "Lower High" },
  { value: MarketStructure.LL, label: "LL", desc: "Lower Low" },
]

const PD_OPTIONS = [
  { value: PremiumDiscount.Premium, label: "Premium", desc: "Above 50% of dealing range", color: "text-red-400" },
  { value: PremiumDiscount.Discount, label: "Discount", desc: "Below 50% of dealing range", color: "text-emerald-400" },
  { value: PremiumDiscount.Equilibrium, label: "Equilibrium", desc: "At 50% of dealing range", color: "text-amber-400" },
]

// ── ICT Pre-Trade Checklist ──

const ICT_CHECKLIST_ITEMS = [
  { id: "htf-bias", label: "Higher-timeframe bias identified", category: "Bias" },
  { id: "killzone", label: "Trading within an active killzone", category: "Timing" },
  { id: "structure", label: "Market structure confirms direction", category: "Structure" },
  { id: "pd-zone", label: "Entry in correct Premium/Discount zone", category: "PD Array" },
  { id: "liquidity", label: "Liquidity target identified (BSL/SSL)", category: "Liquidity" },
  { id: "pd-array", label: "PD array present (OB, FVG, or BB)", category: "PD Array" },
  { id: "displacement", label: "Displacement leg observed", category: "Confirmation" },
  { id: "rr-minimum", label: "Minimum 2:1 R:R achieved", category: "Risk" },
]

interface IctChecklistProps {
  checkedItems: string[]
  onToggle: (id: string) => void
}

export function IctPreTradeChecklist({ checkedItems, onToggle }: IctChecklistProps) {
  const progress = ICT_CHECKLIST_ITEMS.length > 0
    ? Math.round((checkedItems.length / ICT_CHECKLIST_ITEMS.length) * 100)
    : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-semibold text-foreground">ICT Pre-Trade Checklist</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            progress >= 75 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
            progress >= 50 ? "border-amber-500/30 bg-amber-500/10 text-amber-400" :
            "border-red-500/30 bg-red-500/10 text-red-400"
          )}
        >
          {checkedItems.length}/{ICT_CHECKLIST_ITEMS.length} ({progress}%)
        </Badge>
      </div>

      <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary/40">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            progress >= 75 ? "bg-emerald-500" : progress >= 50 ? "bg-amber-400" : "bg-red-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid gap-1.5">
        {ICT_CHECKLIST_ITEMS.map((item) => (
          <label
            key={item.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all",
              checkedItems.includes(item.id)
                ? "border-primary/30 bg-primary/5"
                : "border-border/50 bg-background/30 hover:border-border"
            )}
          >
            <Checkbox
              checked={checkedItems.includes(item.id)}
              onCheckedChange={() => onToggle(item.id)}
              className="h-4 w-4"
            />
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-xs font-medium",
                checkedItems.includes(item.id) ? "text-foreground" : "text-muted-foreground"
              )}>
                {item.label}
              </p>
            </div>
            <Badge variant="outline" className="text-[9px] shrink-0 border-border/50">
              {item.category}
            </Badge>
          </label>
        ))}
      </div>
    </div>
  )
}

// ── ICT Context Fields ──

interface IctContextFieldsProps {
  powerOf3Phase: number | null
  dailyBias: number | null
  marketStructure: number | null
  premiumDiscount: number | null
  onPowerOf3Change: (value: number | null) => void
  onDailyBiasChange: (value: number | null) => void
  onMarketStructureChange: (value: number | null) => void
  onPremiumDiscountChange: (value: number | null) => void
}

export function IctContextFields({
  powerOf3Phase,
  dailyBias,
  marketStructure,
  premiumDiscount,
  onPowerOf3Change,
  onDailyBiasChange,
  onMarketStructureChange,
  onPremiumDiscountChange,
}: IctContextFieldsProps) {
  const fieldClass = "border-white/10 bg-background/50 backdrop-blur-sm shadow-inner transition-all hover:border-primary/40 focus:ring-2 focus:ring-primary/20"

  return (
    <div className="space-y-5">
      {/* Daily Bias — toggle buttons */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Daily Bias</Label>
        <div className="flex gap-2">
          {BIAS_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isSelected = dailyBias === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDailyBiasChange(isSelected ? null : opt.value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all",
                  isSelected ? opt.color : "border-border/50 bg-background/30 text-muted-foreground hover:border-border"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Power of 3 Phase */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Power of 3 (AMD) Phase</Label>
        <Select
          value={powerOf3Phase !== null ? powerOf3Phase.toString() : ""}
          onValueChange={(v) => onPowerOf3Change(v ? parseInt(v) : null)}
        >
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Select AMD phase" />
          </SelectTrigger>
          <SelectContent>
            {PO3_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                <span className="flex items-center gap-2">
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground">— {opt.desc}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Market Structure */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Market Structure</Label>
          <Select
            value={marketStructure !== null ? marketStructure.toString() : ""}
            onValueChange={(v) => onMarketStructureChange(v ? parseInt(v) : null)}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="Select structure" />
            </SelectTrigger>
            <SelectContent>
              {STRUCTURE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">{opt.label}</Badge>
                    <span className="text-xs">{opt.desc}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Premium/Discount */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Premium / Discount</Label>
          <Select
            value={premiumDiscount !== null ? premiumDiscount.toString() : ""}
            onValueChange={(v) => onPremiumDiscountChange(v ? parseInt(v) : null)}
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="Select PD zone" />
            </SelectTrigger>
            <SelectContent>
              {PD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  <span className="flex items-center gap-2">
                    <span className={cn("text-xs font-semibold", opt.color)}>{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">— {opt.desc}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

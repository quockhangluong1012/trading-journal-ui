import React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, Target, TrendingDown, TrendingUp } from "lucide-react"
import { PositionType } from "@/lib/enum/PositionType"
import type { TradeFormData } from "@/lib/create-trade-form"
import { TradeFormSection } from "./trade-form-section"

export interface TradeSetupSectionProps {
  formData: TradeFormData
  errors: Record<string, string>
  handleInputChange: (field: keyof Omit<TradeFormData, "position">, value: string) => void
  handlePositionChange: (value: string) => void
  surfaceFieldClassName: string
}

export function TradeSetupSection({
  formData,
  errors,
  handleInputChange,
  handlePositionChange,
  surfaceFieldClassName,
}: TradeSetupSectionProps) {
  return (
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
  )
}

import React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Gauge, Shield } from "lucide-react"
import type { TradeFormData } from "@/lib/create-trade-form"
import { TRADE_PRICE_INPUT_STEP } from "@/lib/trade-price-format"
import { TradeFormSection } from "./trade-form-section"
import { TradeSummaryStat } from "./trade-summary-stat"

export interface RiskManagementSectionProps {
  formData: TradeFormData
  errors: Record<string, string>
  handleInputChange: (field: keyof Omit<TradeFormData, "position">, value: string) => void
  surfaceFieldClassName: string
  riskMetrics: {
    riskScore: number
    riskPctFromSl: number
    riskPerUnit: number
    rewardPerUnit: number
    rrRatio: number
  }
  riskTone: { barClassName: string; pillClassName: string; textClassName: string }
  getRRColorClass: (rrRatio: number) => string
}

export function RiskManagementSection({
  formData,
  errors,
  handleInputChange,
  surfaceFieldClassName,
  riskMetrics,
  riskTone,
  getRRColorClass,
}: RiskManagementSectionProps) {
  return (
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
              step={TRADE_PRICE_INPUT_STEP}
              placeholder="0.00000"
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
  )
}

import React from "react"
import { cn } from "@/lib/utils"
import { Clock, Tags } from "lucide-react"
import { getPlainTextFromRichText } from "@/lib/rich-text"
import { TradeFormSection } from "./trade-form-section"
import type { TechnicalAnalysisTagApi, TradingZoneApi } from "../../create-trade-page"

export interface MarketContextSectionProps {
  apiTechTags: TechnicalAnalysisTagApi[]
  analysisTags: string[]
  toggleAnalysisTag: (id: string) => void
  apiTradingZones: TradingZoneApi[]
  tradingSession: string
  setTradingSession: (id: string) => void
  errors: Record<string, string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
}

export function MarketContextSection({
  apiTechTags,
  analysisTags,
  toggleAnalysisTag,
  apiTradingZones,
  tradingSession,
  setTradingSession,
  errors,
  setErrors,
}: MarketContextSectionProps) {
  return (
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
  )
}

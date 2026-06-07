import React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, CircleAlert, ClipboardCheck, Loader2, Sparkles } from "lucide-react"
import { getPlainTextFromRichText } from "@/lib/rich-text"
import type { PreTradeChecklistInterpretationResult } from "@/lib/ai-insights-api"
import { TradeFormSection } from "./trade-form-section"
import { categoryColor, categoryLabel } from "./shared-utils"
import type { ChecklistModelApi, ChecklistModelDetailApi } from "@/lib/trade-store"
import type { PreTradeChecklistApi } from "../../create-trade-page"

export interface PreTradeChecklistSectionProps {
  selectedModelDetail: ChecklistModelDetailApi | null
  checkedItems: string[]
  apiChecklists: PreTradeChecklistApi[]
  checklistTone: { barClassName: string; pillClassName: string; textClassName: string }
  selectedModelId: string
  setSelectedModelId: (id: string) => void
  setCheckedItems: React.Dispatch<React.SetStateAction<string[]>>
  checklistModels: ChecklistModelApi[]
  checklistProgress: number
  errors: Record<string, string>
  toggleChecklistItem: (id: string) => void
  checklistAiInput: string
  setChecklistAiInput: (value: string) => void
  checklistInterpretation: PreTradeChecklistInterpretationResult | null
  isChecklistInterpreting: boolean
  handleInterpretChecklist: () => void
  handleApplyChecklistSuggestions: () => void
  surfaceFieldClassName: string
}

export function PreTradeChecklistSection({
  selectedModelDetail,
  checkedItems,
  apiChecklists,
  checklistTone,
  selectedModelId,
  setSelectedModelId,
  setCheckedItems,
  checklistModels,
  checklistProgress,
  errors,
  toggleChecklistItem,
  checklistAiInput,
  setChecklistAiInput,
  checklistInterpretation,
  isChecklistInterpreting,
  handleInterpretChecklist,
  handleApplyChecklistSuggestions,
  surfaceFieldClassName,
}: PreTradeChecklistSectionProps) {
  return (
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
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Interpret checklist notes
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Paste your pre-trade notes in plain English and preview which checklist criteria the AI thinks they support.
                  </p>
                </div>

                {checklistInterpretation ? (
                  <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-[11px]", checklistTone.pillClassName)}>
                    {Math.round(checklistInterpretation.confidence * 100)}% confidence
                  </Badge>
                ) : null}
              </div>

              <Textarea
                value={checklistAiInput}
                onChange={(event) => setChecklistAiInput(event.target.value)}
                placeholder="Example: London high got swept, bearish displacement confirmed, risk is fixed at 0.5%, and I am patient enough to wait for the retrace."
                rows={4}
                className={surfaceFieldClassName}
              />

              <div className="flex flex-wrap gap-2">
                <Button type="button" className="gap-2" onClick={handleInterpretChecklist} disabled={isChecklistInterpreting}>
                  {isChecklistInterpreting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Interpret notes
                </Button>
                {checklistInterpretation ? (
                  <Button type="button" variant="outline" onClick={handleApplyChecklistSuggestions}>
                    Apply suggestions
                  </Button>
                ) : null}
              </div>

              {checklistInterpretation ? (
                <div className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-3">
                  <p className="text-sm font-medium text-foreground">{checklistInterpretation.summary}</p>

                  {checklistInterpretation.matches.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Suggested matches
                      </p>
                      <div className="space-y-2">
                        {checklistInterpretation.matches.map((match) => (
                          <div key={match.checklistId} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{match.checklistName}</span>
                              <Badge variant="outline" className="border-border/70 bg-background/80 text-[10px] text-muted-foreground">
                                {match.category}
                              </Badge>
                              <Badge variant="outline" className={cn("text-[10px]", checklistTone.pillClassName)}>
                                {Math.round(match.confidence * 100)}%
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                              {match.rationale}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {checklistInterpretation.unmatchedInputs.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Unmatched notes
                      </p>
                      <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
                        {checklistInterpretation.unmatchedInputs.map((entry) => (
                          <li key={entry} className="rounded-lg bg-muted/20 px-3 py-2">
                            {entry}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

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
                    className="rounded-xl border border-border/60 bg-background/60 p-3"
                  >
                    <span className={cn("text-xs font-medium", categoryColor[typeId])}>
                      {categoryLabel[typeId]}
                    </span>
                    <div className="mt-2.5 space-y-2">
                      {items.map((item) => {
                        const isChecked = checkedItems.includes(item.id.toString())

                        return (
                          <label
                            key={item.id}
                            className={cn(
                              "group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                              isChecked
                                ? "border-emerald-500/40 bg-emerald-500/10"
                                : "border-slate-200/80 bg-background/60 hover:border-emerald-500/30 hover:bg-emerald-500/5 dark:border-slate-700/70",
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
  )
}

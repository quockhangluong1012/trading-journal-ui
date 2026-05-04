import React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, CircleAlert, ClipboardCheck } from "lucide-react"
import { getPlainTextFromRichText } from "@/lib/rich-text"
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
  )
}

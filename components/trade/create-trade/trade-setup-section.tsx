import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Check,
  ChevronsUpDown,
  FileText,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { PositionType } from "@/lib/enum/PositionType"
import type { TradeFormData } from "@/lib/create-trade-form"
import { getPlainTextFromRichText } from "@/lib/rich-text"
import type { TradingSetupSummaryDto } from "@/lib/setup-api"
import { TRADE_PRICE_INPUT_STEP } from "@/lib/trade-price-format"
import { TradeFormSection } from "./trade-form-section"

export interface TradeSetupSectionProps {
  formData: TradeFormData
  errors: Record<string, string>
  handleInputChange: (field: keyof Omit<TradeFormData, "position">, value: string) => void
  handlePositionChange: (value: string) => void
  assetOptions: string[]
  setupOptions: TradingSetupSummaryDto[]
  selectedTradingSetupId: string
  selectedTradingSetup: TradingSetupSummaryDto | null
  surfaceFieldClassName: string
}

export function TradeSetupSection({
  formData,
  errors,
  handleInputChange,
  handlePositionChange,
  assetOptions,
  setupOptions,
  selectedTradingSetupId,
  selectedTradingSetup,
  surfaceFieldClassName,
}: TradeSetupSectionProps) {
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false)
  const [assetSearchQuery, setAssetSearchQuery] = useState("")

  const trimmedAssetSearchQuery = assetSearchQuery.trim()
  const normalizedAssetSearchQuery = trimmedAssetSearchQuery.toUpperCase()
  const normalizedSelectedAsset = formData.asset.trim().toUpperCase()
  const hasExactSavedAssetMatch = assetOptions.some(
    (asset) => asset.toUpperCase() === normalizedAssetSearchQuery,
  )

  const handleAssetPickerOpenChange = (nextOpen: boolean) => {
    setIsAssetPickerOpen(nextOpen)

    if (!nextOpen) {
      setAssetSearchQuery("")
    }
  }

  const handleAssetSelection = (nextAsset: string) => {
    handleInputChange("asset", nextAsset.trim())
    setAssetSearchQuery("")
    setIsAssetPickerOpen(false)
  }

  return (
    <TradeFormSection
      title="Trade Setup"
      description="Set the core execution details first, then define a clear profit ladder before the trade is live."
      icon={<FileText className="h-4 w-4 text-primary" />}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="asset">Asset Name</Label>
              <Popover open={isAssetPickerOpen} onOpenChange={handleAssetPickerOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    id="asset"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-label="Asset Name"
                    aria-expanded={isAssetPickerOpen}
                    className={cn(
                      "h-9 w-full justify-between px-3 font-normal",
                      !formData.asset && "text-muted-foreground",
                      surfaceFieldClassName,
                      errors.asset && "border-destructive",
                    )}
                  >
                    <span className="truncate">
                      {formData.asset || "Select or add an asset"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                  <Command>
                    <CommandInput
                      aria-label="Search or add asset"
                      autoFocus
                      placeholder="Search saved assets or add a new one"
                      value={assetSearchQuery}
                      onValueChange={setAssetSearchQuery}
                    />
                    <CommandList>
                      {trimmedAssetSearchQuery && !hasExactSavedAssetMatch ? (
                        <CommandGroup heading="Use custom asset">
                          <CommandItem
                            value={`use-${trimmedAssetSearchQuery}`}
                            onSelect={() => handleAssetSelection(trimmedAssetSearchQuery)}
                          >
                            <Plus className="h-4 w-4 text-primary" />
                            <span className="truncate">Use &quot;{trimmedAssetSearchQuery}&quot;</span>
                          </CommandItem>
                        </CommandGroup>
                      ) : null}

                      {assetOptions.length > 0 ? (
                        <CommandGroup heading="Saved assets">
                          {assetOptions.map((asset) => (
                            <CommandItem
                              key={asset}
                              value={asset}
                              onSelect={() => handleAssetSelection(asset)}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  asset.toUpperCase() === normalizedSelectedAsset
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <span className="truncate">{asset}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : null}

                      <CommandEmpty>
                        {trimmedAssetSearchQuery
                          ? `No saved assets match "${trimmedAssetSearchQuery}".`
                          : "No saved assets yet. Type to add one."}
                      </CommandEmpty>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                step={TRADE_PRICE_INPUT_STEP}
                placeholder="0.00000"
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

          <div className="space-y-3 rounded-lg bg-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <Label htmlFor="tradingSetupId">Linked setup</Label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Connect this trade to a saved setup so analytics and review flows can track the playbook it came from.
                </p>
              </div>
              <Link href="/setup" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                Manage setups
              </Link>
            </div>

            <Select
              value={selectedTradingSetupId || "none"}
              onValueChange={(value) => handleInputChange("tradingSetupId", value === "none" ? "" : value)}
            >
              <SelectTrigger id="tradingSetupId" className={surfaceFieldClassName}>
                <SelectValue placeholder="Link a saved setup" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked setup</SelectItem>
                {setupOptions.map((setup) => (
                  <SelectItem key={setup.id} value={setup.id.toString()}>
                    <span className="flex items-center gap-2">
                      {setup.name}
                      <span className="text-[10px] text-muted-foreground">
                        ({setup.stepCount} steps)
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTradingSetup ? (
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{selectedTradingSetup.name}</p>
                  <Badge variant="outline" className="border-primary/20 bg-background/70 text-[10px] text-muted-foreground">
                    {selectedTradingSetup.stepCount} steps
                  </Badge>
                </div>
                {selectedTradingSetup.description ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {getPlainTextFromRichText(selectedTradingSetup.description)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    No overview saved yet. You can still link the setup so this trade feeds the right playbook analytics.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {setupOptions.length > 0
                  ? "Leave this empty if the trade is discretionary or the setup has not been documented yet."
                  : "No saved setups yet. Create one in the setup manager if you want this trade linked to a playbook."}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            Profit ladder
          </div>

          <div className="mt-3 grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="targetTier1">Tier 1 Target</Label>
              <Input
                id="targetTier1"
                type="number"
                step={TRADE_PRICE_INPUT_STEP}
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
                step={TRADE_PRICE_INPUT_STEP}
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
                step={TRADE_PRICE_INPUT_STEP}
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

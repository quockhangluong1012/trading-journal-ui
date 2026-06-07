"use client";

import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleDollarSign,
  Crosshair,
  Loader2,
  ShieldCheck,
  Target,
  Wallet,
  Zap,
} from "lucide-react";

import { useOrderForm } from "@/hooks/use-order-form";
import { cn } from "@/lib/utils";
import { calculateTicks, getAssetTickSize, getMarketPriceState } from "@/components/backtest/order-panel.utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface OrderPanelProps {
  sessionId: number;
  currentPrice: number;
  previousPrice?: number | null;
  onCollapse?: () => void;
}

function formatPrice(value: number | null | undefined, digits?: number) {
  // Default to magnitude-based precision so forex pairs keep their pip digit
  // (1.08750) while higher-priced assets (gold, indices) show 2 — matching the
  // order-ticket header's formatTicketPrice. Callers can still force a count.
  const resolvedDigits = digits ?? (value != null && value >= 100 ? 2 : 5);

  if (value == null || !Number.isFinite(value) || value <= 0) {
    return (0).toFixed(resolvedDigits);
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: resolvedDigits,
    maximumFractionDigits: resolvedDigits,
  });
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTicks(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 ticks";
  }

  return `${value.toFixed(0)} ticks`;
}

function OrderMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function OrderPanel({ sessionId, currentPrice, previousPrice = null, onCollapse }: OrderPanelProps) {
  const {
    form,
    side,
    setSide,
    orderType,
    setOrderType,
    isSubmitting,
    exitsOpen,
    setExitsOpen,
    enableTp,
    setEnableTp,
    enableSl,
    setEnableSl,
    onSubmit,
    balance,
    session,
  } = useOrderForm({ sessionId, currentPrice });

  const units = Number(form.watch("positionSize") || 0);
  const watchedEntryPrice = Number(form.watch("entryPrice") || currentPrice);
  const price = Number(orderType === "Market" ? currentPrice : watchedEntryPrice);
  const tradeValue = units * price;
  const leverage = session?.leverage || 50;
  const margin = tradeValue / leverage;
  const buyingPowerAfter = balance - margin;
  const sessionAsset = session?.asset || "XAUUSD";
  const marketPriceText = formatPrice(currentPrice);
  const marketPriceState = getMarketPriceState(currentPrice, previousPrice);
  const tpValue = enableTp ? Number(form.watch("takeProfit") || 0) : 0;
  const slValue = enableSl ? Number(form.watch("stopLoss") || 0) : 0;
  const tickSize = getAssetTickSize(sessionAsset, price);
  const tpTicks = tpValue ? calculateTicks(tpValue, price, tickSize) : 0;
  const slTicks = slValue ? calculateTicks(slValue, price, tickSize) : 0;
  const riskReward =
    enableTp && enableSl && tpValue > 0 && slValue > 0
      ? Math.abs(tpValue - price) / Math.max(Math.abs(price - slValue), 0.00001)
      : null;
  const isLong = side === "Long";
  const submitLabel =
    orderType === "Limit"
      ? `Place ${isLong ? "limit buy" : "limit sell"}`
      : `${isLong ? "Buy" : "Sell"} market`;
  const submitHelper =
    orderType === "Limit"
      ? `${formatPrice(price)} entry, ${units || 0} ${sessionAsset}`
      : `${marketPriceText} live fill, ${units || 0} ${sessionAsset}`;

  const livePriceTone =
    marketPriceState.direction === "up"
      ? "text-emerald-600 dark:text-emerald-300"
      : marketPriceState.direction === "down"
        ? "text-rose-600 dark:text-rose-300"
        : "text-foreground";
  const priceChangeText =
    marketPriceState.change === 0
      ? "Flat"
      : `${marketPriceState.change > 0 ? "+" : ""}${marketPriceState.change.toFixed(5)}`;
  const priceChangeIcon =
    marketPriceState.direction === "up" ? (
      <ArrowUpRight className="h-3.5 w-3.5" />
    ) : marketPriceState.direction === "down" ? (
      <ArrowDownRight className="h-3.5 w-3.5" />
    ) : (
      <Zap className="h-3.5 w-3.5" />
    );

  return (
    <Form {...form}>
      <form
        className="flex h-full min-h-0 w-full flex-col bg-card text-sm"
        onSubmit={form.handleSubmit((values) => onSubmit(values))}
      >
        <div className="border-b border-border/60 bg-card px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 rounded-md px-2 text-xs font-medium">
                  {sessionAsset}
                </Badge>
                <Badge variant="secondary" className="h-6 rounded-md px-2 text-xs font-medium">
                  {leverage}:1
                </Badge>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className={cn("text-2xl font-semibold tabular-nums leading-none", livePriceTone)}>
                  {marketPriceText}
                </span>
                <span className={cn("mb-0.5 inline-flex items-center gap-1 text-xs tabular-nums", livePriceTone)}>
                  {priceChangeIcon}
                  {priceChangeText}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {orderType} {isLong ? "buy" : "sell"} ticket
              </div>
            </div>

            {onCollapse && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-md bg-background"
                onClick={onCollapse}
                title="Collapse order ticket"
                aria-label="Collapse order ticket"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <OrderMetric
              icon={<Wallet className="h-3.5 w-3.5 shrink-0" />}
              label="Balance"
              value={`$${formatMoney(balance)}`}
            />
            <OrderMetric
              icon={<CircleDollarSign className="h-3.5 w-3.5 shrink-0" />}
              label="Margin"
              value={`$${formatMoney(margin)}`}
            />
            <OrderMetric
              icon={<Crosshair className="h-3.5 w-3.5 shrink-0" />}
              label="Exposure"
              value={`$${formatMoney(tradeValue)}`}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
              {(["Market", "Limit"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={orderType === type}
                  onClick={() => {
                    setOrderType(type);
                    if (type === "Limit") {
                      form.setValue("entryPrice", currentPrice, {
                        shouldValidate: true,
                      });
                    }
                  }}
                  className={cn(
                    "h-9 rounded-md px-3 text-sm font-medium transition-colors",
                    orderType === type
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={side === "Long"}
                onClick={() => setSide("Long")}
                className={cn(
                  "rounded-md border px-3 py-3 text-left transition-colors",
                  side === "Long"
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-300"
                    : "border-border/70 bg-background hover:border-blue-500/40 hover:bg-blue-500/5",
                )}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Buy
                </div>
                <div className="mt-1 text-lg font-semibold leading-none">Long</div>
              </button>

              <button
                type="button"
                aria-pressed={side === "Short"}
                onClick={() => setSide("Short")}
                className={cn(
                  "rounded-md border px-3 py-3 text-left transition-colors",
                  side === "Short"
                    ? "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                    : "border-border/70 bg-background hover:border-rose-500/40 hover:bg-rose-500/5",
                )}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  Sell
                </div>
                <div className="mt-1 text-lg font-semibold leading-none">Short</div>
              </button>
            </div>

            <div className="space-y-3 rounded-md border border-border/70 bg-background/70 p-3">
              <FormField
                control={form.control}
                name="entryPrice"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      {orderType === "Limit" ? "Entry price" : "Market price"}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.001"
                          className="h-10 rounded-md bg-card pr-16 text-sm tabular-nums"
                          {...field}
                          disabled={orderType === "Market"}
                          value={orderType === "Market" ? marketPriceText : (field.value ?? "")}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
                          USD
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="positionSize"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-medium text-muted-foreground">Position size</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="1"
                          className="h-10 rounded-md bg-card pr-24 text-sm tabular-nums"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex max-w-20 items-center truncate text-xs font-medium text-muted-foreground">
                          {sessionAsset}
                        </div>
                      </div>
                    </FormControl>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="truncate">Value</span>
                      <span className="shrink-0 tabular-nums">${formatMoney(tradeValue)}</span>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <Collapsible
              open={exitsOpen}
              onOpenChange={setExitsOpen}
              className="rounded-md border border-border/70 bg-background/70"
            >
              <CollapsibleTrigger
                className="flex h-11 w-full items-center justify-between px-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={exitsOpen ? "Collapse exits section" : "Expand exits section"}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Exits
                </span>
                {exitsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3 border-t border-border/60 px-3 py-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Target className="h-3.5 w-3.5 text-emerald-500" />
                      Take profit
                    </span>
                    <Switch
                      checked={enableTp}
                      onCheckedChange={setEnableTp}
                      className="scale-75 origin-right data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                  <div className={cn("transition-opacity", enableTp ? "opacity-100" : "pointer-events-none opacity-45")}>
                    <FormField
                      control={form.control}
                      name="takeProfit"
                      render={({ field }) => (
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.001"
                              className="h-10 rounded-md bg-card pr-20 text-sm tabular-nums"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value)}
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
                              {formatTicks(tpTicks)}
                            </div>
                          </div>
                        </FormControl>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
                      Stop loss
                    </span>
                    <Switch
                      checked={enableSl}
                      onCheckedChange={setEnableSl}
                      className="scale-75 origin-right data-[state=checked]:bg-rose-600"
                    />
                  </div>
                  <div className={cn("transition-opacity", enableSl ? "opacity-100" : "pointer-events-none opacity-45")}>
                    <FormField
                      control={form.control}
                      name="stopLoss"
                      render={({ field }) => (
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.001"
                              className="h-10 rounded-md bg-card pr-20 text-sm tabular-nums"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value)}
                            />
                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
                              {formatTicks(slTicks)}
                            </div>
                          </div>
                        </FormControl>
                      )}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div className="border-t border-border/60 bg-card px-4 py-3">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-md bg-muted/60 px-2.5 py-2">
              <div className="text-xs text-muted-foreground">Available after</div>
              <div className={cn("mt-1 text-sm font-semibold tabular-nums", buyingPowerAfter < 0 && "text-rose-500")}>
                ${formatMoney(buyingPowerAfter)}
              </div>
            </div>
            <div className="rounded-md bg-muted/60 px-2.5 py-2">
              <div className="text-xs text-muted-foreground">Risk reward</div>
              <div className="mt-1 text-sm font-semibold tabular-nums">
                {riskReward ? `${riskReward.toFixed(2)}R` : "-"}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className={cn(
              "h-12 w-full flex-col gap-0.5 overflow-hidden rounded-md px-3 text-white shadow-sm",
              isLong ? "bg-blue-600 hover:bg-blue-700" : "bg-rose-600 hover:bg-rose-700",
            )}
            disabled={isSubmitting}
          >
            <span className="flex max-w-full items-center gap-2 truncate font-semibold">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className="truncate">{submitLabel}</span>
            </span>
            <span className="max-w-full truncate text-xs font-normal opacity-80">{submitHelper}</span>
          </Button>
        </div>
      </form>
    </Form>
  );
}

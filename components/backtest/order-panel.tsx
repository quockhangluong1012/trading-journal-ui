"use client";

import { ChevronDown, ChevronLeft, ChevronUp, Info } from "lucide-react";
import { useOrderForm } from "@/hooks/use-order-form";
import { cn } from "@/lib/utils";
import { getMarketPriceState } from "@/components/backtest/order-panel.utils";

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

export function OrderPanel({ sessionId, currentPrice, previousPrice = null, onCollapse }: OrderPanelProps) {
  const {
    form,
    side, setSide,
    orderType, setOrderType,
    isSubmitting,
    exitsOpen, setExitsOpen,
    enableTp, setEnableTp,
    enableSl, setEnableSl,
    onSubmit,
    balance, session,
  } = useOrderForm({ sessionId, currentPrice });

  const units = Number(form.watch("positionSize") || 0);
  const price = Number(orderType === "Market" ? currentPrice : (form.watch("entryPrice") || currentPrice));
  const tradeValue = units * price;
  const leverage = session?.leverage || 50;
  const margin = tradeValue / leverage;
  const sessionAsset = session?.asset || "XAUUSD";
  const marketPriceText = currentPrice > 0 ? currentPrice.toFixed(3) : "0.000";
  const marketPriceState = getMarketPriceState(currentPrice, previousPrice);

  const tpValue = enableTp ? (form.watch("takeProfit") || 0) : 0;
  const slValue = enableSl ? (form.watch("stopLoss") || 0) : 0;
  const tpTicks = tpValue ? Math.abs((Number(tpValue) - price) * 10000).toFixed(0) : "0";
  const slTicks = slValue ? Math.abs((Number(slValue) - price) * 10000).toFixed(0) : "0";
  const orderModeCopy = orderType === "Limit"
    ? "Your order stays pending until the replay trades through your price."
    : "Your order executes immediately at the visible market price.";
  const submitLabel = orderType === "Limit"
    ? `Place ${side === "Long" ? "Limit Buy" : "Limit Sell"}`
    : `${side === "Long" ? "Buy Market" : "Sell Market"}`;
  const submitHelper = orderType === "Limit"
    ? `${units || 0} ${sessionAsset} queued at ${price ? price.toFixed(3) : "0.000"}`
    : `${units || 0} ${sessionAsset} routed near ${price ? price.toFixed(3) : "0.000"}`;

  const livePriceTone = marketPriceState.direction === "up"
    ? "text-emerald-600 dark:text-emerald-300"
    : marketPriceState.direction === "down"
      ? "text-rose-600 dark:text-rose-300"
      : "text-foreground";

  const priceChangeText = marketPriceState.change === 0
    ? "No change"
    : `${marketPriceState.change > 0 ? "+" : ""}${marketPriceState.change.toFixed(5)}`;

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-0 w-full flex-col bg-card text-[13px] font-sans">
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Order Ticket
            </p>
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Live Price
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className={cn("text-base font-semibold tabular-nums", livePriceTone)}>{marketPriceText}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{priceChangeText}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight">{sessionAsset}</span>
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                {leverage}:1 leverage
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{orderModeCopy}</p>
          </div>

          <div className="flex items-start gap-2">
            {onCollapse && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-border/60"
                onClick={onCollapse}
                title="Collapse order ticket"
                aria-label="Collapse order ticket"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
        <Form {...form}>
          <form className="flex h-full min-h-full flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1">
              {["Market", "Limit"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setOrderType(type as "Market" | "Limit");
                    if (type === "Limit") {
                      form.setValue("entryPrice", currentPrice, {
                        shouldValidate: true,
                      });
                    }
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${orderType === type
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSide("Short");
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition-all ${side === "Short"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-500 shadow-sm"
                  : "border-border/60 bg-background hover:border-rose-500/30 hover:bg-rose-500/5"
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sell</div>
                <div className="mt-2 text-lg font-bold leading-none">Short</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSide("Long");
                }}
                className={`rounded-2xl border px-4 py-3 text-right transition-all ${side === "Long"
                  ? "border-[#2962FF]/40 bg-[#2962FF]/10 text-[#2962FF] shadow-sm"
                  : "border-border/60 bg-background hover:border-[#2962FF]/30 hover:bg-[#2962FF]/5"
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Buy</div>
                <div className="mt-2 text-lg font-bold leading-none">Long</div>
              </button>
            </div>

            <div className={cn(
              "rounded-xl border px-3 py-3 text-xs",
              orderType === "Limit"
                ? "border-[#2962FF]/20 bg-[#2962FF]/5 text-[#1E53E5] dark:text-[#8AAFFF]"
                : "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
            )}>
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{orderModeCopy}</span>
              </div>
            </div>

            <div className="space-y-4">
            <FormField
              control={form.control}
              name="entryPrice"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[13px] font-medium text-muted-foreground">
                    {orderType === "Limit" ? "Entry price" : "Current market price"}
                  </FormLabel>
                  <FormControl>
                    <div className="relative flex items-center overflow-hidden rounded-xl border border-border/60 bg-background focus-within:ring-1 ring-primary transition-all">
                      <Input
                        type="number"
                        step="0.001"
                        className="h-11 border-0 bg-transparent pl-3 pr-21 text-[13px] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
                        {...field}
                        disabled={orderType === "Market"}
                        value={
                          orderType === "Market" ? marketPriceText : (field.value ?? "")
                        }
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                      <div className="absolute right-0 flex h-full items-center px-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <span className="text-right">Live</span>
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
                  <FormLabel className="flex items-center text-[13px] font-medium text-muted-foreground">
                    Units <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                  </FormLabel>
                  <FormControl>
                    <div className="relative flex items-center overflow-hidden rounded-xl border border-border/60 bg-background focus-within:ring-1 ring-primary transition-all">
                      <Input
                        type="number"
                        step="1"
                        className="h-11 border-0 bg-transparent pl-3 pr-30.5 text-[13px] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                      <div className="absolute right-0 flex h-full items-center px-3 text-muted-foreground">
                        <span className="min-w-18.5 text-right text-[13px] font-medium text-foreground">
                          {tradeValue.toFixed(2)} USD{" "}
                          <ChevronDown className="h-3 w-3 opacity-70" />
                        </span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            </div>

            <Collapsible
              open={exitsOpen}
              onOpenChange={setExitsOpen}
              className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4"
            >
              <CollapsibleTrigger
                className="flex items-center justify-between w-full focus:outline-none"
                aria-label={exitsOpen ? "Collapse exits section" : "Expand exits section"}
              >
                <span className="font-semibold text-[14px]">Exits</span>
                {exitsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] text-muted-foreground">
                      Take profit, price
                    </span>
                    <Switch
                      checked={enableTp}
                      onCheckedChange={setEnableTp}
                      className="scale-75 origin-right data-[state=checked]:bg-[#089981]"
                    />
                  </div>
                  <div
                    className={`transition-opacity duration-200 ${enableTp ? "opacity-100" : "opacity-40 pointer-events-none"}`}
                  >
                    <FormField
                      control={form.control}
                      name="takeProfit"
                      render={({ field }) => (
                        <FormControl>
                          <div className="relative flex items-center overflow-hidden rounded-xl border border-border/60 bg-background focus-within:ring-1 ring-primary transition-all">
                            <Input
                              type="number"
                              step="0.001"
                              className="h-11 border-0 bg-transparent pl-3 pr-22.5 text-[13px] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            <div className="absolute right-0 flex h-full items-center px-3 text-muted-foreground">
                              <span className="min-w-18.5 text-right text-[13px] font-medium text-foreground">
                                {tpTicks} ticks
                                <ChevronDown className="h-3 w-3 opacity-70" />
                              </span>
                            </div>
                          </div>
                        </FormControl>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] text-muted-foreground">
                      Stop loss, price
                    </span>
                    <Switch
                      checked={enableSl}
                      onCheckedChange={setEnableSl}
                      className="scale-75 origin-right data-[state=checked]:bg-[#F23645]"
                    />
                  </div>
                  <div
                    className={`transition-opacity duration-200 ${enableSl ? "opacity-100" : "opacity-40 pointer-events-none"}`}
                  >
                    <FormField
                      control={form.control}
                      name="stopLoss"
                      render={({ field }) => (
                        <FormControl>
                          <div className="relative flex items-center overflow-hidden rounded-xl border border-border/60 bg-background focus-within:ring-1 ring-primary transition-all">
                            <Input
                              type="number"
                              step="0.001"
                              className="h-11 border-0 bg-transparent pl-3 pr-22.5 text-[13px] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            <div className="absolute right-0 flex h-full items-center px-3 text-muted-foreground">
                              <span className="min-w-18.5 text-right text-[13px] font-medium text-foreground">
                                {slTicks} ticks
                                <ChevronDown className="h-3 w-3 opacity-70" />
                              </span>
                            </div>
                          </div>
                        </FormControl>
                      )}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-auto rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Margin</div>
                  <div className="mt-1 font-semibold tabular-nums">{margin.toFixed(2)} USD</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Buying Power</div>
                  <div className="mt-1 font-semibold tabular-nums">{balance.toFixed(2)} USD</div>
                </div>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                {orderType === "Limit"
                  ? `Pending until ${side === "Long" ? "market trades down to" : "market trades up to"} ${price.toFixed(3)}.`
                  : `Executes immediately at the visible market price.`}
              </div>
            </div>
          </form>
        </Form>
      </div>

      <div className="border-t border-border/50 bg-card p-4 pt-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <Button
          type="button"
          className={`h-13.5 w-full flex-col items-center justify-center rounded-xl text-white shadow-md transition-all ${side === "Long" ? "bg-[#2962FF] hover:bg-[#1E53E5] hover:shadow-[#2962FF]/40" : "bg-[#F23645] hover:bg-[#D92B3A] hover:shadow-[#F23645]/40"}`}
          disabled={isSubmitting}
          onClick={form.handleSubmit((v) => onSubmit(v))}
        >
          <span className="mb-0.5 text-[15px] font-bold tracking-wide">{submitLabel}</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-90">
            {submitHelper}
          </span>
        </Button>
      </div>
    </div>
  );
}

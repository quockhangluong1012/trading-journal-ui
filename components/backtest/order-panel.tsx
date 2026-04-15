"use client";

import { ChevronDown, ChevronUp, Repeat, Info, X, LayoutGrid, MoreHorizontal } from "lucide-react";
import { useOrderForm } from "@/hooks/use-order-form";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export function OrderPanel({ sessionId, currentPrice }: { sessionId: number, currentPrice: number }) {
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

  const units = form.watch("positionSize") || 0;
  const price = orderType === "Market" ? currentPrice : (form.watch("entryPrice") || currentPrice);
  const tradeValue = units * price;
  const leverage = session?.leverage || 50;
  const margin = tradeValue / leverage;
  const sessionAsset = session?.asset || "XAUUSD";

  const spread = 0.57; 
  const spreadDisplay = 57.0; 
  const sellPriceText = (currentPrice - spread/2).toFixed(3);
  const buyPriceText = (currentPrice + spread/2).toFixed(3);

  const tpValue = enableTp ? (form.watch("takeProfit") || 0) : 0;
  const slValue = enableSl ? (form.watch("stopLoss") || 0) : 0;
  const tpTicks = tpValue ? Math.abs((Number(tpValue) - price) * 10000).toFixed(0) : "0";
  const slTicks = slValue ? Math.abs((Number(slValue) - price) * 10000).toFixed(0) : "0";

  return (
    <div className="flex flex-col h-full bg-card text-[13px] relative font-sans w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 bg-foreground rounded-[4px] flex items-center justify-center text-background font-bold text-[10px] tracking-tighter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <span className="font-bold text-[15px] tracking-tight">{sessionAsset}</span>
        </div>
        <div className="flex items-center gap-0.5 text-muted-foreground mr-[-8px]">
          <Button variant="ghost" size="icon" className="h-[28px] w-[28px] rounded-[4px] hover:text-foreground">
            <LayoutGrid className="h-[18px] w-[18px] stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-[28px] w-[28px] rounded-[4px] hover:text-foreground">
            <MoreHorizontal className="h-[18px] w-[18px] stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="icon" className="h-[28px] w-[28px] rounded-[4px] hover:text-foreground">
            <X className="h-[18px] w-[18px] stroke-[1.5]" />
          </Button>
        </div>
      </div>

      {/* Top Tabs */}
      <div className="flex px-4 py-2.5 gap-1 border-b border-border/50">
        <div className="flex-1 text-center py-[5px] bg-secondary text-foreground text-[13px] font-semibold rounded-[6px] cursor-default shadow-sm border border-border/40">Order</div>
        <div className="flex-1 text-center py-[5px] text-muted-foreground hover:bg-secondary/50 text-[13px] font-medium rounded-[6px] cursor-pointer transition-colors border border-transparent">DOM</div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto pb-[90px] custom-scrollbar">
        {/* Buy / Sell Buttons */}
        <div className="flex rounded-[8px] overflow-hidden bg-secondary border border-border/50 shadow-sm mb-5 relative h-[64px]">
          <button 
            type="button"
            onClick={() => setSide("Short")}
            className={`flex-1 px-3 py-1.5 flex flex-col items-start justify-center focus:outline-none transition-all duration-200 ${side === "Short" ? "bg-red-500/10 text-red-500 dark:text-red-400" : "bg-card text-foreground hover:bg-secondary/80"}`}
          >
            <span className="font-semibold text-[13px] mb-0.5">Sell</span>
            <span className="text-[18px] font-bold leading-none tracking-tight">{sellPriceText}</span>
          </button>
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border/60 text-[11px] px-1.5 py-0.5 rounded-[4px] shadow-sm z-10 text-foreground tabular-nums font-semibold">
            {spreadDisplay.toFixed(1)}
          </div>

          <button 
            type="button"
            onClick={() => setSide("Long")}
            className={`flex-1 px-3 py-1.5 flex flex-col items-end justify-center focus:outline-none transition-all duration-200 ${side === "Long" ? "bg-[#b3d4ff] text-[#0055ff] dark:bg-[#1a3a6b] dark:text-[#6a9fff]" : "bg-card text-[#0055ff] dark:text-[#6a9fff] hover:bg-[#b3d4ff]/30 dark:hover:bg-[#1a3a6b]/50"}`}
          >
            <span className="font-semibold text-[13px] mb-0.5">Buy</span>
            <span className="text-[18px] font-bold leading-none tracking-tight">{buyPriceText}</span>
          </button>
        </div>

        {/* Order Types */}
        <div className="flex border-b border-border/50 mb-5 relative">
          {["Market", "Limit", "Stop"].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type as any)}
              className={`flex-1 text-center pb-2 pt-1 text-[13px] font-medium transition-colors ${orderType === type ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {type}
            </button>
          ))}
          {/* Active indicator */}
          <div 
             className="absolute bottom-[-1px] h-[2px] bg-foreground transition-all duration-300 rounded-t-full" 
             style={{ 
               left: orderType === "Market" ? "0%" : orderType === "Limit" ? "33.33%" : "66.66%",
               width: "33.33%" 
             }} 
          />
        </div>

        <Form {...form}>
          <form className="space-y-4 pb-2">
            
            <FormField
              control={form.control}
              name="entryPrice"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[13px] text-muted-foreground font-normal">Price</FormLabel>
                   <FormControl>
                    <div className="relative flex items-center border border-border/60 rounded-[6px] bg-card overflow-hidden focus-within:ring-1 ring-primary transition-all">
                      <Input 
                        type="number" 
                        step="0.001" 
                        className="h-[34px] border-0 bg-transparent text-[13px] pl-3 pr-[80px] focus-visible:ring-0 focus-visible:ring-offset-0 tabular-nums" 
                        {...field} 
                        disabled={orderType === "Market"}
                        value={orderType === "Market" ? currentPrice : field.value}
                        onChange={e => field.onChange(e.target.value)}
                      />
                      <div className="absolute right-0 flex items-center h-full px-3 gap-2 bg-card text-muted-foreground">
                        <Repeat className="h-3 w-3 cursor-pointer hover:text-foreground transition-colors" />
                        <span className="text-[13px] w-6 text-right font-medium">{side === "Long" ? "Ask" : "Bid"}</span>
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="positionSize"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[13px] text-muted-foreground font-normal flex items-center">Units <ChevronDown className="h-3 w-3 ml-1 opacity-70" /></FormLabel>
                  <FormControl>
                    <div className="relative flex items-center border border-border/60 rounded-[6px] bg-card overflow-hidden focus-within:ring-1 ring-primary transition-all">
                      <Input 
                        type="number" 
                        step="1" 
                        className="h-[34px] border-0 bg-transparent text-[13px] pl-3 pr-[110px] focus-visible:ring-0 focus-visible:ring-offset-0 tabular-nums" 
                        {...field} 
                        onChange={e => field.onChange(e.target.value)}
                      />
                      <div className="absolute right-0 flex items-center h-full px-3 gap-2 bg-card text-muted-foreground">
                        <Repeat className="h-3 w-3 cursor-pointer hover:text-foreground transition-colors" />
                        <span className="text-[13px] text-foreground min-w-[50px] text-right flex items-center gap-1 font-medium">{tradeValue.toFixed(2)} USD <ChevronDown className="h-3 w-3 opacity-70" /></span>
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Exits Accordion */}
            <Collapsible open={exitsOpen} onOpenChange={setExitsOpen} className="space-y-3 pt-4 border-t border-border/50 mt-6">
              <CollapsibleTrigger className="flex items-center justify-between w-full focus:outline-none">
                 <span className="font-semibold text-[14px]">Exits</span>
                 {exitsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-3">
                 <div>
                   <div className="flex items-center justify-between mb-1.5">
                     <span className="text-[13px] text-muted-foreground flex items-center gap-1 cursor-pointer">Take profit, price <ChevronDown className="h-3 w-3" /></span>
                     <Switch checked={enableTp} onCheckedChange={setEnableTp} className="scale-75 origin-right data-[state=checked]:bg-[#089981]" />
                   </div>
                   <div className={`transition-opacity duration-200 ${enableTp ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                     <FormField
                        control={form.control}
                        name="takeProfit"
                        render={({ field }) => (
                          <FormControl>
                            <div className="relative flex items-center border border-border/60 rounded-[6px] bg-card overflow-hidden focus-within:ring-1 ring-primary transition-all">
                              <Input type="number" step="0.001" className="h-[34px] border-0 bg-transparent text-[13px] pl-3 pr-[90px] focus-visible:ring-0 focus-visible:ring-offset-0 tabular-nums" {...field} onChange={e => field.onChange(e.target.value)} />
                              <div className="absolute right-0 flex items-center h-full px-3 gap-2 bg-card text-muted-foreground">
                                <Repeat className="h-3 w-3 cursor-pointer hover:text-foreground transition-colors" />
                                <span className="text-[13px] min-w-[40px] text-right text-foreground flex items-center gap-1 font-medium">{tpTicks} ticks <ChevronDown className="h-3 w-3 opacity-70" /></span>
                              </div>
                            </div>
                          </FormControl>
                        )}
                      />
                   </div>
                 </div>

                 <div>
                   <div className="flex items-center justify-between mb-1.5">
                     <span className="text-[13px] text-muted-foreground flex items-center gap-1 cursor-pointer">Stop loss, price <ChevronDown className="h-3 w-3" /></span>
                     <Switch checked={enableSl} onCheckedChange={setEnableSl} className="scale-75 origin-right data-[state=checked]:bg-[#F23645]" />
                   </div>
                   <div className={`transition-opacity duration-200 ${enableSl ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                     <FormField
                        control={form.control}
                        name="stopLoss"
                        render={({ field }) => (
                          <FormControl>
                            <div className="relative flex items-center border border-border/60 rounded-[6px] bg-card overflow-hidden focus-within:ring-1 ring-primary transition-all">
                              <Input type="number" step="0.001" className="h-[34px] border-0 bg-transparent text-[13px] pl-3 pr-[90px] focus-visible:ring-0 focus-visible:ring-offset-0 tabular-nums" {...field} onChange={e => field.onChange(e.target.value)} />
                              <div className="absolute right-0 flex items-center h-full px-3 gap-2 bg-card text-muted-foreground">
                                <Repeat className="h-3 w-3 cursor-pointer hover:text-foreground transition-colors" />
                                <span className="text-[13px] min-w-[40px] text-right text-foreground flex items-center gap-1 font-medium">{slTicks} ticks <ChevronDown className="h-3 w-3 opacity-70" /></span>
                              </div>
                            </div>
                          </FormControl>
                        )}
                      />
                   </div>
                 </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Extra Settings */}
            <div className="pt-4 border-t border-border/50">
              <span className="font-semibold text-[14px] mb-2.5 block">Extra settings</span>
              <div className="space-y-1">
                <span className="text-[13px] text-muted-foreground">Time in force</span>
                <Select defaultValue="week">
                  <SelectTrigger className="h-[34px] text-[13px] bg-transparent border-border/60 rounded-[6px] font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="gtc">Good till cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Order Info */}
            <div className="pt-5 pb-2">
              <span className="font-semibold text-[14px] mb-3 block">Order info</span>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">Margin <Info className="h-[13px] w-[13px] text-muted-foreground/70" /></span>
                  <span className="font-bold tabular-nums">{margin.toFixed(2)} / {balance.toFixed(2)}</span>
                </div>
                <div className="px-0.5 py-1 mb-2">
                  <Slider defaultValue={[2]} max={10} step={1} className="[&_[role=slider]]:h-[14px] [&_[role=slider]]:w-[14px] [&_[role=slider]]:border-[1px] [&_[role=slider]]:border-background [&_[role=slider]]:shadow-sm [&_[role=slider]]:bg-primary" />
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Leverage</span>
                  <span className="font-bold tabular-nums">{leverage}:1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tick value</span>
                  <span className="font-bold tabular-nums">0.001 <span className="font-normal text-[11px] text-muted-foreground ml-0.5">USD</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Trade value</span>
                  <span className="font-bold tabular-nums">{tradeValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="font-normal text-[11px] text-muted-foreground ml-0.5">USD</span></span>
                </div>
              </div>
            </div>



          </form>
        </Form>
      </div>

      {/* Place Order Action Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pt-3 bg-card border-t border-border/50 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <Button 
          type="button"
          className={`w-full h-[52px] flex flex-col items-center justify-center rounded-[8px] text-white transition-all shadow-md ${side === "Long" ? "bg-[#2962FF] hover:bg-[#1E53E5] hover:shadow-[#2962FF]/40" : "bg-[#F23645] hover:bg-[#D92B3A] hover:shadow-[#F23645]/40"}`}
          disabled={isSubmitting}
          onClick={form.handleSubmit(v => onSubmit(v))}
        >
          <span className="font-bold text-[16px] tracking-wide mb-0.5">{side === "Long" ? "Buy" : "Sell"}</span>
          <span className="text-[11px] font-medium opacity-90 uppercase tracking-wider">
            {units} {sessionAsset} @ {price.toFixed(3)} {orderType}
          </span>
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, TrendingUp, TrendingDown, X } from "lucide-react";
import { useBacktestStore } from "@/lib/backtest-store";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const orderSchema = z.object({
  positionSize: z.coerce.number().positive("Size must be positive"),
  entryPrice: z.coerce.number().positive("Price must be positive").optional(), // Only for limits
  stopLoss: z.coerce.number().positive().optional().or(z.literal("")),
  takeProfit: z.coerce.number().positive().optional().or(z.literal("")),
});

export function OrderPanel({ sessionId, currentPrice }: { sessionId: number, currentPrice: number }) {
  const [orderType, setOrderType] = useState<"Market" | "Limit">("Market");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { placeOrder, activePositions, pendingOrders, cancelOrder } = useBacktestStore();

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      positionSize: 1000,
    },
  });

  const onSubmit = async (values: z.infer<typeof orderSchema>, side: "Long" | "Short") => {
    setIsSubmitting(true);
    try {
      await placeOrder({
        sessionId,
        orderType: orderType === "Market" ? 0 : 1,
        side: side === "Long" ? 0 : 1,
        entryPrice: orderType === "Market" ? currentPrice : Number(values.entryPrice),
        positionSize: values.positionSize,
        stopLoss: values.stopLoss ? Number(values.stopLoss) : null,
        takeProfit: values.takeProfit ? Number(values.takeProfit) : null,
      });
      form.reset({ ...values });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    await cancelOrder(id);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Order Placement</h3>
        <p className="text-sm text-muted-foreground">Market Price: {currentPrice}</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <Tabs value={orderType} onValueChange={(v) => {
            setOrderType(v as any);
            form.clearErrors();
        }} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="Market">Market</TabsTrigger>
            <TabsTrigger value="Limit">Limit</TabsTrigger>
          </TabsList>
        </Tabs>

        <Form {...form}>
          <form className="space-y-4">
            {orderType === "Limit" && (
              <FormField
                control={form.control}
                name="entryPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limit Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" placeholder={currentPrice.toString()} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="positionSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stopLoss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stop Loss (Opt)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="takeProfit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Take Profit (Opt)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button 
                type="button" 
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isSubmitting}
                onClick={form.handleSubmit((v) => onSubmit(v, "Long"))}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                Buy / Long
              </Button>
              <Button 
                type="button" 
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isSubmitting}
                onClick={form.handleSubmit((v) => onSubmit(v, "Short"))}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="mr-2 h-4 w-4" />}
                Sell / Short
              </Button>
            </div>
          </form>
        </Form>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Active Positions ({activePositions.length})</h4>
            {activePositions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No open positions.</p>
            ) : (
              <div className="space-y-2">
                {activePositions.map(pos => (
                  <div key={pos.id} className="border rounded-md p-2 text-xs flex justify-between items-center">
                    <div>
                      <Badge variant={pos.side === "Long" ? "default" : "destructive"} className="mb-1">{pos.side}</Badge>
                      <div>Entry: {pos.entryPrice}</div>
                      <div>Size: {pos.positionSize}</div>
                    </div>
                    {/* Optionally close manually if we have an endpoint */}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Pending Orders ({pendingOrders.length})</h4>
            {pendingOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pending orders.</p>
            ) : (
              <div className="space-y-2">
                {pendingOrders.map(ord => (
                  <div key={ord.id} className="border rounded-md p-2 text-xs flex justify-between items-start">
                     <div>
                      <Badge variant={ord.side === "Long" ? "default" : "destructive"} className="mb-1">{ord.side}</Badge>
                      <div>Limit: {ord.entryPrice}</div>
                      <div>Size: {ord.positionSize}</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCancel(ord.id)}>
                      <X className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

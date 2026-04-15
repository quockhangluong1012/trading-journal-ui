import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useBacktestStore } from "@/lib/backtest-store";
import { toast } from "sonner";

export const orderSchema = z.object({
  positionSize: z.coerce.number().positive("Size must be positive"),
  entryPrice: z.coerce.number().positive("Price must be positive").optional(), 
  stopLoss: z.coerce.number().positive().optional().or(z.literal("")),
  takeProfit: z.coerce.number().positive().optional().or(z.literal("")),
});

export function useOrderForm({ sessionId, currentPrice }: { sessionId: number, currentPrice: number }) {
  const [side, setSide] = useState<"Long" | "Short">("Long");
  const [orderType, setOrderType] = useState<"Market" | "Limit" | "Stop">("Limit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [exitsOpen, setExitsOpen] = useState(true);
  const [openPositionsOpen, setOpenPositionsOpen] = useState(true);
  const [enableTp, setEnableTp] = useState(false);
  const [enableSl, setEnableSl] = useState(false);
  
  const { placeOrder, activePositions, pendingOrders, cancelOrder, closeOrder, balance, session } = useBacktestStore();

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      positionSize: 1,
      entryPrice: currentPrice,
    },
  });

  const onSubmit = async (values: z.infer<typeof orderSchema>) => {
    const priceToUse = orderType === "Market" ? currentPrice : Number(values.entryPrice || currentPrice);
    if (values.positionSize * priceToUse / 50 > balance) {
      toast.error(`Insufficient margin.`);
      return;
    }

    if (orderType === "Limit" && values.entryPrice) {
      if (side === "Long" && Number(values.entryPrice) >= currentPrice) {
        toast.error("Limit Buy price must be below current market price.");
        return;
      }
      if (side === "Short" && Number(values.entryPrice) <= currentPrice) {
        toast.error("Limit Sell price must be above current market price.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await placeOrder({
        sessionId,
        orderType: orderType === "Market" ? 0 : 1, 
        side: side === "Long" ? 0 : 1,
        entryPrice: priceToUse,
        positionSize: values.positionSize,
        stopLoss: enableSl && values.stopLoss ? Number(values.stopLoss) : null,
        takeProfit: enableTp && values.takeProfit ? Number(values.takeProfit) : null,
      });
      toast.success("Order placed successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err.message || "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelOrder(id);
      toast.success("Order cancelled");
    } catch (err: any) {
      toast.error("Failed to cancel order");
    }
  };

  const handleClose = async (id: number, price: number) => {
    try {
      await closeOrder(id, price);
      toast.success("Position closed");
    } catch (err: any) {
      toast.error("Failed to close position");
    }
  };

  return {
    form,
    side, setSide,
    orderType, setOrderType,
    isSubmitting,
    exitsOpen, setExitsOpen,
    openPositionsOpen, setOpenPositionsOpen,
    enableTp, setEnableTp,
    enableSl, setEnableSl,
    onSubmit,
    handleCancel,
    handleClose,
    balance, session,
    activePositions,
    pendingOrders
  };
}

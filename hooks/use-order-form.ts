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
  const [orderType, setOrderType] = useState<"Market" | "Limit">("Limit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [exitsOpen, setExitsOpen] = useState(true);
  const [enableTp, setEnableTp] = useState(false);
  const [enableSl, setEnableSl] = useState(false);

  const { placeOrder, balance, session } = useBacktestStore();

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      positionSize: 1,
      entryPrice: currentPrice,
    },
  });

  const onSubmit = async (values: z.infer<typeof orderSchema>) => {
    const priceToUse = orderType === "Market" ? currentPrice : Number(values.entryPrice || currentPrice);
    const leverage = session?.leverage || 50;

    if (values.positionSize * priceToUse / leverage > balance) {
      toast.error(`Insufficient margin.`);
      return;
    }

    if (orderType === "Limit") {
      const entryValue = Number(values.entryPrice);
      if (!values.entryPrice || isNaN(entryValue)) {
        toast.error("Entry price is required for limit orders.");
        return;
      }
      if (side === "Long" && entryValue >= currentPrice) {
        toast.error("Limit Buy price must be below current market price.");
        return;
      }
      if (side === "Short" && entryValue <= currentPrice) {
        toast.error("Limit Sell price must be above current market price.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const order = await placeOrder({
        sessionId,
        orderType: orderType === "Market" ? 0 : 1,
        side: side === "Long" ? 0 : 1,
        entryPrice: priceToUse,
        positionSize: values.positionSize,
        stopLoss: enableSl && values.stopLoss ? Number(values.stopLoss) : null,
        takeProfit: enableTp && values.takeProfit ? Number(values.takeProfit) : null,
      });

      const fillPrice = order.filledPrice ?? order.entryPrice;
      toast.success(
        order.status === "Pending"
          ? `${side} limit order added to Pending Orders at ${priceToUse.toFixed(3)}.`
          : `${side} position opened at ${fillPrice.toFixed(3)}.`,
      );

      form.reset({
        positionSize: 1,
        entryPrice: currentPrice,
        stopLoss: "",
        takeProfit: "",
      });
      setEnableTp(false);
      setEnableSl(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err.message || "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    side, setSide,
    orderType, setOrderType,
    isSubmitting,
    exitsOpen, setExitsOpen,
    enableTp, setEnableTp,
    enableSl, setEnableSl,
    onSubmit,
    balance, session,
  };
}

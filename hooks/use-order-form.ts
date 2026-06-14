import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useBacktestStore } from "@/lib/backtest-store";
import { toast } from "sonner";

const optionalPositiveNumber = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().positive("Price must be positive").optional(),
);

export const orderSchema = z.object({
  positionSize: z.coerce.number().positive("Size must be positive"),
  entryPrice: optionalPositiveNumber,
  stopLoss: z.coerce.number().positive().optional().or(z.literal("")),
  takeProfit: z.coerce.number().positive().optional().or(z.literal("")),
});

export interface OrderFormInitialOrder {
  side?: "Long" | "Short";
  orderType?: "Market" | "Limit";
  entryPrice?: number | null;
  positionSize?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
}

function normalizeInitialOrderNumber(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function useOrderForm({
  sessionId,
  currentPrice,
  initialOrder = null,
}: {
  sessionId: number;
  currentPrice: number;
  initialOrder?: OrderFormInitialOrder | null;
}) {
  const initialEntryPrice = normalizeInitialOrderNumber(initialOrder?.entryPrice)
    ?? normalizeInitialOrderNumber(currentPrice);
  const initialStopLoss = normalizeInitialOrderNumber(initialOrder?.stopLoss);
  const initialTakeProfit = normalizeInitialOrderNumber(initialOrder?.takeProfit);
  const [side, setSide] = useState<"Long" | "Short">(initialOrder?.side ?? "Long");
  const [orderType, setOrderType] = useState<"Market" | "Limit">(initialOrder?.orderType ?? "Limit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [exitsOpen, setExitsOpen] = useState(true);
  const [enableTp, setEnableTp] = useState(Boolean(initialTakeProfit));
  const [enableSl, setEnableSl] = useState(Boolean(initialStopLoss));

  const { placeOrder, balance, session, currentTimestamp, candles } = useBacktestStore();

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      positionSize: normalizeInitialOrderNumber(initialOrder?.positionSize) ?? 1,
      entryPrice: initialEntryPrice,
      stopLoss: initialStopLoss ?? "",
      takeProfit: initialTakeProfit ?? "",
    },
  });
  const { clearErrors, setValue } = form;

  useEffect(() => {
    if (orderType !== "Market") {
      return;
    }

    setValue("entryPrice", currentPrice > 0 && Number.isFinite(currentPrice) ? currentPrice : undefined, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    clearErrors("entryPrice");
  }, [clearErrors, currentPrice, orderType, setValue]);

  const onSubmit = async (values: z.infer<typeof orderSchema>) => {
    if (orderType === "Market" && (!Number.isFinite(currentPrice) || currentPrice <= 0)) {
      toast.error("Market price is unavailable. Wait for a live price before placing a market order.");
      return;
    }

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
      if (side === "Long" && entryValue > currentPrice) {
        toast.error("Limit Buy price cannot be above current market price.");
        return;
      }
      if (side === "Short" && entryValue < currentPrice) {
        toast.error("Limit Sell price cannot be below current market price.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Anchor the order to the candle the user is actually looking at (the last
      // displayed candle), not the server's simulation clock. The sim clock often
      // leads the visible candle (it is the candle's close / next bucket), so using
      // it makes the chart marker resolve to a candle that is out of range at
      // placement and then jump forward when the next candle renders.
      const placementTimestamp =
        candles.length > 0
          ? candles[candles.length - 1].timestamp
          : currentTimestamp ?? session?.currentTimestamp ?? null;

      const order = await placeOrder({
        sessionId,
        orderType: orderType === "Market" ? 0 : 1,
        side: side === "Long" ? 0 : 1,
        entryPrice: priceToUse,
        positionSize: values.positionSize,
        stopLoss: enableSl && values.stopLoss ? Number(values.stopLoss) : null,
        takeProfit: enableTp && values.takeProfit ? Number(values.takeProfit) : null,
        orderedAt: placementTimestamp,
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

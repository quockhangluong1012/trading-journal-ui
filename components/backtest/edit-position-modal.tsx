import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBacktestStore, BacktestOrder } from "@/lib/backtest-store";
import { getExitReferencePrice, validateExitLevels } from "./edit-position-modal.utils";

export function EditPositionModal({ order, isOpen, onClose }: { order: BacktestOrder | null, isOpen: boolean, onClose: () => void }) {
  const { updateOrder } = useBacktestStore();
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      setStopLoss(order.stopLoss?.toString() || "");
      setTakeProfit(order.takeProfit?.toString() || "");
    }
  }, [order, isOpen]);

  const validation = useMemo(
    () => validateExitLevels(order, takeProfit, stopLoss),
    [order, takeProfit, stopLoss],
  );

  const handleSubmit = async () => {
    if (!order || !validation.isValid) return;
    setIsSubmitting(true);
    await updateOrder({
      orderId: order.id,
      stopLoss: stopLoss === "" ? null : Number(stopLoss),
      takeProfit: takeProfit === "" ? null : Number(takeProfit)
    });
    setIsSubmitting(false);
    onClose();
  };

  const referencePrice = order ? getExitReferencePrice(order) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {order && (
            <p className="text-xs text-muted-foreground">
              {order.side} · entry{" "}
              <span className="font-mono text-foreground">{referencePrice}</span>
            </p>
          )}
          <div className="space-y-1.5">
            <Label>Take Profit Price</Label>
            <Input
              type="number"
              step="0.001"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="0.000"
              aria-invalid={validation.takeProfitError !== null}
              aria-describedby={validation.takeProfitError ? "tp-error" : undefined}
            />
            {validation.takeProfitError && (
              <p id="tp-error" className="text-xs text-rose-500">{validation.takeProfitError}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Stop Loss Price</Label>
            <Input
              type="number"
              step="0.001"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="0.000"
              aria-invalid={validation.stopLossError !== null}
              aria-describedby={validation.stopLossError ? "sl-error" : undefined}
            />
            {validation.stopLossError && (
              <p id="sl-error" className="text-xs text-rose-500">{validation.stopLossError}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !validation.isValid}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

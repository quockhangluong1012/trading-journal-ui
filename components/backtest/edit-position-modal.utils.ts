import type { BacktestOrder } from "@/lib/backtest-store";

export interface ExitLevelValidation {
  takeProfitError: string | null;
  stopLossError: string | null;
  isValid: boolean;
}

/** The price the exit levels are measured against: actual fill if present, else the order/limit price. */
export function getExitReferencePrice(order: BacktestOrder): number {
  return order.filledPrice ?? order.entryPrice;
}

/**
 * Validates take-profit / stop-loss inputs for an order, enforcing the directional rules:
 *   - Long:  TP must sit ABOVE entry, SL must sit BELOW entry.
 *   - Short: TP must sit BELOW entry, SL must sit ABOVE entry.
 * Empty inputs mean "clear the level" and are always valid. Non-empty inputs must be a
 * finite number greater than zero before the directional check applies.
 */
export function validateExitLevels(
  order: BacktestOrder | null,
  takeProfitInput: string,
  stopLossInput: string,
): ExitLevelValidation {
  if (!order) {
    return { takeProfitError: null, stopLossError: null, isValid: true };
  }

  const entry = getExitReferencePrice(order);
  const isLong = order.side === "Long";

  const parse = (raw: string): { value: number | null; error: string | null } => {
    const trimmed = raw.trim();
    if (trimmed === "") return { value: null, error: null };
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) {
      return { value: null, error: "Enter a price greater than 0" };
    }
    return { value, error: null };
  };

  const tp = parse(takeProfitInput);
  const sl = parse(stopLossInput);

  let takeProfitError = tp.error;
  let stopLossError = sl.error;

  const hasEntry = Number.isFinite(entry) && entry > 0;

  if (!takeProfitError && tp.value !== null && hasEntry) {
    if (isLong && tp.value <= entry) {
      takeProfitError = `Take profit must be above entry (${entry})`;
    } else if (!isLong && tp.value >= entry) {
      takeProfitError = `Take profit must be below entry (${entry})`;
    }
  }

  if (!stopLossError && sl.value !== null && hasEntry) {
    if (isLong && sl.value >= entry) {
      stopLossError = `Stop loss must be below entry (${entry})`;
    } else if (!isLong && sl.value <= entry) {
      stopLossError = `Stop loss must be above entry (${entry})`;
    }
  }

  return {
    takeProfitError,
    stopLossError,
    isValid: takeProfitError === null && stopLossError === null,
  };
}

import type { BacktestOrder } from "@/lib/backtest-store";

/** Avg fill price the position is actually marked from. */
export function getPositionEntryPrice(position: BacktestOrder): number {
  return position.filledPrice || position.entryPrice;
}

/** Unrealized P&L for a single open position at the given mark price. */
export function calculatePositionUnrealizedPnl(position: BacktestOrder, currentPrice: number): number {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return 0;
  }

  const entryPrice = getPositionEntryPrice(position);
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return 0;
  }

  const direction = position.side === "Long" ? 1 : -1;
  return direction * (currentPrice - entryPrice) * position.positionSize;
}

/** Aggregate unrealized P&L across all open positions. */
export function calculateUnrealizedPnl(positions: BacktestOrder[], currentPrice: number): number {
  return positions.reduce(
    (sum, position) => sum + calculatePositionUnrealizedPnl(position, currentPrice),
    0,
  );
}

/** Aggregate realized P&L across all closed positions. */
export function calculateRealizedPnl(closedPositions: BacktestOrder[]): number {
  return closedPositions.reduce((sum, order) => sum + (order.pnl ?? 0), 0);
}

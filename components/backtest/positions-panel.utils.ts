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

export interface RowWindow {
  /** First row index to render (inclusive). */
  start: number;
  /** Last row index to render (exclusive). */
  end: number;
  /** Spacer height in px before the rendered rows. */
  topPad: number;
  /** Spacer height in px after the rendered rows. */
  bottomPad: number;
}

/**
 * Computes which slice of a fixed-row-height list is visible for a given scroll position,
 * so a long order history can render only the rows on screen (plus overscan) instead of all
 * of them. Pure so the index math is unit-testable independent of the DOM.
 */
export function computeRowWindow(params: {
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  rowCount: number;
  overscan: number;
}): RowWindow {
  const { scrollTop, viewportHeight, rowHeight, rowCount, overscan } = params;

  if (rowCount <= 0 || rowHeight <= 0 || viewportHeight <= 0) {
    return { start: 0, end: rowCount > 0 ? rowCount : 0, topPad: 0, bottomPad: 0 };
  }

  const safeScrollTop = Math.max(0, scrollTop);
  const firstVisible = Math.floor(safeScrollTop / rowHeight);
  const visibleCount = Math.ceil(viewportHeight / rowHeight);

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(rowCount, firstVisible + visibleCount + overscan);

  return {
    start,
    end,
    topPad: start * rowHeight,
    bottomPad: Math.max(0, (rowCount - end) * rowHeight),
  };
}

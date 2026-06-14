import { describe, expect, it } from "vitest";

import {
  calculatePositionUnrealizedPnl,
  calculateRealizedPnl,
  calculateUnrealizedPnl,
  computeRowWindow,
  getPositionEntryPrice,
} from "@/components/backtest/positions-panel.utils";
import type { BacktestOrder } from "@/lib/backtest-store";

function createOrder(overrides: Partial<BacktestOrder>): BacktestOrder {
  return {
    id: 1,
    orderType: "Market",
    side: "Long",
    status: "Active",
    entryPrice: 100,
    filledPrice: null,
    positionSize: 1,
    stopLoss: null,
    takeProfit: null,
    exitPrice: null,
    pnl: null,
    orderedAt: "2024-01-01T00:00:00Z",
    filledAt: null,
    closedAt: null,
    ...overrides,
  };
}

describe("getPositionEntryPrice", () => {
  it("prefers the filled price and falls back to the ordered entry price", () => {
    expect(getPositionEntryPrice(createOrder({ filledPrice: 105, entryPrice: 100 }))).toBe(105);
    expect(getPositionEntryPrice(createOrder({ filledPrice: null, entryPrice: 100 }))).toBe(100);
  });
});

describe("calculatePositionUnrealizedPnl", () => {
  it("is positive when a long moves up and negative when it moves down", () => {
    const long = createOrder({ side: "Long", filledPrice: 100, positionSize: 2 });
    expect(calculatePositionUnrealizedPnl(long, 105)).toBeCloseTo(10, 6);
    expect(calculatePositionUnrealizedPnl(long, 95)).toBeCloseTo(-10, 6);
  });

  it("inverts the direction for shorts", () => {
    const short = createOrder({ side: "Short", filledPrice: 100, positionSize: 2 });
    expect(calculatePositionUnrealizedPnl(short, 95)).toBeCloseTo(10, 6);
    expect(calculatePositionUnrealizedPnl(short, 105)).toBeCloseTo(-10, 6);
  });

  it("returns 0 when the mark price is unavailable", () => {
    const long = createOrder({ side: "Long", filledPrice: 100, positionSize: 2 });
    expect(calculatePositionUnrealizedPnl(long, 0)).toBe(0);
    expect(calculatePositionUnrealizedPnl(long, Number.NaN)).toBe(0);
  });
});

describe("calculateUnrealizedPnl", () => {
  it("sums unrealized P&L across open positions", () => {
    const positions = [
      createOrder({ id: 1, side: "Long", filledPrice: 100, positionSize: 1 }),
      createOrder({ id: 2, side: "Short", filledPrice: 110, positionSize: 2 }),
    ];

    // Long: (105-100)*1 = 5; Short: (110-105)*2 = 10; total 15.
    expect(calculateUnrealizedPnl(positions, 105)).toBeCloseTo(15, 6);
    expect(calculateUnrealizedPnl([], 105)).toBe(0);
  });
});

describe("calculateRealizedPnl", () => {
  it("sums realized pnl and ignores null entries", () => {
    const closed = [
      createOrder({ id: 1, status: "Closed", pnl: 12.5 }),
      createOrder({ id: 2, status: "Closed", pnl: -4 }),
      createOrder({ id: 3, status: "Closed", pnl: null }),
    ];

    expect(calculateRealizedPnl(closed)).toBeCloseTo(8.5, 6);
    expect(calculateRealizedPnl([])).toBe(0);
  });
});

describe("computeRowWindow", () => {
  const base = { rowHeight: 64, overscan: 8 };

  it("renders the whole list when it has not been measured yet", () => {
    const window = computeRowWindow({ ...base, scrollTop: 0, viewportHeight: 0, rowCount: 500 });
    expect(window).toEqual({ start: 0, end: 500, topPad: 0, bottomPad: 0 });
  });

  it("returns an empty window for an empty list", () => {
    const window = computeRowWindow({ ...base, scrollTop: 0, viewportHeight: 600, rowCount: 0 });
    expect(window).toEqual({ start: 0, end: 0, topPad: 0, bottomPad: 0 });
  });

  it("includes only the visible slice plus overscan when scrolled", () => {
    // Scrolled 100 rows down (64px each), 600px tall viewport (~10 rows visible).
    const window = computeRowWindow({
      ...base,
      scrollTop: 100 * 64,
      viewportHeight: 600,
      rowCount: 1000,
    });

    // firstVisible = 100, overscan 8 → start 92; visible ceil(600/64)=10 → end 100+10+8=118.
    expect(window.start).toBe(92);
    expect(window.end).toBe(118);
    expect(window.topPad).toBe(92 * 64);
    expect(window.bottomPad).toBe((1000 - 118) * 64);
    // Padding + rendered rows reconstruct the full scroll height exactly.
    expect(window.topPad + (window.end - window.start) * 64 + window.bottomPad).toBe(1000 * 64);
  });

  it("clamps the window at the list bounds", () => {
    const window = computeRowWindow({
      ...base,
      scrollTop: 1_000_000,
      viewportHeight: 600,
      rowCount: 50,
    });

    expect(window.start).toBeGreaterThanOrEqual(0);
    expect(window.end).toBe(50);
    expect(window.bottomPad).toBe(0);
  });
});

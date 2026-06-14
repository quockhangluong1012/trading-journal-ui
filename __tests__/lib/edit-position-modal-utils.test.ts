import { describe, expect, it } from "vitest";

import {
  getExitReferencePrice,
  validateExitLevels,
} from "@/components/backtest/edit-position-modal.utils";
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

describe("getExitReferencePrice", () => {
  it("uses the fill price when filled, else the order price", () => {
    expect(getExitReferencePrice(createOrder({ filledPrice: 105, entryPrice: 100 }))).toBe(105);
    expect(getExitReferencePrice(createOrder({ filledPrice: null, entryPrice: 100 }))).toBe(100);
  });
});

describe("validateExitLevels", () => {
  it("treats empty inputs as cleared levels and stays valid", () => {
    const result = validateExitLevels(createOrder({}), "", "");
    expect(result.isValid).toBe(true);
    expect(result.takeProfitError).toBeNull();
    expect(result.stopLossError).toBeNull();
  });

  it("is valid with no order (modal closed)", () => {
    expect(validateExitLevels(null, "10", "5").isValid).toBe(true);
  });

  it("rejects non-positive or non-numeric prices", () => {
    const result = validateExitLevels(createOrder({}), "0", "abc");
    expect(result.takeProfitError).toMatch(/greater than 0/);
    expect(result.stopLossError).toMatch(/greater than 0/);
    expect(result.isValid).toBe(false);
  });

  describe("long positions (entry 100)", () => {
    const long = createOrder({ side: "Long", filledPrice: 100 });

    it("accepts TP above and SL below entry", () => {
      expect(validateExitLevels(long, "110", "90").isValid).toBe(true);
    });

    it("rejects TP at or below entry", () => {
      expect(validateExitLevels(long, "95", "").takeProfitError).toMatch(/above entry/);
      expect(validateExitLevels(long, "100", "").takeProfitError).toMatch(/above entry/);
    });

    it("rejects SL at or above entry", () => {
      expect(validateExitLevels(long, "", "105").stopLossError).toMatch(/below entry/);
      expect(validateExitLevels(long, "", "100").stopLossError).toMatch(/below entry/);
    });
  });

  describe("short positions (entry 100)", () => {
    const short = createOrder({ side: "Short", filledPrice: 100 });

    it("accepts TP below and SL above entry", () => {
      expect(validateExitLevels(short, "90", "110").isValid).toBe(true);
    });

    it("rejects TP at or above entry", () => {
      expect(validateExitLevels(short, "110", "").takeProfitError).toMatch(/below entry/);
    });

    it("rejects SL at or below entry", () => {
      expect(validateExitLevels(short, "", "90").stopLossError).toMatch(/above entry/);
    });
  });

  it("validates a pending limit order against its order price", () => {
    const pending = createOrder({ side: "Long", status: "Pending", filledPrice: null, entryPrice: 50 });
    expect(validateExitLevels(pending, "60", "40").isValid).toBe(true);
    expect(validateExitLevels(pending, "45", "40").takeProfitError).toMatch(/above entry/);
  });
});

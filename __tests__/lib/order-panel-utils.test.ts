import { describe, expect, it } from "vitest";

import { getMarketPriceState } from "@/components/backtest/order-panel.utils";

describe("getMarketPriceState", () => {
  it("marks the price as up when the current price increases", () => {
    const result = getMarketPriceState(1.085, 1.084);

    expect(result.direction).toBe("up");
    expect(result.change).toBeCloseTo(0.001, 8);
  });

  it("marks the price as down when the current price decreases", () => {
    const result = getMarketPriceState(1.0835, 1.084);

    expect(result.direction).toBe("down");
    expect(result.change).toBeCloseTo(-0.0005, 8);
  });

  it("falls back to a flat state when no previous price exists", () => {
    const result = getMarketPriceState(1.084, null);

    expect(result.direction).toBe("flat");
    expect(result.change).toBe(0);
  });

  it("falls back to a flat state when the current price is invalid", () => {
    const result = getMarketPriceState(0, 1.084);

    expect(result.direction).toBe("flat");
    expect(result.change).toBe(0);
  });
});
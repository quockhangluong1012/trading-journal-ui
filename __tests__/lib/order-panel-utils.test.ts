import { describe, expect, it } from "vitest";

import {
  calculateTicks,
  getAssetTickSize,
  getMarketPriceState,
  getPriceScaleTickSize,
  normalizeAssetSymbol,
} from "@/components/backtest/order-panel.utils";

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

describe("normalizeAssetSymbol", () => {
  it("uppercases and strips slashes and whitespace", () => {
    expect(normalizeAssetSymbol("eur/usd")).toBe("EURUSD");
    expect(normalizeAssetSymbol(" xau usd ")).toBe("XAUUSD");
    expect(normalizeAssetSymbol(null)).toBe("");
    expect(normalizeAssetSymbol(undefined)).toBe("");
  });
});

describe("getAssetTickSize", () => {
  it("uses explicit tick sizes for supported non-forex instruments", () => {
    expect(getAssetTickSize("XAUUSD")).toBe(0.01);
    expect(getAssetTickSize("xau/usd")).toBe(0.01);
    expect(getAssetTickSize("NQ")).toBe(0.25);
    expect(getAssetTickSize("ES")).toBe(0.25);
    expect(getAssetTickSize("BTCUSDT")).toBe(0.1);
    expect(getAssetTickSize("ETHUSD")).toBe(0.01);
  });

  it("derives forex pip size from the quote currency", () => {
    expect(getAssetTickSize("EURUSD")).toBe(0.0001);
    expect(getAssetTickSize("GBPUSD")).toBe(0.0001);
    expect(getAssetTickSize("USDJPY")).toBe(0.01);
    expect(getAssetTickSize("EURJPY")).toBe(0.01);
  });

  it("falls back to a price-scale tick size for unknown symbols", () => {
    expect(getAssetTickSize("MYSTERY", 24000)).toBe(1);
    expect(getAssetTickSize("MYSTERY", 1500)).toBe(0.1);
    expect(getAssetTickSize("MYSTERY", 250)).toBe(0.01);
    expect(getAssetTickSize("MYSTERY", 3)).toBe(0.001);
    expect(getAssetTickSize("MYSTERY", 0.5)).toBe(0.0001);
    expect(getAssetTickSize("MYSTERY")).toBe(0.0001);
  });
});

describe("getPriceScaleTickSize", () => {
  it("returns a default tick size when the price is invalid", () => {
    expect(getPriceScaleTickSize(0)).toBe(0.0001);
    expect(getPriceScaleTickSize(null)).toBe(0.0001);
    expect(getPriceScaleTickSize(Number.NaN)).toBe(0.0001);
  });
});

describe("calculateTicks", () => {
  it("counts ticks between a target and the price using the tick size", () => {
    // Gold: a $5 stop distance is 500 ticks at 0.01, not 50,000 as the old *10000 math claimed.
    expect(calculateTicks(2005, 2000, 0.01)).toBeCloseTo(500, 6);
    // Forex pip count is preserved for 4-decimal majors.
    expect(calculateTicks(1.086, 1.085, 0.0001)).toBeCloseTo(10, 6);
  });

  it("returns 0 for invalid inputs", () => {
    expect(calculateTicks(Number.NaN, 1, 0.01)).toBe(0);
    expect(calculateTicks(1, Number.NaN, 0.01)).toBe(0);
    expect(calculateTicks(1, 1, 0)).toBe(0);
    expect(calculateTicks(1, 1, -0.01)).toBe(0);
  });
});
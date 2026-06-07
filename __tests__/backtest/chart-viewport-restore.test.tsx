import { describe, it, expect } from "vitest";

import {
  resolveFollowScrollRange,
  resolveViewportFollowAction,
} from "@/components/backtest/tradingview-platform";

/**
 * Test Suite: Chart Viewport Follow Logic
 *
 * The chart is built on lightweight-charts. After each candle update the
 * data-push effect decides whether to re-fit to the latest candles, snap to the
 * live edge, or leave the viewport alone. That decision is extracted into the
 * pure `resolveViewportFollowAction` helper so it can be asserted directly —
 * the previous suite mocked klinecharts (a library this chart no longer uses)
 * and never rendered anything, so its assertions could never run.
 */
describe("Chart viewport follow logic", () => {
  it("fits to the latest candles when a resumed session first loads", () => {
    // No previously-rendered candles → first ingest of the resumed series.
    expect(
      resolveViewportFollowAction({
        previousCandleCount: 0,
        candleCount: 100,
        mode: "reset",
        isViewingHistory: false,
      }),
    ).toBe("fit");
  });

  it("fits to the single candle when only one exists", () => {
    expect(
      resolveViewportFollowAction({
        previousCandleCount: 0,
        candleCount: 1,
        mode: "reset",
        isViewingHistory: false,
      }),
    ).toBe("fit");
  });

  it("re-fits after a timeframe switch reloads the whole series", () => {
    // A timeframe switch replaces the series → a full "reset", even though the
    // new timeframe has fewer candles covering the same time range.
    expect(
      resolveViewportFollowAction({
        previousCandleCount: 100,
        candleCount: 20,
        mode: "reset",
        isViewingHistory: false,
      }),
    ).toBe("fit");
  });

  it("snaps to the live edge when replay appends the next candle", () => {
    expect(
      resolveViewportFollowAction({
        previousCandleCount: 100,
        candleCount: 101,
        mode: "update",
        isViewingHistory: false,
      }),
    ).toBe("scroll");
  });

  it("does not yank the viewport while the user is reviewing history", () => {
    expect(
      resolveViewportFollowAction({
        previousCandleCount: 100,
        candleCount: 101,
        mode: "update",
        isViewingHistory: true,
      }),
    ).toBe("none");
  });

  it("re-fits when many candles arrive at once (large jump)", () => {
    expect(
      resolveViewportFollowAction({
        previousCandleCount: 100,
        candleCount: 110,
        mode: "update",
        isViewingHistory: false,
      }),
    ).toBe("fit");
  });

  it("leaves the viewport untouched when the candle set is unchanged", () => {
    expect(
      resolveViewportFollowAction({
        previousCandleCount: 100,
        candleCount: 100,
        mode: "none",
        isViewingHistory: false,
      }),
    ).toBe("none");
  });
});

/**
 * Test Suite: Follow-the-live-edge scroll
 *
 * Once `resolveViewportFollowAction` says "scroll", `resolveFollowScrollRange`
 * decides whether the time scale actually moves. Hitting Run should keep the
 * chart still while new candles fill the empty room on the right, and only
 * begin following once the newest bar would cross the right edge.
 */
describe("Follow-the-live-edge scroll", () => {
  it("stays put while the newest candle still fits in the right-hand gap", () => {
    // fitLatestCandles leaves ~6 bars of empty space (to = count + 6). The first
    // appended candle (last index 100) is well within {from: -20, to: 106}.
    expect(
      resolveFollowScrollRange({
        visibleLogicalRange: { from: -20, to: 106 },
        candleCount: 101,
      }),
    ).toBeNull();
  });

  it("does not move when the newest candle sits exactly on the right edge", () => {
    expect(
      resolveFollowScrollRange({
        visibleLogicalRange: { from: 0, to: 119 },
        candleCount: 120,
      }),
    ).toBeNull();
  });

  it("shifts by the overflow once the newest candle crosses the right edge", () => {
    // Last index 120 has moved one bar past the right edge (to: 119) → shift the
    // whole window right by 1 so the newest bar lands back on the edge.
    expect(
      resolveFollowScrollRange({
        visibleLogicalRange: { from: 0, to: 119 },
        candleCount: 121,
      }),
    ).toEqual({ from: 1, to: 120 });
  });

  it("shifts by the fractional overflow so the newest bar lands on the edge", () => {
    expect(
      resolveFollowScrollRange({
        visibleLogicalRange: { from: 10.5, to: 130.5 },
        candleCount: 132, // last index 131 → overflow 0.5
      }),
    ).toEqual({ from: 11, to: 131 });
  });

  it("returns null when there is no range or no candles yet", () => {
    expect(resolveFollowScrollRange({ visibleLogicalRange: null, candleCount: 100 })).toBeNull();
    expect(
      resolveFollowScrollRange({ visibleLogicalRange: { from: 0, to: 10 }, candleCount: 0 }),
    ).toBeNull();
  });
});

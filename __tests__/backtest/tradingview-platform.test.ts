import { describe, expect, it, vi } from "vitest";

import {
  CHART_PRICE_FORMAT,
  clampReplayControlsPosition,
  clampFloatingDrawingToolbarPosition,
  createChartDrawing,
  createChartDrawingDraft,
  calculateDrawingAnchorDelta,
  applyChartDrawingStyle,
  applyChartDrawingTemplate,
  buildIncrementalChartData,
  buildCurrentPriceOrderAction,
  buildHoveredCandlePriceReadout,
  buildHoveredPriceOrderAction,
  buildQuickOrderDraft,
  buildQuickOrderTicketRequest,
  buildPositionedQuickOrderDraft,
  buildOrderMarkerOverlays,
  buildOrderLevelOverlays,
  buildOrderLevelUpdateRequest,
  buildOrderPriceLines,
  buildTradingSessionOverlays,
  buildTradingViewWidgetOptions,
  calculateReplayProgress,
  createViewportOverlayScheduler,
  formatDrawingMetricLabel,
  getChartDrawingStyle,
  getDefaultFloatingDrawingToolbarPosition,
  getDefaultReplayControlsPosition,
  completeChartDrawingDraft,
  estimateDrawingTimeFromLogical,
  formatChartAxisPrice,
  isPointerWithinClientBounds,
  isTwoPointDrawingTool,
  mapBacktestCandlesToChartData,
  moveChartDrawing,
  positionChartDrawing,
  positionOrderLevelOverlays,
  positionTradingSessionOverlays,
  replaceChartDrawingPoint,
  resolveDrawingAnchorFromCoordinate,
  resolveTradingViewSymbol,
  snapDrawingAnchorToCandles,
  toChartTimestamp,
  toTradingViewInterval,
  updateQuickOrderDraftLevel,
  validateOrderLevelPrice,
} from "@/components/backtest/tradingview-platform";
import { LineStyle, type UTCTimestamp } from "lightweight-charts";
import type { BacktestOrder } from "@/lib/backtest-store";

function createOrder(overrides: Partial<BacktestOrder>): BacktestOrder {
  return {
    id: 1,
    orderType: "Limit",
    side: "Long",
    status: "Pending",
    entryPrice: 1.0875,
    filledPrice: null,
    positionSize: 2,
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

describe("TradingView platform helpers", () => {
  it("maps backtest timeframes to TradingView widget intervals", () => {
    expect(toTradingViewInterval("M1")).toBe("1");
    expect(toTradingViewInterval("M5")).toBe("5");
    expect(toTradingViewInterval("M15")).toBe("15");
    expect(toTradingViewInterval("H1")).toBe("60");
    expect(toTradingViewInterval("H4")).toBe("240");
    expect(toTradingViewInterval("D1")).toBe("D");
  });

  it("resolves common backtest symbols to TradingView markets", () => {
    expect(resolveTradingViewSymbol("EURUSD")).toBe("OANDA:EURUSD");
    expect(resolveTradingViewSymbol("eur/usd")).toBe("OANDA:EURUSD");
    expect(resolveTradingViewSymbol("XAUUSD")).toBe("OANDA:XAUUSD");
    expect(resolveTradingViewSymbol("BTCUSDT")).toBe("BINANCE:BTCUSDT");
    expect(resolveTradingViewSymbol("NQ")).toBe("CME_MINI:NQ1!");
    expect(resolveTradingViewSymbol("OANDA:GBPUSD")).toBe("OANDA:GBPUSD");
    expect(resolveTradingViewSymbol("CUSTOM_ASSET")).toBe("CUSTOM_ASSET");
  });

  it("keeps the TradingView top toolbar and drawing toolbar visible", () => {
    const options = buildTradingViewWidgetOptions({
      asset: "EURUSD",
      timeframe: "M15",
      theme: "dark",
    });

    expect(options.symbol).toBe("OANDA:EURUSD");
    expect(options.interval).toBe("15");
    expect(options.theme).toBe("dark");
    expect(options.autosize).toBe(true);
    expect(options.hide_top_toolbar).toBe(false);
    expect(options.hide_side_toolbar).toBe(false);
    expect(options.allow_symbol_change).toBe(true);
    expect(options.save_image).toBe(true);
  });

  it("coalesces viewport overlay sync into the next animation frame", () => {
    const callbacks: FrameRequestCallback[] = [];
    const cancelledFrames: number[] = [];
    const sync = vi.fn();
    const transition = vi.fn((callback: () => void) => callback());
    const scheduler = createViewportOverlayScheduler({
      requestFrame: (callback) => {
        callbacks.push(callback);
        return callbacks.length;
      },
      cancelFrame: (frameId) => {
        cancelledFrames.push(frameId);
      },
      sync,
      transition,
    });

    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();

    expect(callbacks).toHaveLength(1);
    expect(cancelledFrames).toEqual([]);
    expect(sync).not.toHaveBeenCalled();

    callbacks[0](16);

    expect(transition).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledTimes(1);

    scheduler.schedule();

    expect(callbacks).toHaveLength(2);
  });

  it("formats chart axis prices with up to five decimal places", () => {
    expect(CHART_PRICE_FORMAT).toMatchObject({
      type: "custom",
      minMove: 0.00001,
    });
    expect(CHART_PRICE_FORMAT.formatter(1.087406)).toBe("1.08741");
    expect(formatChartAxisPrice(23825.4)).toBe("23,825.4");
    expect(formatChartAxisPrice(1.2)).toBe("1.2");
    expect(formatChartAxisPrice(undefined)).toBe("--");
  });

  it("maps backtest candles to chronological chart data and keeps the newest duplicate", () => {
    const result = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:05:00Z", open: 102, high: 106, low: 101, close: 104, volume: 1200 },
      { timestamp: "2024-01-01T00:00:00Z", open: 100, high: 103, low: 99, close: 101, volume: 900 },
      { timestamp: "2024-01-01T00:05:00Z", open: 104, high: 109, low: 103, close: 108, volume: 1500 },
      { timestamp: "invalid", open: 1, high: 1, low: 1, close: 1, volume: 1 },
    ]);

    expect(result.candles).toEqual([
      {
        time: toChartTimestamp("2024-01-01T00:00:00Z"),
        open: 100,
        high: 103,
        low: 99,
        close: 101,
      },
      {
        time: toChartTimestamp("2024-01-01T00:05:00Z"),
        open: 104,
        high: 109,
        low: 103,
        close: 108,
      },
    ]);

    expect(result.volumes).toHaveLength(2);
    expect(result.volumes[1]).toMatchObject({
      time: toChartTimestamp("2024-01-01T00:05:00Z"),
      value: 1500,
    });
  });

  it("builds an incremental chart update when replay appends the next candle", () => {
    const firstBatch = [
      { timestamp: "2024-01-01T00:00:00Z", open: 100, high: 103, low: 99, close: 101, volume: 900 },
      { timestamp: "2024-01-01T00:05:00Z", open: 101, high: 104, low: 100, close: 103, volume: 1200 },
    ];
    const initial = buildIncrementalChartData(firstBatch);

    const appended = buildIncrementalChartData([
      ...firstBatch,
      { timestamp: "2024-01-01T00:10:00Z", open: 103, high: 107, low: 102, close: 106, volume: 1500 },
    ], initial);

    expect(appended.mode).toBe("update");
    expect(appended.sourceLength).toBe(3);
    expect(appended.data.candles).toHaveLength(3);
    expect(appended.data.candles[0]).toBe(initial.data.candles[0]);
    expect(appended.data.candles[1]).toBe(initial.data.candles[1]);
    expect(appended.updatedCandle).toEqual({
      time: toChartTimestamp("2024-01-01T00:10:00Z"),
      open: 103,
      high: 107,
      low: 102,
      close: 106,
    });
    expect(appended.updatedVolume).toMatchObject({
      time: toChartTimestamp("2024-01-01T00:10:00Z"),
      value: 1500,
    });
  });

  it("falls back to a full chart reset when replay candles are replaced or reordered", () => {
    const initial = buildIncrementalChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 100, high: 103, low: 99, close: 101, volume: 900 },
      { timestamp: "2024-01-01T00:05:00Z", open: 101, high: 104, low: 100, close: 103, volume: 1200 },
    ]);

    const reset = buildIncrementalChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 100, high: 103, low: 99, close: 101, volume: 900 },
      { timestamp: "2023-12-31T23:55:00Z", open: 98, high: 100, low: 97, close: 99, volume: 700 },
      { timestamp: "2024-01-01T00:05:00Z", open: 101, high: 104, low: 100, close: 103, volume: 1200 },
    ], initial);

    expect(reset.mode).toBe("reset");
    expect(reset.data.candles.map((candle) => candle.time)).toEqual([
      toChartTimestamp("2023-12-31T23:55:00Z"),
      toChartTimestamp("2024-01-01T00:00:00Z"),
      toChartTimestamp("2024-01-01T00:05:00Z"),
    ]);
    expect(reset.updatedCandle).toBeUndefined();
  });

  it("calculates bounded replay progress from session dates", () => {
    expect(calculateReplayProgress({
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-01-01T01:00:00Z",
      currentTimestamp: "2024-01-01T00:30:00Z",
    })).toBe(50);

    expect(calculateReplayProgress({
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-01-01T01:00:00Z",
      currentTimestamp: "2024-01-01T02:00:00Z",
    })).toBe(100);

    expect(calculateReplayProgress({
      startDate: "2024-01-01T00:00:00Z",
      endDate: null,
      currentTimestamp: "2024-01-01T00:30:00Z",
    })).toBeNull();
  });

  it("defaults replay controls above the chart time axis", () => {
    expect(getDefaultReplayControlsPosition({
      containerWidth: 1200,
      containerHeight: 500,
      controlsWidth: 740,
      controlsHeight: 56,
    })).toEqual({
      x: 230,
      y: 396,
    });
  });

  it("positions the current-price order action on the price scale", () => {
    expect(buildCurrentPriceOrderAction({
      price: 24394.1,
      y: 118.4,
      containerHeight: 520,
    })).toEqual({
      price: 24394.1,
      label: "24,394.1",
      y: 118.4,
    });

    expect(buildCurrentPriceOrderAction({
      price: 24394.1,
      y: -20,
      containerHeight: 520,
    })).toEqual({
      price: 24394.1,
      label: "24,394.1",
      y: 18,
    });
  });

  it("positions the order action on the hovered chart price", () => {
    const hoveredAnchor = {
      time: 1704067200 as UTCTimestamp,
      logical: 4,
      price: 1.04449,
      x: 720,
      y: 188,
    };

    expect(buildHoveredPriceOrderAction({
      anchor: hoveredAnchor,
      containerHeight: 520,
      priceToCoordinate: (price) => (price === hoveredAnchor.price ? 132.6 : null),
    })).toEqual({
      price: hoveredAnchor.price,
      label: "1.04449",
      y: 132.6,
    });

    expect(buildHoveredPriceOrderAction({
      anchor: null,
      containerHeight: 520,
      priceToCoordinate: () => 132.6,
    })).toBeNull();
  });

  it("keeps the hovered order action active when the pointer enters its button area", () => {
    const actionBounds = {
      left: 944,
      right: 1028,
      top: 118,
      bottom: 146,
    };

    expect(isPointerWithinClientBounds({
      clientX: 956,
      clientY: 130,
      bounds: actionBounds,
    })).toBe(true);

    expect(isPointerWithinClientBounds({
      clientX: 940,
      clientY: 130,
      bounds: actionBounds,
      padding: 4,
    })).toBe(true);

    expect(isPointerWithinClientBounds({
      clientX: 936,
      clientY: 130,
      bounds: actionBounds,
      padding: 2,
    })).toBe(false);
  });

  it("builds the hovered candle OHLC readout from the chart logical index", () => {
    const chartCandles = [
      {
        time: 1704067200 as UTCTimestamp,
        open: 1.08123,
        high: 1.08456,
        low: 1.08012,
        close: 1.08345,
      },
      {
        time: 1704067500 as UTCTimestamp,
        open: 1.08345,
        high: 1.08567,
        low: 1.08111,
        close: 1.08222,
      },
    ];

    expect(buildHoveredCandlePriceReadout({
      anchor: {
        time: 1704067480 as UTCTimestamp,
        logical: 1.2,
        price: 1.0825,
        x: 640,
        y: 220,
      },
      chartCandles,
    })).toEqual({
      time: 1704067500,
      direction: "down",
      open: "1.08345",
      high: "1.08567",
      low: "1.08111",
      close: "1.08222",
    });

    expect(buildHoveredCandlePriceReadout({
      anchor: {
        time: 1704068100 as UTCTimestamp,
        logical: 2.4,
        price: 1.09,
        x: 760,
        y: 120,
      },
      chartCandles,
    })).toBeNull();
  });

  it("creates a TradingView-style quick order draft with side-aware TP and SL levels", () => {
    expect(buildQuickOrderDraft({
      entryPrice: 1.1,
      currentPrice: 1.12,
      chartCandles: [
        { time: 1704067200 as UTCTimestamp, open: 1.09, high: 1.105, low: 1.085, close: 1.1 },
        { time: 1704067500 as UTCTimestamp, open: 1.1, high: 1.113, low: 1.096, close: 1.112 },
      ],
    })).toMatchObject({
      side: "Long",
      entryPrice: 1.1,
      takeProfit: 1.117,
      stopLoss: 1.083,
    });

    expect(buildQuickOrderDraft({
      entryPrice: 1.14,
      currentPrice: 1.12,
      chartCandles: [
        { time: 1704067200 as UTCTimestamp, open: 1.12, high: 1.145, low: 1.115, close: 1.13 },
      ],
    })).toMatchObject({
      side: "Short",
      entryPrice: 1.14,
      takeProfit: 1.11,
      stopLoss: 1.17,
    });
  });

  it("positions and validates quick order levels for chart rendering", () => {
    const draft = {
      side: "Long" as const,
      entryPrice: 1.1,
      takeProfit: 1.13,
      stopLoss: 1.08,
    };

    expect(buildPositionedQuickOrderDraft({
      draft,
      containerHeight: 520,
      priceToCoordinate: (price) => ({
        1.13: 110,
        1.1: 240,
        1.08: 360,
      }[price] ?? null),
    })).toMatchObject({
      side: "Long",
      entryY: 240,
      takeProfitY: 110,
      stopLossY: 360,
      rewardRiskRatio: 1.5,
      validationError: null,
    });

    expect(buildPositionedQuickOrderDraft({
      draft: { ...draft, takeProfit: 1.09 },
      containerHeight: 520,
      priceToCoordinate: (price) => ({
        1.09: 280,
        1.1: 240,
        1.08: 360,
      }[price] ?? null),
    })?.validationError).toBe("Long take profit must be above entry.");
  });

  it("updates only the dragged quick order level and maps it into an order ticket request", () => {
    const draft = {
      side: "Short" as const,
      entryPrice: 1.14,
      takeProfit: 1.11,
      stopLoss: 1.17,
    };

    expect(updateQuickOrderDraftLevel(draft, "takeProfit", 1.105)).toEqual({
      ...draft,
      takeProfit: 1.105,
    });

    expect(buildQuickOrderTicketRequest({
      ...draft,
      takeProfit: 1.105,
    })).toEqual({
      side: "Short",
      orderType: "Limit",
      entryPrice: 1.14,
      takeProfit: 1.105,
      stopLoss: 1.17,
    });
  });

  it("clamps dropped replay controls inside the chart and clear of the time axis", () => {
    expect(clampReplayControlsPosition(
      { x: 1100, y: 470 },
      {
        containerWidth: 1200,
        containerHeight: 500,
        controlsWidth: 740,
        controlsHeight: 56,
      },
    )).toEqual({
      x: 448,
      y: 396,
    });

    expect(clampReplayControlsPosition(
      { x: -80, y: -40 },
      {
        containerWidth: 1200,
        containerHeight: 500,
        controlsWidth: 740,
        controlsHeight: 56,
      },
    )).toEqual({
      x: 12,
      y: 12,
    });
  });

  it("positions the selected drawing quick editor near the object and clamps drag inside the chart", () => {
    const drawingBounds = {
      left: 120,
      top: 140,
      right: 420,
      bottom: 260,
    };

    expect(getDefaultFloatingDrawingToolbarPosition({
      drawingBounds,
      containerWidth: 900,
      containerHeight: 520,
      toolbarWidth: 360,
      toolbarHeight: 48,
    })).toEqual({
      x: 90,
      y: 78,
    });

    expect(getDefaultFloatingDrawingToolbarPosition({
      drawingBounds: { ...drawingBounds, top: 18, bottom: 118 },
      containerWidth: 900,
      containerHeight: 520,
      toolbarWidth: 360,
      toolbarHeight: 48,
    })).toEqual({
      x: 90,
      y: 132,
    });

    expect(clampFloatingDrawingToolbarPosition(
      { x: -240, y: 900 },
      {
        containerWidth: 900,
        containerHeight: 520,
        toolbarWidth: 360,
        toolbarHeight: 48,
      },
    )).toEqual({
      x: 12,
      y: 460,
    });
  });

  it("builds overlapping ICT trading session boxes from loaded chart candles", () => {
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:15:00Z", open: 100, high: 104, low: 96, close: 101, volume: 900 },
      { timestamp: "2024-01-01T08:00:00Z", open: 101, high: 110, low: 90, close: 107, volume: 1200 },
      { timestamp: "2024-01-01T13:00:00Z", open: 107, high: 120, low: 92, close: 113, volume: 1500 },
      { timestamp: "2024-01-01T17:00:00Z", open: 113, high: 118, low: 88, close: 109, volume: 1300 },
      { timestamp: "2024-01-01T22:00:00Z", open: 109, high: 112, low: 106, close: 108, volume: 700 },
    ]).candles;

    const sessions = buildTradingSessionOverlays(chartCandles);

    expect(sessions).toEqual([
      expect.objectContaining({
        id: `tokyo-${toChartTimestamp("2024-01-01T00:00:00Z")}`,
        label: "Tokyo",
        startTime: toChartTimestamp("2024-01-01T00:00:00Z"),
        endTime: toChartTimestamp("2024-01-01T09:00:00Z"),
        high: 110,
        low: 90,
      }),
      expect.objectContaining({
        id: `london-${toChartTimestamp("2024-01-01T07:00:00Z")}`,
        label: "London",
        startTime: toChartTimestamp("2024-01-01T07:00:00Z"),
        endTime: toChartTimestamp("2024-01-01T16:00:00Z"),
        high: 120,
        low: 90,
      }),
      expect.objectContaining({
        id: `new-york-${toChartTimestamp("2024-01-01T12:00:00Z")}`,
        label: "New York",
        startTime: toChartTimestamp("2024-01-01T12:00:00Z"),
        endTime: toChartTimestamp("2024-01-01T21:00:00Z"),
        high: 120,
        low: 88,
      }),
    ]);
  });

  it("builds a separate session box per UTC day across multi-day candle ranges", () => {
    const chartCandles = mapBacktestCandlesToChartData([
      // Day 1 — London session window (07:00–16:00 UTC)
      { timestamp: "2024-01-01T08:00:00Z", open: 100, high: 110, low: 90, close: 105, volume: 900 },
      { timestamp: "2024-01-01T13:00:00Z", open: 105, high: 115, low: 95, close: 108, volume: 900 },
      // Day 2 — London session window
      { timestamp: "2024-01-02T09:00:00Z", open: 108, high: 130, low: 100, close: 120, volume: 900 },
    ]).candles;

    const londonSessions = buildTradingSessionOverlays(chartCandles).filter(
      (session) => session.sessionId === "london",
    );

    expect(londonSessions).toEqual([
      expect.objectContaining({
        id: `london-${toChartTimestamp("2024-01-01T07:00:00Z")}`,
        startTime: toChartTimestamp("2024-01-01T07:00:00Z"),
        endTime: toChartTimestamp("2024-01-01T16:00:00Z"),
        high: 115,
        low: 90,
      }),
      expect.objectContaining({
        id: `london-${toChartTimestamp("2024-01-02T07:00:00Z")}`,
        startTime: toChartTimestamp("2024-01-02T07:00:00Z"),
        endTime: toChartTimestamp("2024-01-02T16:00:00Z"),
        high: 130,
        low: 100,
      }),
    ]);
  });

  it("projects ICT trading sessions to chart pixels with bounded labels", () => {
    const sessions = buildTradingSessionOverlays(mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T17:00:00Z", open: 107, high: 120, low: 92, close: 113, volume: 1500 },
    ]).candles);

    const positioned = positionTradingSessionOverlays({
      sessions,
      width: 800,
      height: 400,
      timeToCoordinate: (time) => {
        if (time === toChartTimestamp("2024-01-01T12:00:00Z")) return 120;
        if (time === toChartTimestamp("2024-01-01T21:00:00Z")) return 420;
        return null;
      },
      priceToCoordinate: (price) => {
        if (price === 120) return 6;
        if (price === 92) return 180;
        return null;
      },
    });

    expect(positioned).toEqual([
      expect.objectContaining({
        label: "New York",
        x: 120,
        y: 6,
        width: 300,
        height: 174,
        labelX: 128,
        labelY: 12,
      }),
    ]);
  });

  it("builds price-axis markers without drawing order lines for pending and triggered orders", () => {
    const pendingOrder = createOrder({
      id: 10,
      status: "Pending",
      side: "Short",
      entryPrice: 1.091,
      stopLoss: 1.094,
      takeProfit: 1.083,
    });
    const activePosition = createOrder({
      id: 11,
      status: "Active",
      side: "Long",
      entryPrice: 1.0875,
      filledPrice: 1.0877,
      stopLoss: 1.084,
      takeProfit: 1.096,
      filledAt: "2024-01-01T00:15:00Z",
    });

    const lines = buildOrderPriceLines({
      pendingOrders: [pendingOrder],
      activePositions: [activePosition],
    });

    expect(lines).toEqual([
      expect.objectContaining({
        id: "active-entry-11",
        price: 1.0877,
        lineStyle: LineStyle.Solid,
        lineVisible: false,
        axisLabelVisible: true,
        title: "",
      }),
      expect.objectContaining({
        id: "active-stop-11",
        price: 1.084,
        lineStyle: LineStyle.Dashed,
        lineVisible: false,
        axisLabelVisible: true,
        title: "",
      }),
      expect.objectContaining({
        id: "active-target-11",
        price: 1.096,
        lineStyle: LineStyle.Dashed,
        lineVisible: false,
        axisLabelVisible: true,
        title: "",
      }),
      expect.objectContaining({
        id: "pending-entry-10",
        price: 1.091,
        lineStyle: LineStyle.Dashed,
        lineVisible: false,
        axisLabelVisible: true,
        title: "",
      }),
      expect.objectContaining({
        id: "pending-stop-10",
        price: 1.094,
        lineStyle: LineStyle.Dashed,
        lineVisible: false,
        axisLabelVisible: true,
        title: "",
      }),
      expect.objectContaining({
        id: "pending-target-10",
        price: 1.083,
        lineStyle: LineStyle.Dashed,
        lineVisible: false,
        axisLabelVisible: true,
        title: "",
      }),
    ]);
  });

  it("builds TradingView-style active order levels with live and projected P&L", () => {
    const activePosition = createOrder({
      id: 12,
      status: "Active",
      side: "Long",
      filledPrice: 100,
      positionSize: 2,
      stopLoss: 95,
      takeProfit: 110,
    });

    expect(buildOrderLevelOverlays({
      activePositions: [activePosition],
      pendingOrders: [],
      currentPrice: 104,
    })).toEqual([
      expect.objectContaining({
        id: "active-entry-12",
        level: "entry",
        price: 100,
        pnl: 8,
        isDraggable: false,
      }),
      expect.objectContaining({
        id: "active-target-12",
        level: "takeProfit",
        price: 110,
        pnl: 20,
        isDraggable: true,
      }),
      expect.objectContaining({
        id: "active-stop-12",
        level: "stopLoss",
        price: 95,
        pnl: -10,
        isDraggable: true,
      }),
    ]);
  });

  it("calculates short P&L and positions only visible order levels", () => {
    const activePosition = createOrder({
      id: 13,
      status: "Active",
      side: "Short",
      filledPrice: 200,
      positionSize: 3,
      stopLoss: 210,
      takeProfit: 180,
    });
    const levels = buildOrderLevelOverlays({
      activePositions: [activePosition],
      pendingOrders: [],
      currentPrice: 190,
    });

    expect(levels.find((level) => level.level === "entry")?.pnl).toBe(30);
    expect(positionOrderLevelOverlays({
      levels,
      containerHeight: 400,
      priceToCoordinate: (price) => {
        if (price === 200) return 120;
        if (price === 180) return 240;
        return 460;
      },
    })).toEqual([
      expect.objectContaining({ id: "active-entry-13", y: 120 }),
      expect.objectContaining({ id: "active-target-13", y: 240 }),
    ]);
  });

  it("rejects TP and SL moves that cross the order entry", () => {
    const longOrder = createOrder({
      status: "Active",
      side: "Long",
      filledPrice: 100,
      stopLoss: 95,
      takeProfit: 110,
    });
    const shortOrder = createOrder({
      status: "Active",
      side: "Short",
      filledPrice: 100,
      stopLoss: 105,
      takeProfit: 90,
    });

    expect(validateOrderLevelPrice(longOrder, "takeProfit", 99)).toBeTruthy();
    expect(validateOrderLevelPrice(longOrder, "stopLoss", 101)).toBeTruthy();
    expect(validateOrderLevelPrice(shortOrder, "takeProfit", 101)).toBeTruthy();
    expect(validateOrderLevelPrice(shortOrder, "stopLoss", 99)).toBeTruthy();
    expect(validateOrderLevelPrice(longOrder, "takeProfit", 115)).toBeNull();
    expect(validateOrderLevelPrice(shortOrder, "stopLoss", 108)).toBeNull();
  });

  it("preserves the untouched protection level when building a drag update", () => {
    const order = createOrder({
      id: 14,
      status: "Active",
      stopLoss: 95,
      takeProfit: 110,
    });

    expect(buildOrderLevelUpdateRequest(order, "takeProfit", 115)).toEqual({
      orderId: 14,
      stopLoss: 95,
      takeProfit: 115,
    });
    expect(buildOrderLevelUpdateRequest(order, "stopLoss", 97)).toEqual({
      orderId: 14,
      stopLoss: 97,
      takeProfit: 110,
    });
  });

  it("positions entry markers at the bottom of the placed order candle", () => {
    const activePosition = createOrder({
      id: 21,
      status: "Active",
      side: "Short",
      positionSize: 3,
      entryPrice: 1.0875,
      filledPrice: 1.0874,
      orderedAt: "2024-01-01T00:00:00Z",
      filledAt: "2024-01-01T00:17:00Z",
    });
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 1.088, high: 1.089, low: 1.085, close: 1.087, volume: 1000 },
      { timestamp: "2024-01-01T00:15:00Z", open: 1.087, high: 1.09, low: 1.086, close: 1.0874, volume: 1200 },
      { timestamp: "2024-01-01T00:30:00Z", open: 1.0874, high: 1.091, low: 1.087, close: 1.09, volume: 1100 },
    ]).candles;

    const markers = buildOrderMarkerOverlays({
      activePositions: [activePosition],
      closedPositions: [],
      chartTimes: chartCandles.map((candle) => candle.time),
      chartCandles,
    });

    expect(markers).toEqual([
      expect.objectContaining({
        id: "active-entry-21",
        time: toChartTimestamp("2024-01-01T00:00:00Z"),
        price: 1.0874,
        anchorPrice: 1.085,
        side: "Short",
        text: "Short 3 @ 1.08740",
      }),
    ]);
  });

  it("falls back to the fill candle when the placed order timestamp is outside the loaded chart range", () => {
    const activePosition = createOrder({
      id: 22,
      status: "Active",
      side: "Long",
      positionSize: 1,
      entryPrice: 1.16965,
      filledPrice: 1.16965,
      orderedAt: "0001-01-01T00:00:00Z",
      filledAt: "2024-01-01T00:15:00Z",
    });
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 1.168, high: 1.169, low: 1.167, close: 1.1685, volume: 1000 },
      { timestamp: "2024-01-01T00:15:00Z", open: 1.1685, high: 1.1705, low: 1.1682, close: 1.16965, volume: 1200 },
      { timestamp: "2024-01-01T00:30:00Z", open: 1.16965, high: 1.171, low: 1.169, close: 1.1702, volume: 1100 },
    ]).candles;

    const markers = buildOrderMarkerOverlays({
      activePositions: [activePosition],
      closedPositions: [],
      chartCandles,
    });

    expect(markers).toEqual([
      expect.objectContaining({
        id: "active-entry-22",
        time: toChartTimestamp("2024-01-01T00:15:00Z"),
        price: 1.16965,
        anchorPrice: 1.1682,
        side: "Long",
        text: "Long 1 @ 1.16965",
      }),
    ]);
  });

  it("keeps an entry marker visible on the current replay candle when order timestamps are unusable", () => {
    const activePosition = createOrder({
      id: 23,
      status: "Active",
      side: "Long",
      positionSize: 1,
      entryPrice: 1.16965,
      filledPrice: 1.16965,
      orderedAt: "0001-01-01T00:00:00Z",
      filledAt: null,
    });
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 1.168, high: 1.169, low: 1.167, close: 1.1685, volume: 1000 },
      { timestamp: "2024-01-01T00:15:00Z", open: 1.1685, high: 1.1705, low: 1.1682, close: 1.16965, volume: 1200 },
    ]).candles;

    const markers = buildOrderMarkerOverlays({
      activePositions: [activePosition],
      closedPositions: [],
      chartCandles,
      placementFallbackTimestamp: "2024-01-01T00:15:00Z",
    });

    expect(markers).toEqual([
      expect.objectContaining({
        id: "active-entry-23",
        time: toChartTimestamp("2024-01-01T00:15:00Z"),
        anchorPrice: 1.1682,
      }),
    ]);
  });

  it("builds markers for pending orders at the candle where they were placed", () => {
    const pendingOrder = createOrder({
      id: 24,
      status: "Pending",
      side: "Short",
      positionSize: 2,
      entryPrice: 1.171,
      orderedAt: "2024-01-01T00:15:00Z",
    });
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 1.168, high: 1.169, low: 1.167, close: 1.1685, volume: 1000 },
      { timestamp: "2024-01-01T00:15:00Z", open: 1.1685, high: 1.1705, low: 1.1682, close: 1.16965, volume: 1200 },
    ]).candles;

    const markers = buildOrderMarkerOverlays({
      pendingOrders: [pendingOrder],
      activePositions: [],
      closedPositions: [],
      chartCandles,
    });

    expect(markers).toEqual([
      expect.objectContaining({
        id: "pending-entry-24",
        time: toChartTimestamp("2024-01-01T00:15:00Z"),
        price: 1.171,
        anchorPrice: 1.1682,
        side: "Short",
        text: "Short 2 @ 1.17100",
      }),
    ]);
  });

  it("anchors an order to the candle whose bucket contains its timestamp, not the nearest one", () => {
    // An order placed on a fine timeframe (00:50) lands in the back half of the
    // 00:00–01:00 H1 bar after a timeframe switch. It must stay on the 00:00 bar
    // it was placed inside — not snap forward to the closer 01:00 bar.
    const activePosition = createOrder({
      id: 31,
      status: "Active",
      side: "Long",
      positionSize: 1,
      entryPrice: 1.2,
      filledPrice: 1.2,
      orderedAt: "2024-01-01T00:50:00Z",
      filledAt: "2024-01-01T00:50:00Z",
    });
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 1.18, high: 1.21, low: 1.17, close: 1.2, volume: 1000 },
      { timestamp: "2024-01-01T01:00:00Z", open: 1.2, high: 1.23, low: 1.19, close: 1.22, volume: 1200 },
    ]).candles;

    const markers = buildOrderMarkerOverlays({
      activePositions: [activePosition],
      closedPositions: [],
      chartCandles,
    });

    expect(markers).toEqual([
      expect.objectContaining({
        id: "active-entry-31",
        time: toChartTimestamp("2024-01-01T00:00:00Z"),
        anchorPrice: 1.17,
      }),
    ]);
  });

  it("anchors to the latest revealed candle when the order time sits just past its start", () => {
    // The backend stamps an order with the simulated clock, which at the
    // unaligned session-start edge can sit a few minutes past the last revealed
    // bar's start. The marker should stick to that last bar, not fall through to
    // a drifting live-edge fallback.
    const activePosition = createOrder({
      id: 32,
      status: "Active",
      side: "Long",
      positionSize: 1,
      entryPrice: 1.3,
      filledPrice: 1.3,
      orderedAt: "2024-01-01T00:22:00Z",
      filledAt: null,
    });
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 1.28, high: 1.31, low: 1.27, close: 1.29, volume: 1000 },
      { timestamp: "2024-01-01T00:15:00Z", open: 1.29, high: 1.33, low: 1.285, close: 1.3, volume: 1200 },
    ]).candles;

    const markers = buildOrderMarkerOverlays({
      activePositions: [activePosition],
      closedPositions: [],
      chartCandles,
    });

    expect(markers).toEqual([
      expect.objectContaining({
        id: "active-entry-32",
        time: toChartTimestamp("2024-01-01T00:15:00Z"),
        anchorPrice: 1.285,
      }),
    ]);
  });

  it("normalizes TradingView-style drawing tools from chart anchors", () => {
    const start = { time: toChartTimestamp("2024-01-01T00:00:00Z")!, price: 1.1 };
    const end = { time: toChartTimestamp("2024-01-01T00:15:00Z")!, price: 1.105 };

    expect(createChartDrawing({
      id: "horizontal",
      tool: "horizontal-line",
      color: "#f97316",
      start,
      end,
    })).toMatchObject({
      id: "horizontal",
      tool: "horizontal-line",
      color: "#f97316",
      points: [
        { time: start.time, price: start.price },
        { time: end.time, price: start.price },
      ],
    });

    expect(createChartDrawing({
      id: "vertical",
      tool: "vertical-line",
      color: "#f97316",
      start,
      end,
    })).toMatchObject({
      points: [
        { time: start.time, price: start.price },
        { time: start.time, price: end.price },
      ],
    });

    expect(createChartDrawing({
      id: "text",
      tool: "text",
      color: "#f97316",
      start,
      text: "Breakout",
    })).toMatchObject({
      points: [{ time: start.time, price: start.price }],
      text: "Breakout",
    });
  });

  it("stores editable style settings on new drawings", () => {
    const drawing = createChartDrawing({
      id: "styled",
      tool: "rectangle",
      color: "#e11d48",
      start: { time: toChartTimestamp("2024-01-01T00:00:00Z")!, price: 1.1 },
      end: { time: toChartTimestamp("2024-01-01T00:15:00Z")!, price: 1.105 },
      style: {
        strokeColor: "#e11d48",
        strokeWidth: 4,
        lineStyle: "dashed",
        fillOpacity: 0.22,
        textSize: 14,
      },
    });

    expect(drawing).not.toBeNull();
    expect(drawing).toMatchObject({
      color: "#e11d48",
      style: expect.objectContaining({
        strokeColor: "#e11d48",
        strokeWidth: 4,
        lineStyle: "dashed",
        fillColor: "#e11d48",
        fillOpacity: 0.22,
        textColor: "#e11d48",
        textSize: 14,
      }),
    });
  });

  it("places two-point drawing objects from first click and second click without drag", () => {
    const start = {
      time: toChartTimestamp("2024-01-01T00:00:00Z")!,
      price: 1.1,
      x: 120,
      y: 260,
    };
    const end = {
      time: toChartTimestamp("2024-01-01T00:15:00Z")!,
      price: 1.105,
      x: 360,
      y: 180,
    };
    const style = {
      strokeColor: "#2563eb",
      strokeWidth: 2,
      lineStyle: "solid" as const,
      fillColor: "#2563eb",
      fillOpacity: 0.09,
      textColor: "#2563eb",
      textSize: 11,
    };

    expect(isTwoPointDrawingTool("rectangle")).toBe(true);

    const draft = createChartDrawingDraft({
      tool: "rectangle",
      color: "#2563eb",
      style,
      start,
      text: "Zone",
    });

    expect(draft).toMatchObject({
      tool: "rectangle",
      start: { time: start.time, price: start.price },
      end: { time: start.time, price: start.price },
      startPoint: { x: start.x, y: start.y },
      endPoint: { x: start.x, y: start.y },
    });

    const drawing = completeChartDrawingDraft({
      draft,
      end,
      drawingId: "drawing-1",
    });

    expect(drawing).toMatchObject({
      id: "drawing-1",
      tool: "rectangle",
      points: [
        { time: start.time, price: start.price },
        { time: end.time, price: end.price },
      ],
      text: "Zone",
    });
  });

  it("updates drawing style without changing saved anchors or labels", () => {
    const drawing = createChartDrawing({
      id: "trend",
      tool: "trend-line",
      color: "#2563eb",
      start: { time: toChartTimestamp("2024-01-01T00:00:00Z")!, price: 1.1 },
      end: { time: toChartTimestamp("2024-01-01T00:15:00Z")!, price: 1.105 },
      text: "Breakout",
    });

    expect(drawing).not.toBeNull();
    const updated = applyChartDrawingStyle(drawing!, {
      strokeColor: "#f97316",
      strokeWidth: 5,
      lineStyle: "dotted",
      fillOpacity: 0.18,
    });

    expect(updated).toMatchObject({
      id: "trend",
      color: "#f97316",
      text: "Breakout",
      points: drawing!.points,
      style: expect.objectContaining({
        strokeColor: "#f97316",
        strokeWidth: 5,
        lineStyle: "dotted",
        fillOpacity: 0.18,
      }),
    });
  });

  it("applies reusable drawing style templates to existing objects", () => {
    const drawing = createChartDrawing({
      id: "zone",
      tool: "rectangle",
      color: "#2563eb",
      start: { time: toChartTimestamp("2024-01-01T00:00:00Z")!, price: 1.1 },
      end: { time: toChartTimestamp("2024-01-01T00:15:00Z")!, price: 1.105 },
    });

    expect(drawing).not.toBeNull();
    const templated = applyChartDrawingTemplate(drawing!, "focus-zone");
    const style = getChartDrawingStyle(templated);

    expect(style).toMatchObject({
      strokeColor: "#f97316",
      strokeWidth: 3,
      lineStyle: "dashed",
      fillColor: "#f97316",
      fillOpacity: 0.16,
    });
    expect(templated.points).toEqual(drawing!.points);
  });

  it("computes measurement labels for price and percentage change", () => {
    const drawing = createChartDrawing({
      id: "measure",
      tool: "measure",
      color: "#2563eb",
      start: { time: toChartTimestamp("2024-01-01T00:00:00Z")!, price: 100 },
      end: { time: toChartTimestamp("2024-01-01T01:00:00Z")!, price: 112.5 },
    });

    expect(drawing).not.toBeNull();
    expect(formatDrawingMetricLabel(drawing!)).toBe("+12.50 / +12.50%");
  });

  it("snaps drawing anchors to the nearest candle OHLC value", () => {
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 1.1, high: 1.12, low: 1.09, close: 1.11, volume: 1000 },
      { timestamp: "2024-01-01T00:15:00Z", open: 1.11, high: 1.13, low: 1.105, close: 1.126, volume: 1200 },
    ]).candles;

    expect(snapDrawingAnchorToCandles({
      time: toChartTimestamp("2024-01-01T00:14:00Z")!,
      price: 1.128,
    }, chartCandles)).toEqual({
      time: toChartTimestamp("2024-01-01T00:15:00Z"),
      logical: 1,
      price: 1.13,
    });
  });

  it("keeps magnet anchors in future chart whitespace instead of snapping back to the latest candle", () => {
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 1.1, high: 1.12, low: 1.09, close: 1.11, volume: 1000 },
      { timestamp: "2024-01-01T00:15:00Z", open: 1.11, high: 1.13, low: 1.105, close: 1.126, volume: 1200 },
      { timestamp: "2024-01-01T00:30:00Z", open: 1.12, high: 1.14, low: 1.11, close: 1.135, volume: 900 },
    ]).candles;
    const futureAnchor = {
      time: toChartTimestamp("2024-01-01T01:00:00Z")!,
      logical: 4,
      price: 1.128,
    };

    expect(snapDrawingAnchorToCandles(futureAnchor, chartCandles)).toEqual(futureAnchor);
  });

  it("estimates drawing time for free logical positions away from loaded candles", () => {
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 1.1, high: 1.12, low: 1.09, close: 1.11, volume: 1000 },
      { timestamp: "2024-01-01T00:15:00Z", open: 1.11, high: 1.13, low: 1.105, close: 1.126, volume: 1200 },
      { timestamp: "2024-01-01T00:30:00Z", open: 1.12, high: 1.14, low: 1.11, close: 1.135, volume: 900 },
    ]).candles;

    expect(estimateDrawingTimeFromLogical(0.5, chartCandles)).toBe(toChartTimestamp("2024-01-01T00:07:30Z"));
    expect(estimateDrawingTimeFromLogical(4, chartCandles)).toBe(toChartTimestamp("2024-01-01T01:00:00Z"));
    expect(estimateDrawingTimeFromLogical(-1, chartCandles)).toBe(toChartTimestamp("2023-12-31T23:45:00Z"));
  });

  it("resolves drawing anchors from future logical whitespace when no exact candle time exists", () => {
    const chartCandles = mapBacktestCandlesToChartData([
      { timestamp: "2024-01-01T00:00:00Z", open: 1.1, high: 1.12, low: 1.09, close: 1.11, volume: 1000 },
      { timestamp: "2024-01-01T00:15:00Z", open: 1.11, high: 1.13, low: 1.105, close: 1.126, volume: 1200 },
      { timestamp: "2024-01-01T00:30:00Z", open: 1.12, high: 1.14, low: 1.11, close: 1.135, volume: 900 },
    ]).candles;

    expect(resolveDrawingAnchorFromCoordinate({
      x: 560,
      y: 180,
      chartCandles,
      coordinateToTime: () => null,
      coordinateToLogical: () => 4,
      coordinateToPrice: () => 1.128,
      isMagnetEnabled: false,
    })).toEqual({
      time: toChartTimestamp("2024-01-01T01:00:00Z"),
      logical: 4,
      price: 1.128,
    });
  });

  it("projects saved chart drawings back to screen coordinates", () => {
    const drawing = createChartDrawing({
      id: "trend",
      tool: "trend-line",
      color: "#2563eb",
      start: { time: 100 as UTCTimestamp, price: 1.1 },
      end: { time: 160 as UTCTimestamp, price: 1.105 },
    });

    expect(drawing).not.toBeNull();
    const positioned = positionChartDrawing({
      drawing: drawing!,
      width: 900,
      height: 500,
      timeToCoordinate: (time) => Number(time) - 80,
      priceToCoordinate: (price) => (1.2 - price) * 1000,
    });

    expect(positioned).toMatchObject({
      id: "trend",
      tool: "trend-line",
      points: [
        expect.objectContaining({ x: 20 }),
        expect.objectContaining({ x: 80 }),
      ],
    });
    expect(positioned?.points[0]?.y).toBeCloseTo(100);
    expect(positioned?.points[1]?.y).toBeCloseTo(95);
  });

  it("projects free-position drawings from logical coordinates instead of requiring candle times", () => {
    const drawing = createChartDrawing({
      id: "free-trend",
      tool: "trend-line",
      color: "#2563eb",
      start: { time: 100 as UTCTimestamp, logical: 5.25, price: 1.1 },
      end: { time: 160 as UTCTimestamp, logical: 7.75, price: 1.105 },
    });

    expect(drawing).not.toBeNull();
    const positioned = positionChartDrawing({
      drawing: drawing!,
      width: 900,
      height: 500,
      logicalToCoordinate: (logical) => logical * 10,
      timeToCoordinate: () => null,
      priceToCoordinate: (price) => (1.2 - price) * 1000,
    });

    expect(positioned).toMatchObject({
      id: "free-trend",
      points: [
        expect.objectContaining({ x: 52.5, logical: 5.25 }),
        expect.objectContaining({ x: 77.5, logical: 7.75 }),
      ],
    });
  });

  it("moves drawings by free logical and price deltas without snapping to candle anchors", () => {
    const drawing = createChartDrawing({
      id: "move-free",
      tool: "rectangle",
      color: "#2563eb",
      start: { time: 100 as UTCTimestamp, logical: 4, price: 1.1 },
      end: { time: 160 as UTCTimestamp, logical: 8, price: 1.105 },
    });

    expect(drawing).not.toBeNull();
    const delta = calculateDrawingAnchorDelta(
      { time: 100 as UTCTimestamp, logical: 5, price: 1.2 },
      { time: 115 as UTCTimestamp, logical: 7.5, price: 1.17 },
    );
    const moved = moveChartDrawing(drawing!, delta);

    expect(moved.points).toEqual([
      { time: 115, logical: 6.5, price: 1.07 },
      { time: 175, logical: 10.5, price: 1.075 },
    ]);
  });

  it("edits a selected drawing handle while keeping the other anchor editable", () => {
    const drawing = createChartDrawing({
      id: "edit-free",
      tool: "trend-line",
      color: "#2563eb",
      start: { time: 100 as UTCTimestamp, logical: 4, price: 1.1 },
      end: { time: 160 as UTCTimestamp, logical: 8, price: 1.105 },
    });

    expect(drawing).not.toBeNull();
    const edited = replaceChartDrawingPoint(drawing!, 1, {
      time: 190 as UTCTimestamp,
      logical: 12,
      price: 1.11,
    });

    expect(edited.points).toEqual([
      { time: 100, logical: 4, price: 1.1 },
      { time: 190, logical: 12, price: 1.11 },
    ]);
  });
});

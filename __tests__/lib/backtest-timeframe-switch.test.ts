import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from "sonner";
import { api } from "@/lib/api";
import { useBacktestStore, type CandleData } from "@/lib/backtest-store";

function makeCandle(timestamp: string, close: number): CandleData {
  return {
    timestamp,
    open: close - 1,
    high: close + 1,
    low: close - 2,
    close,
    volume: 1000,
  };
}

describe("BacktestStore - switchTimeframe", () => {
  beforeEach(() => {
    useBacktestStore.getState().reset();
    vi.clearAllMocks();
  });

  it("aggregates currently rendered candles immediately when switching to a higher timeframe", async () => {
    const m5Candles = [
      makeCandle("2024-01-01T00:00:00Z", 100),
      makeCandle("2024-01-01T00:05:00Z", 102),
      makeCandle("2024-01-01T00:10:00Z", 104),
    ];

    useBacktestStore.setState({
      activeTimeframe: "M5",
      candles: m5Candles,
      session: {
        id: 22,
        asset: "EURUSD",
        startDate: "2024-01-01T00:00:00Z",
        endDate: null,
        initialBalance: 10000,
        currentBalance: 10000,
        pnlPercent: 0,
        status: "InProgress",
        currentTimestamp: "2024-01-01T00:10:00Z",
        activeTimeframe: "M5",
        playbackSpeed: 1,
        leverage: 1,
        maintenanceMarginPercentage: 0,
        isDataReady: true,
        totalOrders: 0,
        openPositions: 0,
        closedTrades: 0,
        createdDate: "2024-01-01T00:00:00Z",
      },
    });

    vi.spyOn(api, "put").mockResolvedValue({ data: { value: "H1" } } as never);

    let resolveGet: ((value: { data: { value: CandleData[] } }) => void) | undefined;
    vi.spyOn(api, "get").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve;
        }) as never,
    );

    const switchPromise = useBacktestStore.getState().switchTimeframe(22, "H1");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const optimisticState = useBacktestStore.getState();
    expect(optimisticState.activeTimeframe).toBe("H1");
    expect(optimisticState.candles).toHaveLength(1);
    expect(optimisticState.candles[0].timestamp).toBe("2024-01-01T00:00:00.000Z");
    expect(optimisticState.candles[0].close).toBe(104);

    expect(resolveGet).toBeTypeOf("function");
    resolveGet?.({ data: { value: [makeCandle("2024-01-01T00:00:00Z", 105)] } });
    await switchPromise;

    expect(useBacktestStore.getState().candles[0].close).toBe(105);
  });

  it("persists the timeframe before loading aggregated candles", async () => {
    const m5Candles = [makeCandle("2024-01-01T00:00:00Z", 101)];
    const h1Candles = [makeCandle("2024-01-01T01:00:00Z", 110)];

    useBacktestStore.setState({
      activeTimeframe: "M5",
      candles: m5Candles,
      session: {
        id: 12,
        asset: "EURUSD",
        startDate: "2024-01-01T00:00:00Z",
        endDate: null,
        initialBalance: 10000,
        currentBalance: 10000,
        pnlPercent: 0,
        status: "InProgress",
        currentTimestamp: "2024-01-01T00:00:00Z",
        activeTimeframe: "M5",
        playbackSpeed: 1,
        leverage: 1,
        maintenanceMarginPercentage: 0,
        isDataReady: true,
        totalOrders: 0,
        openPositions: 0,
        closedTrades: 0,
        createdDate: "2024-01-01T00:00:00Z",
      },
    });

    const putSpy = vi.spyOn(api, "put").mockResolvedValue({
      data: { value: "H1" },
    } as never);

    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: { value: h1Candles },
    } as never);

    await useBacktestStore.getState().switchTimeframe(12, "H1");

    const state = useBacktestStore.getState();
    expect(putSpy).toHaveBeenCalledWith("/v1/backtest-playback/12/timeframe", { timeframe: "H1" });
    expect(getSpy).toHaveBeenCalledWith(expect.stringContaining("/v1/backtest-market-data/12/candles"));
    expect(getSpy).toHaveBeenCalledWith(expect.stringContaining("timeframe=H1"));
    expect(putSpy.mock.invocationCallOrder[0]).toBeLessThan(getSpy.mock.invocationCallOrder[0]);
    expect(state.activeTimeframe).toBe("H1");
    expect(state.candles).toEqual(h1Candles);
    expect(state.session?.activeTimeframe).toBe("H1");
    expect(state.isSwitchingTimeframe).toBe(false);
  });

  it("rolls back to the previous timeframe when candle reload fails", async () => {
    const m5Candles = [makeCandle("2024-01-01T00:05:00Z", 102)];

    useBacktestStore.setState({
      activeTimeframe: "M5",
      candles: m5Candles,
      session: {
        id: 18,
        asset: "EURUSD",
        startDate: "2024-01-01T00:00:00Z",
        endDate: null,
        initialBalance: 10000,
        currentBalance: 10000,
        pnlPercent: 0,
        status: "InProgress",
        currentTimestamp: "2024-01-01T00:05:00Z",
        activeTimeframe: "M5",
        playbackSpeed: 1,
        leverage: 1,
        maintenanceMarginPercentage: 0,
        isDataReady: true,
        totalOrders: 0,
        openPositions: 0,
        closedTrades: 0,
        createdDate: "2024-01-01T00:00:00Z",
      },
    });

    const putSpy = vi.spyOn(api, "put")
      .mockResolvedValueOnce({ data: { value: "H1" } } as never)
      .mockResolvedValueOnce({ data: { value: "M5" } } as never);

    vi.spyOn(api, "get").mockRejectedValue(new Error("reload failed"));

    await useBacktestStore.getState().switchTimeframe(18, "H1");

    const state = useBacktestStore.getState();
    expect(putSpy).toHaveBeenNthCalledWith(1, "/v1/backtest-playback/18/timeframe", { timeframe: "H1" });
    expect(putSpy).toHaveBeenNthCalledWith(2, "/v1/backtest-playback/18/timeframe", { timeframe: "M5" });
    expect(state.activeTimeframe).toBe("M5");
    expect(state.candles).toEqual(m5Candles);
    expect(state.session?.activeTimeframe).toBe("M5");
    expect(state.isSwitchingTimeframe).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Failed to switch timeframe");
  });
});
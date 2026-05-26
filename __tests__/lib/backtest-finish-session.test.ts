import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { useBacktestStore, type BacktestOrder, type BacktestSession } from "@/lib/backtest-store";

const sessionId = 7;
const initialTimestamp = "2024-02-29T17:15:00Z";

const activeOrder: BacktestOrder = {
  id: 7,
  orderType: "Market",
  side: "Long",
  status: "Active",
  entryPrice: 100,
  filledPrice: 100,
  positionSize: 2,
  stopLoss: null,
  takeProfit: null,
  exitPrice: null,
  pnl: null,
  orderedAt: "2024-02-29T17:00:00Z",
  filledAt: "2024-02-29T17:00:00Z",
  closedAt: null,
};

const cancelledOrder: BacktestOrder = {
  id: 8,
  orderType: "Limit",
  side: "Short",
  status: "Cancelled",
  entryPrice: 120,
  filledPrice: null,
  positionSize: 1,
  stopLoss: null,
  takeProfit: null,
  exitPrice: null,
  pnl: null,
  orderedAt: "2024-02-29T17:05:00Z",
  filledAt: null,
  closedAt: null,
};

const closedOrder: BacktestOrder = {
  ...activeOrder,
  status: "Closed",
  exitPrice: 120,
  pnl: 40,
  closedAt: initialTimestamp,
};

const completedSession: BacktestSession = {
  id: sessionId,
  asset: "EURUSD",
  startDate: "2024-02-29T17:00:00Z",
  endDate: null,
  initialBalance: 10000,
  currentBalance: 10040,
  pnlPercent: 0.4,
  status: "Completed",
  currentTimestamp: initialTimestamp,
  activeTimeframe: "M15",
  playbackSpeed: 1,
  leverage: 50,
  maintenanceMarginPercentage: 0.5,
  isDataReady: true,
  totalOrders: 2,
  openPositions: 0,
  closedTrades: 1,
  createdDate: "2024-02-29T16:45:00Z",
};

describe("BacktestStore - finishSession", () => {
  beforeEach(() => {
    useBacktestStore.getState().reset();
    vi.restoreAllMocks();
  });

  it("posts to the finish endpoint, refreshes state, and stops playback", async () => {
    const playbackIntervalId = setInterval(() => undefined, 1000);

    useBacktestStore.setState({
      session: { ...completedSession, status: "InProgress" },
      pendingOrders: [{ ...cancelledOrder, status: "Pending" }],
      activePositions: [activeOrder],
      closedPositions: [],
      isPlaying: true,
      playbackIntervalId,
    });

    const postSpy = vi.spyOn(api, "post").mockResolvedValue({} as never);
    vi.spyOn(api, "get").mockImplementation((url: string) => {
      if (url === `/v1/backtest-sessions/${sessionId}`) {
        return Promise.resolve({ data: { value: completedSession } } as never);
      }

      if (url === `/v1/backtest-orders/session/${sessionId}`) {
        return Promise.resolve({ data: { value: [cancelledOrder, closedOrder] } } as never);
      }

      if (url === "/v1/backtest-sessions") {
        return Promise.resolve({
          data: {
            value: [
              {
                id: sessionId,
                asset: completedSession.asset,
                startDate: completedSession.startDate,
                endDate: completedSession.endDate,
                initialBalance: completedSession.initialBalance,
                currentBalance: completedSession.currentBalance,
                pnlPercent: completedSession.pnlPercent,
                status: completedSession.status,
                currentTimestamp: completedSession.currentTimestamp,
                isDataReady: completedSession.isDataReady,
                createdDate: completedSession.createdDate,
              },
            ],
          },
        } as never);
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    await useBacktestStore.getState().finishSession(sessionId, 120);

    clearInterval(playbackIntervalId);

    expect(postSpy).toHaveBeenCalledWith(expect.stringContaining(`/v1/backtest-sessions/${sessionId}/finish`));
    expect(useBacktestStore.getState().isPlaying).toBe(false);
    expect(useBacktestStore.getState().playbackIntervalId).toBeNull();
    expect(useBacktestStore.getState().session?.status).toBe("Completed");
    expect(useBacktestStore.getState().pendingOrders).toEqual([]);
    expect(useBacktestStore.getState().activePositions).toEqual([]);
    expect(useBacktestStore.getState().closedPositions).toEqual([closedOrder]);
    expect(useBacktestStore.getState().sessions[0]?.status).toBe("Completed");
  });
});
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { useBacktestStore, type BacktestOrder } from "@/lib/backtest-store";

const orderRequest = {
  sessionId: 42,
  orderType: 1,
  side: 0,
  entryPrice: 1.08,
  positionSize: 1,
  stopLoss: null,
  takeProfit: null,
} as const;

const pendingLimitOrder: BacktestOrder = {
  id: 99,
  orderType: "Limit",
  side: "Long",
  status: "Pending",
  entryPrice: 1.08,
  filledPrice: null,
  positionSize: 1,
  stopLoss: null,
  takeProfit: null,
  exitPrice: null,
  pnl: null,
  orderedAt: "2024-02-29T17:00:00Z",
  filledAt: null,
  closedAt: null,
};

describe("BacktestStore - placeOrder", () => {
  beforeEach(() => {
    useBacktestStore.getState().reset();
    vi.restoreAllMocks();
  });

  it("stores pending limit orders in pendingOrders", async () => {
    const postSpy = vi.spyOn(api, "post").mockResolvedValue({
      data: { value: pendingLimitOrder },
    } as never);

    const order = await useBacktestStore.getState().placeOrder(orderRequest);

    expect(postSpy).toHaveBeenCalledWith("/v1/backtest-orders", orderRequest);
    expect(order).toEqual(pendingLimitOrder);
    expect(useBacktestStore.getState().pendingOrders).toEqual([pendingLimitOrder]);
    expect(useBacktestStore.getState().activePositions).toEqual([]);
  });

  it("keeps the replay candle timestamp when the API response has a stale orderedAt", async () => {
    const orderedAt = "2024-02-29T17:15:00Z";
    const staleApiOrder = {
      ...pendingLimitOrder,
      orderedAt: "0001-01-01T00:00:00Z",
    };
    vi.spyOn(api, "post").mockResolvedValue({
      data: { value: staleApiOrder },
    } as never);

    const order = await useBacktestStore.getState().placeOrder({
      ...orderRequest,
      orderedAt,
    });

    expect(order.orderedAt).toBe(orderedAt);
    expect(useBacktestStore.getState().pendingOrders[0].orderedAt).toBe(orderedAt);
  });

  it("preserves locally known placement timestamps when refreshing orders", async () => {
    const orderedAt = "2024-02-29T17:15:00Z";
    useBacktestStore.setState({
      pendingOrders: [{ ...pendingLimitOrder, orderedAt }],
    });
    vi.spyOn(api, "get").mockResolvedValue({
      data: {
        value: [
          {
            ...pendingLimitOrder,
            orderedAt: "0001-01-01T00:00:00Z",
          },
        ],
      },
    } as never);

    await useBacktestStore.getState().loadOrders(42);

    expect(useBacktestStore.getState().pendingOrders[0].orderedAt).toBe(orderedAt);
  });

  it("rethrows placement failures so the form can show an error state", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new Error("placement failed"));

    await expect(useBacktestStore.getState().placeOrder(orderRequest)).rejects.toThrow("placement failed");
  });
});

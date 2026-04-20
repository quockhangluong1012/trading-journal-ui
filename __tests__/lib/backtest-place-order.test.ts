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

  it("rethrows placement failures so the form can show an error state", async () => {
    vi.spyOn(api, "post").mockRejectedValue(new Error("placement failed"));

    await expect(useBacktestStore.getState().placeOrder(orderRequest)).rejects.toThrow("placement failed");
  });
});
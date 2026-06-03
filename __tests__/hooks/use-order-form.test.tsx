import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { useOrderForm } from "@/hooks/use-order-form";
import { useBacktestStore, type BacktestOrder, type BacktestSession } from "@/lib/backtest-store";
import { toast } from "sonner";

function createSession(overrides: Partial<BacktestSession> = {}): BacktestSession {
  return {
    id: 42,
    asset: "EURUSD",
    startDate: "2024-01-01T00:00:00Z",
    endDate: null,
    initialBalance: 10000,
    currentBalance: 10000,
    pnlPercent: 0,
    status: "InProgress",
    currentTimestamp: "2024-01-01T00:00:00Z",
    activeTimeframe: "M15",
    playbackSpeed: 1,
    leverage: 50,
    maintenanceMarginPercentage: 0,
    isDataReady: true,
    totalOrders: 0,
    openPositions: 0,
    closedTrades: 0,
    createdDate: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function createOrder(overrides: Partial<BacktestOrder> = {}): BacktestOrder {
  return {
    id: 99,
    orderType: "Market",
    side: "Long",
    status: "Active",
    entryPrice: 101.25,
    filledPrice: 101.25,
    positionSize: 1,
    stopLoss: null,
    takeProfit: null,
    exitPrice: null,
    pnl: null,
    orderedAt: "2024-01-01T00:00:00Z",
    filledAt: "2024-01-01T00:00:00Z",
    closedAt: null,
    ...overrides,
  };
}

describe("useOrderForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBacktestStore.getState().reset();
  });

  it("places a market order with the live price when the form mounted before a price was available", async () => {
    const placeOrder = vi.fn().mockResolvedValue(createOrder());
    useBacktestStore.setState({
      balance: 10000,
      currentTimestamp: "2024-01-01T00:15:00Z",
      session: createSession(),
      placeOrder,
    });

    const { result, rerender } = renderHook(
      ({ currentPrice }) => useOrderForm({ sessionId: 42, currentPrice }),
      { initialProps: { currentPrice: 0 } },
    );

    act(() => {
      result.current.setOrderType("Market");
    });
    rerender({ currentPrice: 101.25 });

    await act(async () => {
      await result.current.form.handleSubmit(result.current.onSubmit)();
    });

    expect(placeOrder).toHaveBeenCalledWith({
      sessionId: 42,
      orderType: 0,
      side: 0,
      entryPrice: 101.25,
      positionSize: 1,
      stopLoss: null,
      takeProfit: null,
      orderedAt: "2024-01-01T00:15:00Z",
    });
  });

  it("does not submit a market order until a live price is available", async () => {
    const placeOrder = vi.fn().mockResolvedValue(createOrder());
    useBacktestStore.setState({
      balance: 10000,
      session: createSession(),
      placeOrder,
    });

    const { result } = renderHook(() => useOrderForm({ sessionId: 42, currentPrice: 0 }));

    act(() => {
      result.current.setOrderType("Market");
    });

    await act(async () => {
      await result.current.form.handleSubmit(result.current.onSubmit)();
    });

    expect(placeOrder).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Market price is unavailable. Wait for a live price before placing a market order.",
    );
  });
});

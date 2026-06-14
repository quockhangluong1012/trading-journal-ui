import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { OrderPanel } from "@/components/backtest/order-panel";
import { useBacktestStore, type BacktestOrder, type BacktestSession } from "@/lib/backtest-store";

function createSession(): BacktestSession {
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
  };
}

function createPendingOrder(): BacktestOrder {
  return {
    id: 99,
    orderType: "Limit",
    side: "Short",
    status: "Pending",
    entryPrice: 1.1662,
    filledPrice: null,
    positionSize: 100,
    stopLoss: 1.16754,
    takeProfit: 1.1642,
    exitPrice: null,
    pnl: null,
    orderedAt: "2024-01-01T00:00:00Z",
    filledAt: null,
    closedAt: null,
  };
}

describe("OrderPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBacktestStore.getState().reset();
  });

  it("submits a forex sell limit at the displayed market price", async () => {
    const user = userEvent.setup();
    const placeOrder = vi.fn().mockResolvedValue(createPendingOrder());
    useBacktestStore.setState({
      balance: 10000,
      currentTimestamp: "2024-01-01T00:00:00Z",
      session: createSession(),
      candles: [
        {
          timestamp: "2024-01-01T00:00:00Z",
          open: 1.1661,
          high: 1.1663,
          low: 1.166,
          close: 1.1662,
          volume: 100,
        },
      ],
      placeOrder,
    });

    render(
      <OrderPanel
        sessionId={42}
        currentPrice={1.1662}
        initialOrder={{
          side: "Short",
          orderType: "Limit",
          entryPrice: 1.1662,
          positionSize: 100,
          stopLoss: 1.16754,
          takeProfit: 1.1642,
        }}
      />,
    );

    expect(screen.getByDisplayValue("1.1662")).toBeValid();
    expect(screen.getByDisplayValue("1.1642")).toBeValid();
    expect(screen.getByDisplayValue("1.16754")).toBeValid();

    await user.click(screen.getByRole("button", { name: /place limit sell/i }));

    expect(placeOrder).toHaveBeenCalledWith({
      sessionId: 42,
      orderType: 1,
      side: 1,
      entryPrice: 1.1662,
      positionSize: 100,
      stopLoss: 1.16754,
      takeProfit: 1.1642,
      orderedAt: "2024-01-01T00:00:00Z",
    });
  });
});

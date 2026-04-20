import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BacktestWorkspaceHeader } from "@/components/backtest/backtest-workspace-header";
import type { Timeframe } from "@/lib/backtest-store";

function createProps() {
  return {
    asset: "EURUSD",
    sessionStatus: "InProgress",
    isPlaying: false,
    playbackSpeed: 1 as const,
    activeTimeframe: "M15" as Timeframe,
    isSwitchingTimeframe: false,
    formattedTimestamp: "2024-03-01 16:45:00 UTC",
    activePositionsCount: 1,
    pendingOrdersCount: 1,
    closedPositionsCount: 2,
    balance: 10000,
    equity: 10000,
    unrealizedPnl: 250.5,
    onTogglePlayback: vi.fn(),
    onSkip: vi.fn(),
    onPlaybackSpeedChange: vi.fn(),
    onTimeframeChange: vi.fn(),
    finishAction: <button type="button">Finish Early</button>,
  };
}

describe("BacktestWorkspaceHeader", () => {
  it("renders the session overview, counters, and account metrics", () => {
    render(<BacktestWorkspaceHeader {...createProps()} />);

    const balanceCard = screen.getByText("Balance").parentElement;
    const equityCard = screen.getByText("Equity").parentElement;
    const openPnlCard = screen.getByText("Open PnL").parentElement;

    expect(screen.getByText("EURUSD")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("2024-03-01 16:45:00 UTC")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("Open PnL")).toBeInTheDocument();
    expect(screen.getByText("Open positions")).toBeInTheDocument();
    expect(screen.getByText("Pending orders")).toBeInTheDocument();
    expect(screen.getByText("Closed trades")).toBeInTheDocument();
    expect(balanceCard).not.toBeNull();
    expect(equityCard).not.toBeNull();
    expect(openPnlCard).not.toBeNull();
    expect(within(balanceCard as HTMLElement).getByText("$10,000.00")).toBeInTheDocument();
    expect(within(equityCard as HTMLElement).getByText("$10,000.00")).toBeInTheDocument();
    expect(within(openPnlCard as HTMLElement).getByText("+$250.50")).toBeInTheDocument();
    expect(screen.getByText("Finish Early")).toBeInTheDocument();
  });

  it("calls the replay control callbacks", async () => {
    const user = userEvent.setup();
    const props = createProps();

    render(<BacktestWorkspaceHeader {...props} />);

    await user.click(screen.getByRole("button", { name: "Start replay" }));
    await user.click(screen.getByRole("button", { name: "Step forward one candle" }));

    expect(props.onTogglePlayback).toHaveBeenCalledTimes(1);
    expect(props.onSkip).toHaveBeenCalledTimes(1);
  });

  it("calls onTimeframeChange when a new timeframe is selected", async () => {
    const user = userEvent.setup();
    const props = createProps();

    render(<BacktestWorkspaceHeader {...props} />);

    await user.click(screen.getByRole("radio", { name: "Switch to 1H timeframe" }));

    expect(props.onTimeframeChange).toHaveBeenCalledWith("H1");
  });

  it("uses positive and negative pnl tones", () => {
    const { rerender } = render(<BacktestWorkspaceHeader {...createProps()} />);

    expect(screen.getByText("+$250.50")).toHaveClass("text-emerald-500");

    rerender(
      <BacktestWorkspaceHeader
        {...createProps()}
        unrealizedPnl={-120}
      />,
    );

    expect(screen.getByText("-$120.00")).toHaveClass("text-rose-500");
  });

  it("omits the finish action area when no finish action is provided", () => {
    render(
      <BacktestWorkspaceHeader
        {...createProps()}
        finishAction={null}
      />,
    );

    expect(screen.queryByText("Finish Early")).not.toBeInTheDocument();
  });
});
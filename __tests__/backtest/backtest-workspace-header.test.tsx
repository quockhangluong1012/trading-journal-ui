import { render, screen } from "@testing-library/react";
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
  it("renders the asset identity, financial metrics, and controls", () => {
    render(<BacktestWorkspaceHeader {...createProps()} />);

    // Asset identity
    expect(screen.getByText("EURUSD")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();

    // Inline metric labels (visible on sm+ screens)
    expect(screen.getByText("Bal")).toBeInTheDocument();
    expect(screen.getByText("Eq")).toBeInTheDocument();
    expect(screen.getByText("PnL")).toBeInTheDocument();

    // Metric values
    const balanceValues = screen.getAllByText("$10,000.00");
    expect(balanceValues.length).toBeGreaterThanOrEqual(1);

    const pnlValues = screen.getAllByText("+$250.50");
    expect(pnlValues.length).toBeGreaterThanOrEqual(1);

    // Playback controls
    expect(screen.getByRole("button", { name: "Start replay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step forward one candle" })).toBeInTheDocument();

    // Finish action
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

    // The PnL value appears in both desktop and mobile metrics; all instances should have the color class
    const positivePnls = screen.getAllByText("+$250.50");
    expect(positivePnls.length).toBeGreaterThanOrEqual(1);
    for (const el of positivePnls) {
      expect(el).toHaveClass("text-emerald-500");
    }

    rerender(
      <BacktestWorkspaceHeader
        {...createProps()}
        unrealizedPnl={-120}
      />,
    );

    const negativePnls = screen.getAllByText("-$120.00");
    expect(negativePnls.length).toBeGreaterThanOrEqual(1);
    for (const el of negativePnls) {
      expect(el).toHaveClass("text-rose-500");
    }
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

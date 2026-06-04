import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  LIVE_CHART_KILLZONES,
  LiveTradingViewWidget,
  buildLiveKillzoneSegments,
  getActiveLiveKillzone,
} from "@/components/trade/live-tradingview-widget";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

describe("LiveTradingViewWidget killzones", () => {
  it("splits overnight killzones into chart-day segments", () => {
    const segments = buildLiveKillzoneSegments(LIVE_CHART_KILLZONES);

    expect(segments).toEqual([
      expect.objectContaining({
        id: "asian-late",
        label: "Asian",
        leftPercent: 95.83333333333334,
        widthPercent: 4.166666666666666,
        timeLabel: "23:00-24:00 UTC",
      }),
      expect.objectContaining({
        id: "asian-early",
        label: "Asian",
        leftPercent: 0,
        widthPercent: 20.833333333333336,
        timeLabel: "00:00-05:00 UTC",
      }),
      expect.objectContaining({
        id: "london",
        label: "London",
        leftPercent: 29.166666666666668,
        widthPercent: 12.5,
        timeLabel: "07:00-10:00 UTC",
      }),
      expect.objectContaining({
        id: "new-york",
        label: "New York",
        leftPercent: 50,
        widthPercent: 12.5,
        timeLabel: "12:00-15:00 UTC",
      }),
    ]);
  });

  it("detects the active UTC killzone including overnight windows", () => {
    expect(getActiveLiveKillzone(new Date("2024-01-01T23:30:00Z"))?.id).toBe("asian");
    expect(getActiveLiveKillzone(new Date("2024-01-01T07:30:00Z"))?.id).toBe("london");
    expect(getActiveLiveKillzone(new Date("2024-01-01T13:30:00Z"))?.id).toBe("new-york");
    expect(getActiveLiveKillzone(new Date("2024-01-01T18:00:00Z"))).toBeNull();
  });

  it("renders live chart killzone bands by default and lets the user hide them", () => {
    render(<LiveTradingViewWidget />);

    expect(screen.getByLabelText("Live chart killzones")).toBeInTheDocument();
    expect(screen.getByText("Asian")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();
    expect(screen.getByText("New York")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Hide killzones"));

    expect(screen.queryByLabelText("Live chart killzones")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Show killzones")).toBeInTheDocument();
  });
});

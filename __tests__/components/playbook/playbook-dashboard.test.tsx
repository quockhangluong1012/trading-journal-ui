import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PlaybookDashboard } from "@/components/playbook/playbook-dashboard"
import type { PlaybookOverview } from "@/lib/playbook-api"

vi.mock("@/components/playbook/ai-playbook-optimizer-card", () => ({
  AiPlaybookOptimizerCard: () => <div data-testid="playbook-optimizer" />,
}))

vi.mock("@/components/playbook/playbook-detail-view", () => ({
  PlaybookDetailView: () => <div data-testid="playbook-detail" />,
}))

vi.mock("@/components/playbook/setup-comparison-view", () => ({
  SetupComparisonView: () => <div data-testid="setup-comparison" />,
}))

vi.mock("@/components/playbook/retire-dialog", () => ({
  RetireDialog: () => <div data-testid="retire-dialog" />,
}))

describe("PlaybookDashboard", () => {
  it("uses semantic status colors for setup metrics in the dashboard cards", () => {
    const overview: PlaybookOverview = {
      setups: [
        {
          setupId: 1,
          setupName: "Morning reversal",
          description: "Fade the first reclaim back into the overnight midpoint.",
          status: 1,
          totalTrades: 12,
          wins: 8,
          losses: 4,
          winRate: 66.7,
          totalPnl: -120,
          profitFactor: 1.4,
          expectancy: 45,
          avgRiskReward: 2.1,
          grade: "B",
        },
      ],
      totalSetups: 1,
      activeSetups: 1,
      retiredSetups: 0,
      topSetupName: "Morning reversal",
      worstSetupName: null,
    }

    render(
      <PlaybookDashboard
        overview={overview}
        isLoading={false}
        range="All"
        rangeOptions={[{ label: "All" }]}
        onRangeChange={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText("66.7%")).toHaveClass("text-success")
    expect(screen.getByText("-$120")).toHaveClass("text-destructive")
    expect(screen.getByText("$45")).toHaveClass("text-success")
    expect(screen.getByText("B")).toHaveClass("text-blue-700")
  })
})
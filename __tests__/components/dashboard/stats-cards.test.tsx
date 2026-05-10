import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatsCards } from "@/components/dashboard/stats-cards"

describe("StatsCards", () => {
  it("renders expectancy, profit factor, and daily limit usage cards", () => {
    render(
      <StatsCards
        isLoading={false}
        stats={{
          totalPnL: 2450,
          winRate: 62.5,
          totalTrades: 8,
          openPositions: 2,
          expectancy: 306.25,
          profitFactor: 2.4,
          dailyLimitUsedPercent: 48,
          weeklyCapUsedPercent: 62,
        }}
      />,
    )

    expect(screen.getByText("Expectancy")).toBeInTheDocument()
    expect(screen.getByText("Profit Factor")).toBeInTheDocument()
    expect(screen.getByText("Daily Limit Used")).toBeInTheDocument()
    expect(screen.getByText("$306.25")).toBeInTheDocument()
    expect(screen.getByText("2.40")).toBeInTheDocument()
    expect(screen.getByText("48.0%")).toBeInTheDocument()
  })

  it("renders Inf for an infinite profit factor", () => {
    render(
      <StatsCards
        isLoading={false}
        stats={{
          totalPnL: 2450,
          winRate: 62.5,
          totalTrades: 8,
          openPositions: 2,
          expectancy: 306.25,
          profitFactor: Number.POSITIVE_INFINITY,
          dailyLimitUsedPercent: 48,
          weeklyCapUsedPercent: 62,
        }}
      />,
    )

    expect(screen.getByText("Inf")).toBeInTheDocument()
  })
})
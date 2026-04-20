import { describe, expect, it } from "vitest"
import type { AssetBreakdown, PerformanceSummary } from "@/lib/analytics-api"
import {
  buildAnalyticsNarrative,
  buildAnalyticsPulse,
  getTopAsset,
} from "@/lib/analytics-overview"

const baseAnalytics: PerformanceSummary = {
  totalPnl: 0,
  winRate: 0,
  wins: 0,
  losses: 0,
  totalClosed: 0,
  avgWin: 0,
  avgLoss: 0,
  largestWin: 0,
  largestLoss: 0,
  profitFactor: 0,
  expectancy: 0,
  maxDrawdown: 0,
  maxDrawdownPct: 0,
  sharpeRatio: 0,
  avgHoldingDays: 0,
  longsWinRate: 0,
  shortsWinRate: 0,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  avgRiskReward: 0,
}

describe("getTopAsset", () => {
  it("returns the strongest asset by pnl", () => {
    const assets: AssetBreakdown[] = [
      { asset: "EURUSD", pnl: 420, count: 8, winRate: 62.5 },
      { asset: "BTCUSD", pnl: 1820, count: 5, winRate: 80 },
      { asset: "XAUUSD", pnl: -120, count: 3, winRate: 33.3 },
    ]

    expect(getTopAsset(assets)).toEqual(assets[1])
  })

  it("returns null when there is no asset data", () => {
    expect(getTopAsset([])).toBeNull()
  })
})

describe("buildAnalyticsNarrative", () => {
  it("builds a confident narrative for profitable and controlled performance", () => {
    const narrative = buildAnalyticsNarrative({
      analytics: {
        ...baseAnalytics,
        totalPnl: 5400,
        totalClosed: 18,
        winRate: 61.1,
        sharpeRatio: 1.4,
        maxDrawdownPct: 9.2,
      },
      rangeLabel: "1M",
      topAsset: { asset: "BTCUSD", pnl: 3200, count: 7, winRate: 71.4 },
    })

    expect(narrative.headline).toContain("compounding")
    expect(narrative.detail).toContain("BTCUSD")
  })

  it("builds a warning narrative when the edge is under pressure", () => {
    const narrative = buildAnalyticsNarrative({
      analytics: {
        ...baseAnalytics,
        totalPnl: -1800,
        totalClosed: 12,
        winRate: 33.3,
        maxDrawdownPct: 24.5,
      },
      rangeLabel: "3M",
      topAsset: null,
    })

    expect(narrative.headline).toContain("under pressure")
    expect(narrative.detail).toContain("Tighten risk")
  })

  it("builds an empty-state narrative when there are no closed trades", () => {
    const narrative = buildAnalyticsNarrative({
      analytics: baseAnalytics,
      rangeLabel: "All",
      topAsset: null,
    })

    expect(narrative.headline).toContain("No closed trades")
  })
})

describe("buildAnalyticsPulse", () => {
  it("classifies pulse cards using the key analytics thresholds", () => {
    const pulses = buildAnalyticsPulse(
      {
        ...baseAnalytics,
        profitFactor: 1.82,
        maxDrawdownPct: 7.4,
        expectancy: 280,
      },
      { asset: "ES", pnl: 4100, count: 9, winRate: 66.7 },
    )

    expect(pulses).toEqual([
      {
        label: "Edge",
        value: "1.82",
        detail: "Profit factor",
        tone: "positive",
      },
      {
        label: "Risk",
        value: "7.4%",
        detail: "Max drawdown",
        tone: "positive",
      },
      {
        label: "Expectancy",
        value: "+$280",
        detail: "Expected P&L per trade",
        tone: "positive",
      },
      {
        label: "Top instrument",
        value: "ES",
        detail: "+$4.1K over 9 trades",
        tone: "positive",
      },
    ])
  })
})
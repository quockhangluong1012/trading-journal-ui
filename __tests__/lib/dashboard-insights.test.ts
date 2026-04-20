import { describe, expect, it } from "vitest"
import { PositionType } from "@/lib/enum/PositionType"
import {
  buildDashboardOverview,
  buildProfitChartData,
  calculateOutcomeStreak,
  summarizeOpenPositions,
  type DashboardStats,
  type ProfitTrajectoryPoint,
} from "@/lib/dashboard-insights"

const stats: DashboardStats = {
  totalPnL: 2450,
  winRate: 62.5,
  totalTrades: 8,
  openPositions: 2,
}

const profitTrajectory: ProfitTrajectoryPoint[] = [
  { date: "2026-04-14T13:00:00.000Z", pnL: 120 },
  { date: "2026-04-14T18:00:00.000Z", pnL: 80 },
  { date: "2026-04-15T15:00:00.000Z", pnL: -60 },
  { date: "2026-04-16T15:00:00.000Z", pnL: 200 },
  { date: "2026-04-17T15:00:00.000Z", pnL: 160 },
]

describe("buildProfitChartData", () => {
  it("builds cumulative chart data and daily rollups", () => {
    const result = buildProfitChartData(profitTrajectory)

    expect(result.totalPnL).toBe(500)
    expect(result.chartData).toEqual([
      { date: "2026-04-14T13:00:00.000Z", profit: 120 },
      { date: "2026-04-14T18:00:00.000Z", profit: 200 },
      { date: "2026-04-15T15:00:00.000Z", profit: 140 },
      { date: "2026-04-16T15:00:00.000Z", profit: 340 },
      { date: "2026-04-17T15:00:00.000Z", profit: 500 },
    ])
    expect(result.dailyPerformance).toEqual([
      { date: "2026-04-14", pnl: 200 },
      { date: "2026-04-15", pnl: -60 },
      { date: "2026-04-16", pnl: 200 },
      { date: "2026-04-17", pnl: 160 },
    ])
  })
})

describe("calculateOutcomeStreak", () => {
  it("tracks the latest consecutive winning trades", () => {
    expect(calculateOutcomeStreak(profitTrajectory)).toEqual({
      count: 2,
      direction: "win",
    })
  })

  it("returns a neutral streak for an empty trade list", () => {
    expect(calculateOutcomeStreak([])).toEqual({
      count: 0,
      direction: "flat",
    })
  })
})

describe("summarizeOpenPositions", () => {
  it("calculates average risk reward and open position mix", () => {
    const result = summarizeOpenPositions([
      {
        id: "t-1",
        asset: "AAPL",
        position: PositionType.Long,
        status: 1,
        date: new Date("2026-04-17T13:00:00.000Z"),
        pnl: 0,
        notes: "Trend continuation",
        emotionTags: [],
        closedDate: new Date("2026-04-17T13:00:00.000Z"),
        confidenceLevel: 5,
        entryPrice: 100,
        exitPrice: 0,
        stopLoss: 95,
        targetTier1: 112,
        targetTier2: 0,
        targetTier3: 0,
      },
      {
        id: "t-2",
        asset: "TSLA",
        position: PositionType.Short,
        status: 1,
        date: new Date("2026-04-18T13:00:00.000Z"),
        pnl: 0,
        notes: "Fade the move",
        emotionTags: [],
        closedDate: new Date("2026-04-18T13:00:00.000Z"),
        confidenceLevel: 3,
        entryPrice: 200,
        exitPrice: 0,
        stopLoss: 210,
        targetTier1: 180,
        targetTier2: 0,
        targetTier3: 0,
      },
    ])

    expect(result).toEqual({
      avgRiskReward: 2.2,
      highConfidenceCount: 1,
      longCount: 1,
      shortCount: 1,
    })
  })
})

describe("buildDashboardOverview", () => {
  it("builds a profitable summary with useful insight tiles", () => {
    const overview = buildDashboardOverview({
      filterLabel: "Past month",
      stats,
      profitTrajectory,
      openPositions: [
        {
          id: "t-1",
          asset: "AAPL",
          position: PositionType.Long,
          status: 1,
          date: new Date("2026-04-17T13:00:00.000Z"),
          pnl: 0,
          notes: "Trend continuation",
          emotionTags: [],
          closedDate: new Date("2026-04-17T13:00:00.000Z"),
          confidenceLevel: 5,
          entryPrice: 100,
          exitPrice: 0,
          stopLoss: 95,
          targetTier1: 112,
          targetTier2: 0,
          targetTier3: 0,
        },
      ],
    })

    expect(overview.summary).toContain("profitable")
    expect(overview.focusMessage).toContain("high-conviction")
    expect(overview.insights).toEqual([
      {
        title: "Current streak",
        value: "2 wins",
        detail: "Momentum is positive in the latest closed trades.",
        tone: "positive",
      },
      {
        title: "Best day",
        value: "$200",
        detail: "Your strongest trading day in this period was Apr 14.",
        tone: "positive",
      },
      {
        title: "Active trading days",
        value: "4 days",
        detail: "You found opportunity on 4 separate sessions.",
        tone: "neutral",
      },
      {
        title: "Open setup quality",
        value: "2.4R avg",
        detail: "1 of 1 open trade has high conviction.",
        tone: "positive",
      },
    ])
  })

  it("builds a recovery-focused summary when performance is negative", () => {
    const overview = buildDashboardOverview({
      filterLabel: "Past week",
      stats: {
        totalPnL: -420,
        winRate: 33.3,
        totalTrades: 6,
        openPositions: 0,
      },
      profitTrajectory: [
        { date: "2026-04-15T13:00:00.000Z", pnL: 100 },
        { date: "2026-04-16T13:00:00.000Z", pnL: -120 },
        { date: "2026-04-17T13:00:00.000Z", pnL: -80 },
        { date: "2026-04-18T13:00:00.000Z", pnL: -320 },
      ],
      openPositions: [],
    })

    expect(overview.summary).toContain("down")
    expect(overview.focusMessage).toContain("review")
    expect(overview.insights[0]).toEqual({
      title: "Current streak",
      value: "3 losses",
      detail: "Pause and review the most recent setups before adding risk.",
      tone: "warning",
    })
  })
})
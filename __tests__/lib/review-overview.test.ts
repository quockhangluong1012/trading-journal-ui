import { describe, expect, it } from "vitest"
import { ReviewPeriodType, type ReviewData } from "@/lib/review-api"
import {
  buildReviewNarrative,
  buildReviewPulse,
  splitReviewItems,
} from "@/lib/review-overview"

const profitableReview: ReviewData = {
  periodType: ReviewPeriodType.Weekly,
  periodStart: "2026-04-13",
  periodEnd: "2026-04-19",
  aiSummaryGenerating: false,
  totalPnl: 2650,
  winRate: 63.6,
  totalTrades: 11,
  wins: 7,
  losses: 4,
  averageWin: 580,
  averageLoss: -210,
  bestTradePnl: 1240,
  worstTradePnl: -330,
  bestDayPnl: 1480,
  worstDayPnl: -290,
  longTrades: 7,
  shortTrades: 4,
  ruleBreakTrades: 1,
  highConfidenceTrades: 6,
  topAsset: "XAUUSD",
  primaryTradingZone: "London",
  dominantEmotion: "Focused",
  topTechnicalTheme: "Liquidity sweep",
}

describe("splitReviewItems", () => {
  it("trims delimited review content into a clean list", () => {
    expect(splitReviewItems("Wait for closes|||Reduce size after a loss||| ")).toEqual([
      "Wait for closes",
      "Reduce size after a loss",
    ])
  })

  it("returns an empty list when there is no stored content", () => {
    expect(splitReviewItems(undefined)).toEqual([])
  })
})

describe("buildReviewNarrative", () => {
  it("builds a positive command-center narrative when the review is controlled", () => {
    const narrative = buildReviewNarrative(profitableReview, "Apr 13 – Apr 19, 2026")

    expect(narrative.headline).toContain("controlled edge")
    expect(narrative.detail).toContain("XAUUSD")
    expect(narrative.detail).toContain("London")
  })

  it("returns an empty-state narrative when no trades are closed", () => {
    const narrative = buildReviewNarrative(
      {
        ...profitableReview,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalPnl: 0,
      },
      "Q2 2026",
    )

    expect(narrative.headline).toContain("No closed trades")
    expect(narrative.detail).toContain("journal")
  })
})

describe("buildReviewPulse", () => {
  it("creates pulse cards for edge, win rate, trade mix, and discipline", () => {
    expect(buildReviewPulse(profitableReview)).toEqual([
      {
        label: "Edge",
        value: "+$2.7K",
        detail: "Net P&L",
        tone: "positive",
      },
      {
        label: "Win rate",
        value: "63.6%",
        detail: "7 wins / 4 losses",
        tone: "positive",
      },
      {
        label: "Trade mix",
        value: "7L / 4S",
        detail: "XAUUSD leading in London",
        tone: "positive",
      },
      {
        label: "Discipline",
        value: "1 slip",
        detail: "6 high-confidence trades",
        tone: "positive",
      },
    ])
  })

  it("returns calmer empty-state pulse cards when no trades are closed", () => {
    expect(
      buildReviewPulse({
        ...profitableReview,
        totalTrades: 0,
        totalPnl: 0,
        wins: 0,
        losses: 0,
        longTrades: 0,
        shortTrades: 0,
        ruleBreakTrades: 0,
        highConfidenceTrades: 0,
      }),
    ).toEqual([
      {
        label: "Edge",
        value: "$0",
        detail: "Waiting for the first close",
        tone: "neutral",
      },
      {
        label: "Win rate",
        value: "Open",
        detail: "Settles once winners and losers print",
        tone: "neutral",
      },
      {
        label: "Trade mix",
        value: "No mix yet",
        detail: "Long versus short split appears after the first close",
        tone: "neutral",
      },
      {
        label: "Discipline",
        value: "Unscored",
        detail: "Rule breaks and confidence show up after execution",
        tone: "neutral",
      },
    ])
  })
})
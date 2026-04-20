import type { ReviewData } from "@/lib/review-api"

export type ReviewTone = "positive" | "neutral" | "warning"

export interface ReviewNarrative {
  headline: string
  detail: string
}

export interface ReviewPulse {
  label: string
  value: string
  detail: string
  tone: ReviewTone
}

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

const plainCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

export function splitReviewItems(value?: string): string[] {
  if (!value) {
    return []
  }

  return value
    .split("|||")
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatSignedCompactCurrency(value: number): string {
  const formatted =
    Math.abs(value) < 1000
      ? plainCurrencyFormatter.format(value)
      : compactCurrencyFormatter.format(value)

  if (value > 0) {
    return `+${formatted}`
  }

  return formatted
}

function formatWinRate(value: number): string {
  return `${value.toFixed(1)}%`
}

function getEdgeTone(review: ReviewData): ReviewTone {
  if (review.totalPnl > 0) {
    return "positive"
  }

  if (review.totalPnl < 0) {
    return "warning"
  }

  return "neutral"
}

function getWinRateTone(review: ReviewData): ReviewTone {
  if (review.winRate >= 55) {
    return "positive"
  }

  if (review.winRate >= 45) {
    return "neutral"
  }

  return "warning"
}

function getDisciplineTone(review: ReviewData): ReviewTone {
  if (review.ruleBreakTrades === 0) {
    return "positive"
  }

  if (review.ruleBreakTrades === 1) {
    return "positive"
  }

  return "warning"
}

export function buildReviewNarrative(
  review: ReviewData | null,
  periodLabel: string,
): ReviewNarrative {
  if (!review || review.totalTrades === 0) {
    return {
      headline: `No closed trades in ${periodLabel} yet.`,
      detail:
        "Close a few trades and leave a journal note so the review workspace can surface pattern quality, discipline drift, and AI coaching.",
    }
  }

  if (review.totalPnl > 0 && review.winRate >= 55 && review.ruleBreakTrades <= 1) {
    return {
      headline: `${periodLabel} is showing a controlled edge.`,
      detail: `${formatSignedCompactCurrency(review.totalPnl)} across ${review.totalTrades} closed trades. ${review.topAsset ? `${review.topAsset} is carrying the cleanest flow` : "Your best setups are separating from the rest"}${review.primaryTradingZone ? ` in ${review.primaryTradingZone}` : ""}, while ${review.dominantEmotion ? review.dominantEmotion.toLowerCase() : "steady"} execution is keeping the book composed.`,
    }
  }

  if (review.totalPnl > 0) {
    return {
      headline: `${periodLabel} is profitable, but still uneven.`,
      detail: `${formatSignedCompactCurrency(review.totalPnl)} is on the board with ${formatWinRate(review.winRate)} win rate, but ${review.ruleBreakTrades} ${review.ruleBreakTrades === 1 ? "discipline slip" : "discipline slips"} and an average loss of ${formatSignedCompactCurrency(review.averageLoss)} are keeping the curve noisier than it should be.`,
    }
  }

  if (review.totalPnl < 0) {
    return {
      headline: `${periodLabel} needs a reset before pressing risk again.`,
      detail: `${formatSignedCompactCurrency(review.totalPnl)} across ${review.totalTrades} closed trades.${review.ruleBreakTrades > 0 ? ` ${review.ruleBreakTrades} rule breaks are stretching the drawdown.` : ""} ${review.topTechnicalTheme ? `${review.topTechnicalTheme} is the clearest theme to review first.` : "Start with the weakest setups before sizing back up."}`,
    }
  }

  return {
    headline: `${periodLabel} is flat, with no real separation yet.`,
    detail:
      "The period has enough activity to review, but the edge is not decisive. Tighten selection and use the AI summary to isolate what is noise versus repeatable quality.",
  }
}

export function buildReviewPulse(review: ReviewData | null): ReviewPulse[] {
  if (!review || review.totalTrades === 0) {
    return [
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
    ]
  }

  return [
    {
      label: "Edge",
      value: formatSignedCompactCurrency(review.totalPnl),
      detail: "Net P&L",
      tone: getEdgeTone(review),
    },
    {
      label: "Win rate",
      value: formatWinRate(review.winRate),
      detail: `${review.wins} wins / ${review.losses} losses`,
      tone: getWinRateTone(review),
    },
    {
      label: "Trade mix",
      value: `${review.longTrades}L / ${review.shortTrades}S`,
      detail:
        review.topAsset && review.primaryTradingZone
          ? `${review.topAsset} leading in ${review.primaryTradingZone}`
          : review.topAsset
            ? `${review.topAsset} is leading this period`
            : "Direction split",
      tone: review.totalTrades > 0 ? "positive" : "neutral",
    },
    {
      label: "Discipline",
      value:
        review.ruleBreakTrades === 0
          ? "Clean"
          : `${review.ruleBreakTrades} ${review.ruleBreakTrades === 1 ? "slip" : "slips"}`,
      detail: `${review.highConfidenceTrades} high-confidence trades`,
      tone: getDisciplineTone(review),
    },
  ]
}
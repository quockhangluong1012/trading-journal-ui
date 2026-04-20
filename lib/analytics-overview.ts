import type { AssetBreakdown, PerformanceSummary } from "@/lib/analytics-api"

export type AnalyticsTone = "positive" | "neutral" | "warning"

export interface AnalyticsNarrative {
  headline: string
  detail: string
}

export interface AnalyticsPulse {
  label: string
  value: string
  detail: string
  tone: AnalyticsTone
}

const RANGE_CONTEXT: Record<string, string> = {
  "1W": "the last week",
  "1M": "the last month",
  "3M": "the last 3 months",
  "6M": "the last 6 months",
  All: "all time",
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

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function formatRangeContext(rangeLabel: string): string {
  return RANGE_CONTEXT[rangeLabel] ?? rangeLabel.toLowerCase()
}

function formatSignedCompactCurrency(value: number): string {
  const formattedValue =
    Math.abs(value) < 1000
      ? plainCurrencyFormatter.format(value)
      : compactCurrencyFormatter.format(value)

  if (value > 0) {
    return `+${formattedValue}`
  }

  return formattedValue
}

function getProfitFactorTone(profitFactor: number): AnalyticsTone {
  if (profitFactor >= 1.6) {
    return "positive"
  }

  if (profitFactor >= 1) {
    return "neutral"
  }

  return "warning"
}

function getDrawdownTone(maxDrawdownPct: number): AnalyticsTone {
  if (maxDrawdownPct < 10) {
    return "positive"
  }

  if (maxDrawdownPct < 20) {
    return "neutral"
  }

  return "warning"
}

function getExpectancyTone(expectancy: number): AnalyticsTone {
  if (expectancy > 0) {
    return "positive"
  }

  if (expectancy === 0) {
    return "neutral"
  }

  return "warning"
}

export function getTopAsset(assetData: AssetBreakdown[]): AssetBreakdown | null {
  return assetData.reduce<AssetBreakdown | null>((topAsset, asset) => {
    if (!topAsset || asset.pnl > topAsset.pnl) {
      return asset
    }

    return topAsset
  }, null)
}

export function buildAnalyticsNarrative({
  analytics,
  rangeLabel,
  topAsset,
}: {
  analytics: PerformanceSummary
  rangeLabel: string
  topAsset: AssetBreakdown | null
}): AnalyticsNarrative {
  const rangeContext = formatRangeContext(rangeLabel)

  if (analytics.totalClosed === 0) {
    return {
      headline: `No closed trades in ${rangeContext} yet.`,
      detail:
        "Log a few completed trades or widen the range to unlock pattern analysis, expectancy, and drawdown context.",
    }
  }

  if (
    analytics.totalPnl > 0 &&
    analytics.sharpeRatio >= 1 &&
    analytics.maxDrawdownPct <= 15
  ) {
    return {
      headline: `Your ${rangeContext} performance is compounding with control.`,
      detail: `${formatSignedCompactCurrency(analytics.totalPnl)} across ${analytics.totalClosed} closed trades at ${percentageFormatter.format(analytics.winRate)}% win rate.${topAsset ? ` ${topAsset.asset} is leading with ${formatSignedCompactCurrency(topAsset.pnl)}.` : ""}`,
    }
  }

  if (analytics.totalPnl > 0) {
    return {
      headline: `You are profitable in ${rangeContext}, but the book is still uneven.`,
      detail: `${formatSignedCompactCurrency(analytics.totalPnl)} total P&L with ${percentageFormatter.format(analytics.winRate)}% win rate. Focus on lifting consistency and protecting against the ${percentageFormatter.format(analytics.maxDrawdownPct)}% drawdown pocket.`,
    }
  }

  if (analytics.totalPnl < 0) {
    return {
      headline: `The edge is under pressure in ${rangeContext}.`,
      detail: `${formatSignedCompactCurrency(analytics.totalPnl)} across ${analytics.totalClosed} closed trades.${topAsset && topAsset.pnl > 0 ? ` ${topAsset.asset} is still contributing ${formatSignedCompactCurrency(topAsset.pnl)}.` : ""} Tighten risk and review the weakest setups before sizing back up.`,
    }
  }

  return {
    headline: `The book is flat in ${rangeContext}.`,
    detail: `${analytics.totalClosed} closed trades are on the board, but there is not enough separation between winners and losers yet.`,
  }
}

export function buildAnalyticsPulse(
  analytics: PerformanceSummary,
  topAsset: AssetBreakdown | null,
): AnalyticsPulse[] {
  return [
    {
      label: "Edge",
      value: analytics.profitFactor >= 1e15 ? "Lossless" : analytics.profitFactor.toFixed(2),
      detail: analytics.profitFactor >= 1e15 ? "No losing trades in this window" : "Profit factor",
      tone: getProfitFactorTone(analytics.profitFactor),
    },
    {
      label: "Risk",
      value: `${percentageFormatter.format(analytics.maxDrawdownPct)}%`,
      detail: "Max drawdown",
      tone: getDrawdownTone(analytics.maxDrawdownPct),
    },
    {
      label: "Expectancy",
      value: formatSignedCompactCurrency(analytics.expectancy),
      detail: "Expected P&L per trade",
      tone: getExpectancyTone(analytics.expectancy),
    },
    topAsset
      ? {
          label: "Top instrument",
          value: topAsset.asset,
          detail: `${formatSignedCompactCurrency(topAsset.pnl)} over ${topAsset.count} trades`,
          tone:
            topAsset.pnl > 0 ? "positive" : topAsset.pnl < 0 ? "warning" : "neutral",
        }
      : {
          label: "Top instrument",
          value: "No leader",
          detail: "Close more trades to surface a standout market.",
          tone: "neutral",
        },
  ]
}
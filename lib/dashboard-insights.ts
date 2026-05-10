import type { AssetBreakdown } from "@/lib/analytics-api"
import { TradeHistory } from "@/app/types/trade"
import { PositionType } from "@/lib/enum/PositionType"

export interface DashboardBaseStats {
  totalPnL: number
  winRate: number
  totalTrades: number
  openPositions: number
}

export interface DashboardRiskUsage {
  dailyLimitUsedPercent: number
  weeklyCapUsedPercent: number
}

export interface DashboardStats extends DashboardBaseStats, DashboardRiskUsage {
  expectancy: number
  profitFactor: number
}

export interface ProfitTrajectoryPoint {
  date: string
  pnL: number | null | undefined
}

export interface ProfitChartPoint {
  date: string
  profit: number
}

export interface DailyPerformancePoint {
  date: string
  pnl: number
}

export type AssetBreakdownMetric = "pnl" | "count"

export interface AssetBreakdownChartDataResult {
  chartData: AssetBreakdown[]
  totalPnl: number
  totalTrades: number
  leadingAsset: AssetBreakdown | null
}

export interface OutcomeStreak {
  count: number
  direction: "win" | "loss" | "flat"
}

export interface OpenPositionSummary {
  avgRiskReward: number | null
  highConfidenceCount: number
  longCount: number
  shortCount: number
}

export interface DashboardInsightTile {
  title: string
  value: string
  detail: string
  tone: "positive" | "neutral" | "warning"
}

export interface ProfitChartDataResult {
  chartData: ProfitChartPoint[]
  totalPnL: number
  dailyPerformance: DailyPerformancePoint[]
}

export interface DashboardOverview {
  summary: string
  focusMessage: string
  streak: OutcomeStreak
  bestDay: DailyPerformancePoint | null
  worstDay: DailyPerformancePoint | null
  activeTradingDays: number
  openPositionsSummary: OpenPositionSummary
  insights: DashboardInsightTile[]
}

interface BuildDashboardOverviewOptions {
  filterLabel: string
  stats: DashboardStats
  profitTrajectory: ProfitTrajectoryPoint[]
  openPositions: TradeHistory[]
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeDateKey(dateValue: string): string | null {
  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate.toISOString().slice(0, 10)
}

function formatShortDate(dateValue: string): string {
  const parsedDate = new Date(dateValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue
  }

  return shortDateFormatter.format(parsedDate)
}

function getPluralizedLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

function normalizeAssetBreakdown(items: AssetBreakdown[]): AssetBreakdown[] {
  return items
    .filter(
      (item) =>
        typeof item.asset === "string" &&
        item.asset.trim().length > 0 &&
        isFiniteNumber(item.pnl) &&
        Number.isFinite(item.count),
    )
    .map((item) => ({
      asset: item.asset.trim(),
      pnl: item.pnl,
      count: item.count,
      winRate: isFiniteNumber(item.winRate) ? item.winRate : 0,
    }))
}

function normalizeProfitTrajectory(points: ProfitTrajectoryPoint[]): Array<{ date: string; pnL: number }> {
  return points
    .filter((point) => typeof point.date === "string" && normalizeDateKey(point.date) && isFiniteNumber(point.pnL))
    .map((point) => ({
      date: point.date,
      pnL: point.pnL as number,
    }))
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
}

export function calculateExpectancy(points: ProfitTrajectoryPoint[]): number {
  const normalizedPoints = normalizeProfitTrajectory(points)

  if (normalizedPoints.length === 0) {
    return 0
  }

  const totalPnL = normalizedPoints.reduce((sum, point) => sum + point.pnL, 0)

  return roundToTwoDecimals(totalPnL / normalizedPoints.length)
}

export function calculateProfitFactor(points: ProfitTrajectoryPoint[]): number {
  const normalizedPoints = normalizeProfitTrajectory(points)

  if (normalizedPoints.length === 0) {
    return 0
  }

  const grossProfit = normalizedPoints
    .filter((point) => point.pnL > 0)
    .reduce((sum, point) => sum + point.pnL, 0)
  const grossLoss = Math.abs(
    normalizedPoints
      .filter((point) => point.pnL < 0)
      .reduce((sum, point) => sum + point.pnL, 0),
  )

  if (grossLoss === 0) {
    return grossProfit > 0 ? Number.POSITIVE_INFINITY : 0
  }

  return roundToTwoDecimals(grossProfit / grossLoss)
}

export function buildDashboardStats(
  baseStats: DashboardBaseStats,
  profitTrajectory: ProfitTrajectoryPoint[],
  riskUsage: Partial<DashboardRiskUsage> = {},
): DashboardStats {
  return {
    ...baseStats,
    expectancy: calculateExpectancy(profitTrajectory),
    profitFactor: calculateProfitFactor(profitTrajectory),
    dailyLimitUsedPercent: riskUsage.dailyLimitUsedPercent ?? 0,
    weeklyCapUsedPercent: riskUsage.weeklyCapUsedPercent ?? 0,
  }
}

function getBestAndWorstDay(dailyPerformance: DailyPerformancePoint[]): {
  bestDay: DailyPerformancePoint | null
  worstDay: DailyPerformancePoint | null
} {
  if (dailyPerformance.length === 0) {
    return {
      bestDay: null,
      worstDay: null,
    }
  }

  let bestDay = dailyPerformance[0]
  let worstDay = dailyPerformance[0]

  for (const day of dailyPerformance) {
    if (day.pnl > bestDay.pnl) {
      bestDay = day
    }

    if (day.pnl < worstDay.pnl) {
      worstDay = day
    }
  }

  return {
    bestDay,
    worstDay,
  }
}

function buildStreakInsight(streak: OutcomeStreak): DashboardInsightTile {
  if (streak.direction === "flat" || streak.count === 0) {
    return {
      title: "Current streak",
      value: "No streak",
      detail: "Close a few trades to reveal your current momentum.",
      tone: "neutral",
    }
  }

  if (streak.direction === "win") {
    return {
      title: "Current streak",
      value: `${streak.count} ${getPluralizedLabel(streak.count, "win", "wins")}`,
      detail: "Momentum is positive in the latest closed trades.",
      tone: "positive",
    }
  }

  return {
    title: "Current streak",
    value: `${streak.count} ${getPluralizedLabel(streak.count, "loss", "losses")}`,
    detail: "Pause and review the most recent setups before adding risk.",
    tone: "warning",
  }
}

function buildBestDayInsight(bestDay: DailyPerformancePoint | null): DashboardInsightTile {
  if (!bestDay) {
    return {
      title: "Best day",
      value: "No data",
      detail: "You have not closed a trade in this period yet.",
      tone: "neutral",
    }
  }

  return {
    title: "Best day",
    value: currencyFormatter.format(bestDay.pnl),
    detail: `Your strongest trading day in this period was ${formatShortDate(bestDay.date)}.`,
    tone: bestDay.pnl > 0 ? "positive" : "warning",
  }
}

function buildActiveDaysInsight(activeTradingDays: number): DashboardInsightTile {
  return {
    title: "Active trading days",
    value: `${activeTradingDays} ${getPluralizedLabel(activeTradingDays, "day", "days")}`,
    detail: `You found opportunity on ${activeTradingDays} separate ${getPluralizedLabel(activeTradingDays, "session", "sessions")}.`,
    tone: "neutral",
  }
}

function buildOpenSetupQualityInsight(
  openPositions: TradeHistory[],
  openPositionSummary: OpenPositionSummary,
): DashboardInsightTile {
  if (openPositions.length === 0 || openPositionSummary.avgRiskReward === null) {
    return {
      title: "Open setup quality",
      value: "No open risk",
      detail: "Your book is clear. Protect that selectivity on the next trade.",
      tone: "neutral",
    }
  }

  const convictionVerb = openPositions.length === 1 ? "has" : "have"
  const convictionTone = openPositionSummary.avgRiskReward >= 2 ? "positive" : "warning"

  return {
    title: "Open setup quality",
    value: `${openPositionSummary.avgRiskReward.toFixed(1)}R avg`,
    detail: `${openPositionSummary.highConfidenceCount} of ${openPositions.length} open ${getPluralizedLabel(openPositions.length, "trade", "trades")} ${convictionVerb} high conviction.`,
    tone: convictionTone,
  }
}

export function buildProfitChartData(points: ProfitTrajectoryPoint[]): ProfitChartDataResult {
  const normalizedPoints = normalizeProfitTrajectory(points)
  const dailyTotals = new Map<string, number>()
  let cumulativeProfit = 0

  const chartData = normalizedPoints.map((point) => {
    cumulativeProfit += point.pnL

    const dateKey = normalizeDateKey(point.date)
    if (dateKey) {
      dailyTotals.set(dateKey, (dailyTotals.get(dateKey) ?? 0) + point.pnL)
    }

    return {
      date: point.date,
      profit: cumulativeProfit,
    }
  })

  const dailyPerformance = Array.from(dailyTotals.entries()).map(([date, pnl]) => ({
    date,
    pnl,
  }))

  return {
    chartData,
    totalPnL: cumulativeProfit,
    dailyPerformance,
  }
}

export function buildAssetBreakdownChartData(
  items: AssetBreakdown[],
  metric: AssetBreakdownMetric,
): AssetBreakdownChartDataResult {
  const normalizedItems = normalizeAssetBreakdown(items)
  const totalPnl = normalizedItems.reduce((sum, item) => sum + item.pnl, 0)
  const totalTrades = normalizedItems.reduce((sum, item) => sum + item.count, 0)

  const chartData = [...normalizedItems].sort((left, right) => {
    if (metric === "pnl") {
      // Rank assets by total impact first so large losses remain visible near the top.
      const absolutePnlDelta = Math.abs(right.pnl) - Math.abs(left.pnl)

      if (absolutePnlDelta !== 0) {
        return absolutePnlDelta
      }

      if (right.count !== left.count) {
        return right.count - left.count
      }

      return left.asset.localeCompare(right.asset)
    }

    if (right.count !== left.count) {
      return right.count - left.count
    }

    // When trade counts tie, surface the asset with the larger P&L impact.
    const absolutePnlDelta = Math.abs(right.pnl) - Math.abs(left.pnl)

    if (absolutePnlDelta !== 0) {
      return absolutePnlDelta
    }

    return left.asset.localeCompare(right.asset)
  })

  return {
    chartData,
    totalPnl,
    totalTrades,
    leadingAsset: chartData[0] ?? null,
  }
}

export function calculateOutcomeStreak(points: ProfitTrajectoryPoint[]): OutcomeStreak {
  const normalizedPoints = normalizeProfitTrajectory(points).filter((point) => point.pnL !== 0)

  if (normalizedPoints.length === 0) {
    return {
      count: 0,
      direction: "flat",
    }
  }

  const latestOutcome = normalizedPoints[normalizedPoints.length - 1]
  const direction: OutcomeStreak["direction"] = latestOutcome.pnL > 0 ? "win" : "loss"
  let count = 0

  for (let index = normalizedPoints.length - 1; index >= 0; index -= 1) {
    const point = normalizedPoints[index]
    const matchesDirection = direction === "win" ? point.pnL > 0 : point.pnL < 0

    if (!matchesDirection) {
      break
    }

    count += 1
  }

  return {
    count,
    direction,
  }
}

export function summarizeOpenPositions(openPositions: TradeHistory[]): OpenPositionSummary {
  let highConfidenceCount = 0
  let longCount = 0
  let shortCount = 0
  let rewardRiskTotal = 0
  let rewardRiskCount = 0

  for (const trade of openPositions) {
    if (trade.confidenceLevel >= 4) {
      highConfidenceCount += 1
    }

    if (trade.position === PositionType.Long) {
      longCount += 1
    }

    if (trade.position === PositionType.Short) {
      shortCount += 1
    }

    const riskPerUnit = Math.abs(trade.entryPrice - trade.stopLoss)
    const rewardPerUnit = Math.abs(trade.targetTier1 - trade.entryPrice)

    if (riskPerUnit > 0 && rewardPerUnit > 0) {
      rewardRiskTotal += rewardPerUnit / riskPerUnit
      rewardRiskCount += 1
    }
  }

  return {
    avgRiskReward: rewardRiskCount > 0 ? roundToOneDecimal(rewardRiskTotal / rewardRiskCount) : null,
    highConfidenceCount,
    longCount,
    shortCount,
  }
}

export function buildDashboardOverview({
  filterLabel,
  stats,
  profitTrajectory,
  openPositions,
}: BuildDashboardOverviewOptions): DashboardOverview {
  const profitData = buildProfitChartData(profitTrajectory)
  const streak = calculateOutcomeStreak(profitTrajectory)
  const openPositionsSummary = summarizeOpenPositions(openPositions)
  const { bestDay, worstDay } = getBestAndWorstDay(profitData.dailyPerformance)
  const activeTradingDays = profitData.dailyPerformance.length

  let summary = `You are flat in ${filterLabel.toLowerCase()} with ${stats.totalTrades} trades logged.`

  if (stats.totalPnL > 0) {
    summary = `You are profitable in ${filterLabel.toLowerCase()} with a ${percentageFormatter.format(stats.winRate)}% win rate across ${stats.totalTrades} trades.`
  } else if (stats.totalPnL < 0) {
    summary = `You are down ${currencyFormatter.format(Math.abs(stats.totalPnL))} in ${filterLabel.toLowerCase()}. Slow down and tighten execution before adding size.`
  } else if (stats.totalTrades === 0) {
    summary = `No trades are logged in ${filterLabel.toLowerCase()} yet. Start a session or capture a new setup to build your baseline.`
  }

  let focusMessage = "Stay selective and keep journaling the context behind your best setups."

  if (streak.direction === "loss" && streak.count >= 2) {
    focusMessage = `Your recent results need review. Inspect the last ${streak.count} ${getPluralizedLabel(streak.count, "loss", "losses")} before opening new risk.`
  } else if (openPositionsSummary.highConfidenceCount > 0) {
    focusMessage = `Lean on your high-conviction exposure. ${openPositionsSummary.highConfidenceCount} open ${getPluralizedLabel(openPositionsSummary.highConfidenceCount, "trade still matches", "trades still match")} your strongest ideas.`
  } else if (openPositionsSummary.avgRiskReward !== null && openPositionsSummary.avgRiskReward < 1.5) {
    focusMessage = "Open exposure is live, but average reward-to-risk is light. Protect capital before stacking more positions."
  } else if (openPositions.length === 0) {
    focusMessage = "You have no open exposure right now. Use the clean book to review and queue the next disciplined setup."
  }

  return {
    summary,
    focusMessage,
    streak,
    bestDay,
    worstDay,
    activeTradingDays,
    openPositionsSummary,
    insights: [
      buildStreakInsight(streak),
      buildBestDayInsight(bestDay),
      buildActiveDaysInsight(activeTradingDays),
      buildOpenSetupQualityInsight(openPositions, openPositionsSummary),
    ],
  }
}
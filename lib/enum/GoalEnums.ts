// Mirrors of the backend Goals module integer enums.
// Source: trading-journal-backend/modules/Goals/.../Common/Enum/*.cs

export enum TrackingMode {
  Manual = 1,
  Metric = 2,
}

export enum MetricDirection {
  /** Progress climbs toward a higher target (e.g. win count). */
  AtLeast = 1,
  /** Progress descends toward a lower target (e.g. max drawdown). */
  AtMost = 2,
}

export enum GoalMetricSource {
  TradeJournaledCount = 1,
  TradeClosedCount = 2,
  WinningTradeCount = 3,
  TradingPnl = 4,
  BacktestSessionCount = 5,
  BacktestTradeCount = 6,
  BacktestWinningTradeCount = 7,
  BacktestPnl = 8,
}

export enum GoalItemType {
  Goal = 1,
  Milestone = 2,
  Task = 3,
}

export enum GoalActivitySourceType {
  TradeHistory = 1,
  BacktestSession = 2,
}

// ─── Display helpers ──────────────────────────────────────────────────

export const METRIC_DIRECTION_LABELS: Record<MetricDirection, string> = {
  [MetricDirection.AtLeast]: "Reach at least",
  [MetricDirection.AtMost]: "Stay at most",
}

export const GOAL_METRIC_SOURCE_LABELS: Record<GoalMetricSource, string> = {
  [GoalMetricSource.TradeJournaledCount]: "Trades journaled",
  [GoalMetricSource.TradeClosedCount]: "Trades closed",
  [GoalMetricSource.WinningTradeCount]: "Winning trades",
  [GoalMetricSource.TradingPnl]: "Trading P&L",
  [GoalMetricSource.BacktestSessionCount]: "Backtest sessions",
  [GoalMetricSource.BacktestTradeCount]: "Backtest trades",
  [GoalMetricSource.BacktestWinningTradeCount]: "Backtest winning trades",
  [GoalMetricSource.BacktestPnl]: "Backtest P&L",
}

/** Metric sources are auto-tracked from app activity — chosen as a dropdown when creating a goal. */
export const GOAL_METRIC_SOURCE_OPTIONS: { value: GoalMetricSource; label: string }[] =
  Object.entries(GOAL_METRIC_SOURCE_LABELS).map(([value, label]) => ({
    value: Number(value) as GoalMetricSource,
    label,
  }))

export const GOAL_ACTIVITY_SOURCE_LABELS: Record<GoalActivitySourceType, string> = {
  [GoalActivitySourceType.TradeHistory]: "Trade history",
  [GoalActivitySourceType.BacktestSession]: "Backtest session",
}

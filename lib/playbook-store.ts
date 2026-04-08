import { PlaybookResults, PlaybookTrade } from "@/app/types/play-book-trade"
import { PlaybookStrategy } from "@/app/types/play-book-strategy"
import { PlaybookType } from "@/app/constants/playbook"

// --- Constants ---

export const PLAYBOOK_ASSETS = [
  "BTC/USD", "ETH/USD", "SOL/USD", "AAPL", "TSLA",
  "NVDA", "AMD", "MSFT", "GOOGL", "META",
  "SPY", "QQQ", "AMZN", "JPM", "GS",
  "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD",
]

export const PLAYBOOK_TIMEFRAMES = [
  { id: "1m", label: "1 Minute" },
  { id: "5m", label: "5 Minutes" },
  { id: "15m", label: "15 Minutes" },
  { id: "1h", label: "1 Hour" },
  { id: "4h", label: "4 Hours" },
  { id: "1D", label: "Daily" },
  { id: "1W", label: "Weekly" },
]

export const ENTRY_INDICATORS = [
  "Fair Value Gap",
  "Order Block",
  "Liquidity Sweep",
  "Break of Structure",
  "Change of Character",
  "Supply Zone",
  "Demand Zone",
  "Fibonacci Retracement",
  "Golden Pocket",
  "Imbalance",
  "Mitigation Block",
  "Breaker Block",
  "Rejection Block",
  "Head and Shoulders",
  "Double Top",
  "Double Bottom",
  "Rising Wedge",
  "Falling Wedge",
  "Bull Flag",
  "Bear Flag",
  "Ascending Triangle",
  "Descending Triangle",
  "Support Bounce",
  "Resistance Rejection",
  "Trendline Break",
  "Volume Profile",
  "VWAP Reclaim",
  "EMA Cross",
  "SMA Cross",
  "RSI Divergence",
  "MACD Cross",
  "Bollinger Squeeze",
  "Ichimoku Cloud",
  "Wyckoff Accumulation",
  "Wyckoff Distribution",
  "Smart Money Concept",
  "Institutional Candle",
  "Gap Fill",
  "Opening Range Breakout",
  "Mean Reversion",
]

export const EXIT_INDICATORS = [
  "Take Profit Hit",
  "Stop Loss Hit",
  "Trailing Stop",
  "Time-Based Exit",
  "Reversal Signal",
  "Momentum Fade",
  "Break of Structure",
  "RSI Overbought/Oversold",
  "MACD Cross",
  "EMA Cross",
  "Support/Resistance Break",
  "Volume Climax",
]

// --- Sample Data ---

function generateEquityCurve(
  startDate: string,
  months: number,
  startingEquity: number,
  finalEquity: number,
  volatility: number
): { date: string; equity: number; drawdown: number }[] {
  const curve: { date: string; equity: number; drawdown: number }[] = []
  const days = months * 22 // trading days
  const dailyReturn = (finalEquity - startingEquity) / days
  let equity = startingEquity
  let peak = startingEquity
  const start = new Date(startDate)

  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + Math.floor(i * 1.45)) // skip weekends roughly
    const noise = (Math.random() - 0.45) * volatility
    equity += dailyReturn + noise
    equity = Math.max(equity, startingEquity * 0.8)
    peak = Math.max(peak, equity)
    const drawdown = ((peak - equity) / peak) * 100
    curve.push({
      date: d.toISOString().split("T")[0],
      equity: Math.round(equity),
      drawdown: Math.round(drawdown * 100) / 100,
    })
  }
  return curve
}

function generateTradeLog(
  count: number,
  winRate: number,
  avgWin: number,
  avgLoss: number,
  startDate: string
): PlaybookTrade[] {
  const trades: PlaybookTrade[] = []
  const start = new Date(startDate)
  const directions: ("long" | "short")[] = ["long", "short"]

  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + Math.floor(i * 3.5))
    const isWin = Math.random() < winRate / 100
    const pnl = isWin
      ? avgWin * (0.5 + Math.random())
      : -avgLoss * (0.5 + Math.random())
    const entry = 100 + Math.random() * 400
    const exit = entry + (entry * pnl) / 10000

    trades.push({
      id: `t-${i}`,
      date: d.toISOString().split("T")[0],
      direction: directions[Math.floor(Math.random() * 2)],
      entry: Math.round(entry * 100) / 100,
      exit: Math.round(exit * 100) / 100,
      pnl: Math.round(pnl),
      pnlPct: Math.round((pnl / 10000) * 10000) / 100,
      holdingDays: Math.floor(1 + Math.random() * 5),
    })
  }
  return trades
}

function generateMonthlyReturns(months: number, avgReturn: number): { month: string; returnPct: number }[] {
  const returns: { month: string; returnPct: number }[] = []
  const start = new Date("2024-01-01")
  for (let i = 0; i < months; i++) {
    const d = new Date(start)
    d.setMonth(d.getMonth() + i)
    const ret = avgReturn + (Math.random() - 0.4) * avgReturn * 3
    returns.push({
      month: d.toISOString().slice(0, 7),
      returnPct: Math.round(ret * 100) / 100,
    })
  }
  return returns
}

export const sampleStrategies: PlaybookStrategy[] = [
  {
    id: "strat-1",
    name: "SMC Order Block Scalping",
    description: "Identifies order blocks on the 15m timeframe and enters on retest with tight stops. Targets 2R minimum.",
    type: "backtest",
    status: "completed",
    createdAt: "2024-11-15",
    asset: "BTC/USD",
    timeframe: "15m",
    dateRange: { start: "2024-01-01", end: "2024-06-30" },
    entryIndicators: ["Order Block", "Break of Structure", "Fair Value Gap"],
    exitIndicators: ["Take Profit Hit", "Trailing Stop"],
    riskPerTrade: 1,
    stopLossType: "fixed",
    stopLossValue: 150,
    takeProfitType: "rr-ratio",
    takeProfitValue: 2.5,
    positionSizing: "percent-equity",
    positionSizeValue: 1,
    results: {
      totalTrades: 87,
      winRate: 58.6,
      profitFactor: 1.92,
      expectancy: 1.34,
      maxDrawdown: 3200,
      maxDrawdownPct: 6.4,
      netProfit: 11680,
      netProfitPct: 23.4,
      avgWin: 425,
      avgLoss: 220,
      largestWin: 1840,
      largestLoss: 680,
      avgHoldingPeriod: "4.2 hours",
      sharpeRatio: 1.85,
      equityCurve: generateEquityCurve("2024-01-01", 6, 50000, 61680, 300),
      tradeLog: generateTradeLog(87, 58.6, 425, 220, "2024-01-01"),
      monthlyReturns: generateMonthlyReturns(6, 3.9),
      wins: 0,
      losses: 0,
      side: ""
    },
  },
  {
    id: "strat-2",
    name: "Fibonacci Golden Pocket Swing",
    description: "Swing trading strategy using Fibonacci retracement golden pocket (0.618-0.65) zone entries on the 4H timeframe.",
    type: "backtest",
    status: "completed",
    createdAt: "2024-12-01",
    asset: "ETH/USD",
    timeframe: "4h",
    dateRange: { start: "2024-03-01", end: "2024-12-31" },
    entryIndicators: ["Fibonacci Retracement", "Golden Pocket", "Demand Zone", "RSI Divergence"],
    exitIndicators: ["Take Profit Hit", "Reversal Signal", "Break of Structure"],
    riskPerTrade: 1.5,
    stopLossType: "percent",
    stopLossValue: 2,
    takeProfitType: "rr-ratio",
    takeProfitValue: 3,
    positionSizing: "percent-equity",
    positionSizeValue: 1.5,
    results: {
      totalTrades: 42,
      winRate: 52.4,
      profitFactor: 2.38,
      expectancy: 2.12,
      maxDrawdown: 5100,
      maxDrawdownPct: 8.5,
      netProfit: 18900,
      netProfitPct: 31.5,
      avgWin: 1120,
      avgLoss: 470,
      largestWin: 4200,
      largestLoss: 1100,
      avgHoldingPeriod: "2.8 days",
      sharpeRatio: 2.15,
      equityCurve: generateEquityCurve("2024-03-01", 10, 60000, 78900, 500),
      tradeLog: generateTradeLog(42, 52.4, 1120, 470, "2024-03-01"),
      monthlyReturns: generateMonthlyReturns(10, 3.15),
      wins: 0,
      losses: 0,
      side: ""
    },
  },
  {
    id: "strat-3",
    name: "London Killzone Momentum",
    description: "Catches momentum moves during London Killzone using liquidity sweeps and EMA crosses. Quick in-and-out trades.",
    type: "forward",
    status: "completed",
    createdAt: "2025-01-01",
    asset: "EUR/USD",
    timeframe: "5m",
    dateRange: { start: "2025-01-01", end: "2025-01-31" },
    entryIndicators: ["Liquidity Sweep", "EMA Cross", "VWAP Reclaim"],
    exitIndicators: ["Take Profit Hit", "Time-Based Exit", "Momentum Fade"],
    riskPerTrade: 0.5,
    stopLossType: "atr",
    stopLossValue: 1.5,
    takeProfitType: "rr-ratio",
    takeProfitValue: 2,
    positionSizing: "fixed",
    positionSizeValue: 10000,
    results: {
      totalTrades: 34,
      winRate: 61.8,
      profitFactor: 1.65,
      expectancy: 0.82,
      maxDrawdown: 1800,
      maxDrawdownPct: 3.6,
      netProfit: 4280,
      netProfitPct: 8.6,
      avgWin: 310,
      avgLoss: 188,
      largestWin: 920,
      largestLoss: 450,
      avgHoldingPeriod: "1.2 hours",
      sharpeRatio: 1.42,
      equityCurve: generateEquityCurve("2025-01-01", 1, 50000, 54280, 150),
      tradeLog: generateTradeLog(34, 61.8, 310, 188, "2025-01-01"),
      monthlyReturns: generateMonthlyReturns(1, 8.6),
      wins: 0,
      losses: 0,
      side: ""
    },
  },
]

// --- Strategy Templates ---

export interface StrategyTemplate {
  id: string
  name: string
  description: string
  category: "scalping" | "swing" | "position" | "day-trading" | "custom"
  isBuiltIn: boolean
  config: Omit<PlaybookStrategy, "id" | "createdAt" | "status" | "results" | "name" | "description" | "type">
}

export const STRATEGY_CATEGORIES = [
  { id: "scalping", label: "Scalping", color: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
  { id: "swing", label: "Swing Trading", color: "text-blue-400 bg-blue-500/10 border-blue-500/25" },
  { id: "position", label: "Position", color: "text-purple-400 bg-purple-500/10 border-purple-500/25" },
  { id: "day-trading", label: "Day Trading", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
  { id: "custom", label: "Custom", color: "text-muted-foreground bg-secondary/40 border-border" },
] as const

export const builtInTemplates: StrategyTemplate[] = [
  {
    id: "tpl-smc-scalp",
    name: "SMC Order Block Scalp",
    description: "Quick entries on order block retests during killzones. Targets 2-3R with tight stops.",
    category: "scalping",
    isBuiltIn: true,
    config: {
      asset: "BTC/USD",
      timeframe: "5m",
      dateRange: { start: "2024-01-01", end: "2024-12-31" },
      entryIndicators: ["Order Block", "Break of Structure", "Fair Value Gap", "Liquidity Sweep"],
      exitIndicators: ["Take Profit Hit", "Trailing Stop", "Time-Based Exit"],
      riskPerTrade: 0.5,
      stopLossType: "fixed",
      stopLossValue: 80,
      takeProfitType: "rr-ratio",
      takeProfitValue: 2.5,
      positionSizing: "percent-equity",
      positionSizeValue: 0.5,
    },
  },
  {
    id: "tpl-fib-swing",
    name: "Fibonacci Golden Pocket Swing",
    description: "Enters on pullbacks to the golden pocket (0.618-0.65) with demand zone confluence.",
    category: "swing",
    isBuiltIn: true,
    config: {
      asset: "ETH/USD",
      timeframe: "4h",
      dateRange: { start: "2024-01-01", end: "2024-12-31" },
      entryIndicators: ["Fibonacci Retracement", "Golden Pocket", "Demand Zone", "RSI Divergence"],
      exitIndicators: ["Take Profit Hit", "Reversal Signal", "Break of Structure"],
      riskPerTrade: 1.5,
      stopLossType: "percent",
      stopLossValue: 3,
      takeProfitType: "rr-ratio",
      takeProfitValue: 3,
      positionSizing: "percent-equity",
      positionSizeValue: 1.5,
    },
  },
  {
    id: "tpl-momentum-day",
    name: "Momentum Day Trade",
    description: "Catches strong moves during NY session using VWAP and EMA crosses with volume confirmation.",
    category: "day-trading",
    isBuiltIn: true,
    config: {
      asset: "SPY",
      timeframe: "15m",
      dateRange: { start: "2024-01-01", end: "2024-12-31" },
      entryIndicators: ["EMA Cross", "VWAP Reclaim", "Volume Profile", "Break of Structure"],
      exitIndicators: ["Take Profit Hit", "Momentum Fade", "Time-Based Exit"],
      riskPerTrade: 1,
      stopLossType: "atr",
      stopLossValue: 1.5,
      takeProfitType: "rr-ratio",
      takeProfitValue: 2,
      positionSizing: "percent-equity",
      positionSizeValue: 1,
    },
  },
  {
    id: "tpl-trend-position",
    name: "Trend Following Position",
    description: "Long-term trend following using weekly structure and Ichimoku Cloud alignment.",
    category: "position",
    isBuiltIn: true,
    config: {
      asset: "AAPL",
      timeframe: "1D",
      dateRange: { start: "2024-01-01", end: "2024-12-31" },
      entryIndicators: ["Ichimoku Cloud", "EMA Cross", "Ascending Triangle", "Support Bounce"],
      exitIndicators: ["Trailing Stop", "Reversal Signal", "MACD Cross"],
      riskPerTrade: 2,
      stopLossType: "percent",
      stopLossValue: 5,
      takeProfitType: "rr-ratio",
      takeProfitValue: 4,
      positionSizing: "percent-equity",
      positionSizeValue: 2,
    },
  },
  {
    id: "tpl-mean-revert",
    name: "Mean Reversion Scalp",
    description: "Fades extreme moves using Bollinger Squeeze and RSI divergence at key levels.",
    category: "scalping",
    isBuiltIn: true,
    config: {
      asset: "EUR/USD",
      timeframe: "1m",
      dateRange: { start: "2024-01-01", end: "2024-12-31" },
      entryIndicators: ["Bollinger Squeeze", "RSI Divergence", "Mean Reversion", "Support Bounce"],
      exitIndicators: ["Take Profit Hit", "Stop Loss Hit", "Time-Based Exit"],
      riskPerTrade: 0.25,
      stopLossType: "fixed",
      stopLossValue: 15,
      takeProfitType: "rr-ratio",
      takeProfitValue: 1.5,
      positionSizing: "percent-equity",
      positionSizeValue: 0.25,
    },
  },
]

// --- Impact Estimator ---
// Estimates how parameter changes affect key metrics WITHOUT running a full backtest

export interface ImpactEstimate {
  estimatedWinRate: number
  estimatedPF: number
  estimatedExpectancy: number
  estimatedMaxDD: number
  riskRating: "low" | "moderate" | "high" | "extreme"
  edgeScore: number // 0-100
  warnings: string[]
  insights: string[]
}

export function estimateImpact(config: Omit<PlaybookStrategy, "id" | "createdAt" | "status" | "results">): ImpactEstimate {
  const warnings: string[] = []
  const insights: string[] = []

  // Confluence bonus from entry indicators
  const entryCount = config.entryIndicators.length
  const confluenceBonus = Math.min(entryCount * 2.5, 12)

  // R:R effect
  const rrValue = config.takeProfitType === "rr-ratio" ? config.takeProfitValue : 2
  const rrPenalty = rrValue > 3 ? -4 : rrValue > 2 ? 0 : 2 // higher RR = lower WR

  // Timeframe effect
  const tfEffect = { "1m": -3, "5m": -1, "15m": 0, "1h": 2, "4h": 3, "1D": 4, "1W": 5 }
  const tfBonus = (tfEffect as Record<string, number>)[config.timeframe] || 0

  // Base win rate
  const baseWR = 48
  const estimatedWinRate = Math.min(Math.max(baseWR + confluenceBonus + rrPenalty + tfBonus, 30), 75)

  // Profit factor
  const avgWinMultiple = rrValue * (0.7 + Math.random() * 0.3)
  const estimatedPF = Math.max(((estimatedWinRate / 100) * avgWinMultiple) / ((1 - estimatedWinRate / 100) * 1), 0.3)

  // Expectancy
  const estimatedExpectancy = (estimatedWinRate / 100) * avgWinMultiple - (1 - estimatedWinRate / 100) * 1

  // Max drawdown based on risk
  const riskMultiplier = config.riskPerTrade
  const estimatedMaxDD = Math.min(riskMultiplier * (4 + Math.random() * 3), 30)

  // Risk rating
  let riskRating: "low" | "moderate" | "high" | "extreme" = "moderate"
  if (config.riskPerTrade <= 0.5) riskRating = "low"
  else if (config.riskPerTrade <= 1.5) riskRating = "moderate"
  else if (config.riskPerTrade <= 3) riskRating = "high"
  else riskRating = "extreme"

  // Edge score (0-100)
  let edgeScore = 0
  if (estimatedPF >= 1.5) edgeScore += 25
  else if (estimatedPF >= 1.2) edgeScore += 15
  if (estimatedWinRate >= 55) edgeScore += 20
  else if (estimatedWinRate >= 50) edgeScore += 10
  if (rrValue >= 2) edgeScore += 20
  else if (rrValue >= 1.5) edgeScore += 10
  if (entryCount >= 3) edgeScore += 15
  else if (entryCount >= 2) edgeScore += 8
  if (config.exitIndicators.length >= 2) edgeScore += 10
  if (config.riskPerTrade <= 1) edgeScore += 10
  else if (config.riskPerTrade <= 2) edgeScore += 5

  // Generate warnings
  if (config.riskPerTrade > 2) warnings.push("Risk per trade exceeds 2% -- consider reducing for longevity")
  if (entryCount < 2) warnings.push("Only 1 entry indicator -- add confluences to improve accuracy")
  if (config.exitIndicators.length === 0) warnings.push("No exit rules defined -- trades need exit criteria")
  if (rrValue < 1.5) warnings.push("R:R below 1.5 -- difficult to be profitable long-term")
  if (config.stopLossType === "fixed" && config.stopLossValue > 500) warnings.push("Wide stop loss may increase max drawdown")
  if (config.timeframe === "1m") warnings.push("1-minute timeframe requires fast execution and high discipline")

  // Generate insights
  if (entryCount >= 4) insights.push("Strong confluence stack -- multiple confirmations improve entry quality")
  if (rrValue >= 3 && estimatedWinRate >= 45) insights.push("High R:R with decent win rate -- strong edge potential")
  if (config.riskPerTrade <= 0.5) insights.push("Conservative sizing protects capital during drawdowns")
  if (config.takeProfitType === "rr-ratio" && config.stopLossType === "atr") insights.push("ATR-based stops adapt to volatility -- good for dynamic markets")
  if (estimatedPF >= 2) insights.push("Estimated profit factor above 2 -- this is a strong statistical edge")

  return {
    estimatedWinRate: Math.round(estimatedWinRate * 10) / 10,
    estimatedPF: Math.round(estimatedPF * 100) / 100,
    estimatedExpectancy: Math.round(estimatedExpectancy * 100) / 100,
    estimatedMaxDD: Math.round(estimatedMaxDD * 10) / 10,
    riskRating,
    edgeScore: Math.min(edgeScore, 100),
    warnings,
    insights,
  }
}

// --- Engine helpers ---

export function runBacktest(strategy: PlaybookStrategy): PlaybookResults {
  // Simulated backtest engine - generates realistic results based on strategy parameters
  const months =
    (new Date(strategy.dateRange.end).getTime() - new Date(strategy.dateRange.start).getTime()) /
    (1000 * 60 * 60 * 24 * 30)

  // More indicators = slightly higher win rate (confluence)
  const indicatorBonus = Math.min(strategy.entryIndicators.length * 1.5, 8)
  // Tighter risk = better factor
  const riskBonus = strategy.riskPerTrade <= 1 ? 0.3 : strategy.riskPerTrade <= 2 ? 0.1 : -0.2
  // Higher R:R strategies have lower win rate but better expectancy
  const rrFactor = strategy.takeProfitType === "rr-ratio" ? strategy.takeProfitValue : 2

  const baseWinRate = 48 + indicatorBonus + (Math.random() * 8 - 4)
  const winRate = Math.min(Math.max(baseWinRate, 35), 72)
  const totalTrades = Math.floor(months * (strategy.timeframe === "1m" || strategy.timeframe === "5m" ? 18 : strategy.timeframe === "15m" ? 12 : strategy.timeframe === "1h" ? 8 : 4) + Math.random() * 10)

  const avgWin = strategy.stopLossValue * rrFactor * (0.8 + Math.random() * 0.4)
  const avgLoss = strategy.stopLossValue * (0.7 + Math.random() * 0.3)
  const profitFactor = ((winRate / 100) * avgWin) / ((1 - winRate / 100) * avgLoss) + riskBonus
  const expectancy = ((winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss) / avgLoss
  const netProfit = totalTrades * ((winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss)
  const startingEquity = strategy.positionSizing === "percent-equity" ? 50000 : strategy.positionSizeValue * 5

  return {
    totalTrades,
    winRate: Math.round(winRate * 10) / 10,
    profitFactor: Math.round(Math.max(profitFactor, 0.3) * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    maxDrawdown: Math.round(startingEquity * (0.03 + Math.random() * 0.08)),
    maxDrawdownPct: Math.round((3 + Math.random() * 8) * 10) / 10,
    netProfit: Math.round(netProfit),
    netProfitPct: Math.round((netProfit / startingEquity) * 1000) / 10,
    avgWin: Math.round(avgWin),
    avgLoss: Math.round(avgLoss),
    largestWin: Math.round(avgWin * (2 + Math.random() * 2)),
    largestLoss: Math.round(avgLoss * (1.5 + Math.random() * 1.5)),
    avgHoldingPeriod: strategy.timeframe === "1m" || strategy.timeframe === "5m"
      ? `${Math.round(0.5 + Math.random() * 2)} hours`
      : strategy.timeframe === "15m" || strategy.timeframe === "1h"
        ? `${Math.round(2 + Math.random() * 6)} hours`
        : `${Math.round(1 + Math.random() * 5)} days`,
    sharpeRatio: Math.round((0.8 + Math.random() * 1.8 + riskBonus) * 100) / 100,
    equityCurve: generateEquityCurve(
      strategy.dateRange.start,
      Math.max(months, 1),
      startingEquity,
      startingEquity + netProfit,
      Math.abs(netProfit) * 0.03
    ),
    tradeLog: generateTradeLog(totalTrades, winRate, Math.round(avgWin), Math.round(avgLoss), strategy.dateRange.start),
    monthlyReturns: generateMonthlyReturns(Math.max(Math.round(months), 1), netProfit > 0 ? (netProfit / startingEquity / months) * 100 : -2),
    wins: 0,
    losses: 0,
    side: ""
  }
}

// --- Progressive Backtest Engine ---
// Generates partial results at each tick so the UI can stream live updates

export interface BacktestProgress {
  progress: number // 0-100
  tradesProcessed: number
  totalTrades: number
  interimWinRate: number
  interimPnl: number
  interimProfitFactor: number
  equitySoFar: { date: string; equity: number; drawdown: number }[]
  phase: "initializing" | "processing" | "finalizing" | "complete"
}

export function runProgressiveBacktest(
  strategy: PlaybookStrategy,
  onProgress: (progress: BacktestProgress) => void,
  onComplete: (results: PlaybookResults) => void,
  totalDuration: number = 3000 // total ms for the simulation
): () => void {
  const finalResults = runBacktest(strategy)
  const totalTrades = finalResults.totalTrades
  const totalTicks = 20
  const tickInterval = totalDuration / totalTicks
  let tick = 0
  let cancelled = false

  const timer = setInterval(() => {
    if (cancelled) { clearInterval(timer); return }
    tick++
    const pct = Math.min(Math.round((tick / totalTicks) * 100), 100)
    const tradesProcessed = Math.round((tick / totalTicks) * totalTrades)

    // Build partial trade log
    const partialTrades = finalResults.tradeLog.slice(0, tradesProcessed)
    const wins = partialTrades.filter((t) => t.pnl > 0)
    const losses = partialTrades.filter((t) => t.pnl <= 0)
    const interimWinRate = partialTrades.length > 0 ? Math.round((wins.length / partialTrades.length) * 1000) / 10 : 0
    const interimPnl = partialTrades.reduce((s, t) => s + t.pnl, 0)
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    const interimPF = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 99.99 : 0

    // Slice equity curve proportionally
    const curveSliceLen = Math.max(1, Math.round((tick / totalTicks) * finalResults.equityCurve.length))
    const equitySoFar = finalResults.equityCurve.slice(0, curveSliceLen)

    const phase: BacktestProgress["phase"] =
      pct < 10 ? "initializing" : pct < 95 ? "processing" : pct < 100 ? "finalizing" : "complete"

    onProgress({
      progress: pct,
      tradesProcessed,
      totalTrades,
      interimWinRate,
      interimPnl: Math.round(interimPnl),
      interimProfitFactor: interimPF,
      equitySoFar,
      phase,
    })

    if (tick >= totalTicks) {
      clearInterval(timer)
      onComplete(finalResults)
    }
  }, tickInterval)

  // Return cancel function
  return () => { cancelled = true; clearInterval(timer) }
}

export function getDefaultStrategy(type: PlaybookType): Omit<PlaybookStrategy, "id" | "createdAt" | "status" | "results"> {
  return {
    name: "",
    description: "",
    type,
    asset: "BTC/USD",
    timeframe: "15m",
    dateRange: {
      start: "2024-01-01",
      end: "2024-12-31",
    },
    entryIndicators: [],
    exitIndicators: [],
    riskPerTrade: 1,
    stopLossType: "fixed",
    stopLossValue: 100,
    takeProfitType: "rr-ratio",
    takeProfitValue: 2,
    positionSizing: "percent-equity",
    positionSizeValue: 1,
  }
}

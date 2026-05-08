import { PositionType } from "./enum/PositionType"
import { TradeStatus } from "./enum/TradeStatus"

export interface EmotionTagApi {
  id: number
  name: string
}

export function getTagCategory(name: string): "positive" | "negative" | "neutral" {
  const lower = name.toLowerCase()
  if (["confident", "disciplined", "patient", "focused", "calm", "optimistic"].includes(lower)) return "positive"
  if (["anxious", "fearful", "greedy", "impulsive", "frustrated", "revenge trading"].includes(lower)) return "negative"
  return "neutral"
}


export interface PreTradeChecklistApi {
  id: number;
  name: string;
  checkListType: number;
}

export interface ChecklistModelApi {
  id: number;
  name: string;
  description: string | null;
  criteriaCount: number;
}

export interface ChecklistModelDetailApi {
  id: number;
  name: string;
  description: string | null;
  criteria: PreTradeChecklistApi[];
}

export interface TechnicalAnalysisTagApi {
  id: number;
  name: string;
  shortName: string;
  description: string;
}

export interface PsychologyEntry {
  id: string
  date: string
  emotionTags: string[]
  confidenceLevel: number
  journalEntry: string
  overallMood: number
}

export interface Trade {
  id: string
  asset: string
  tradingSetupId?: string
  position: PositionType
  entryPrice: number
  targetTier1: number
  targetTier2: number
  targetTier3: number
  stopLoss: number
  notes: string
  date: string
  status: TradeStatus
  exitPrice?: number
  pnl?: number
  tradingResult?: string
  hitStopLoss?: boolean
  closedDate?: string
  screenshots?: TradeScreenshot[]
  emotionTags?: string[]
  confidenceLevel?: number
  analysisTags?: string[]
  tradingSession?: string
  sessionId?: string
  pretradeChecklist?: string[]
  riskGuardrails?: {
    accountEquity?: number
    riskPercentage?: number
    maxDailyLoss?: number
    takeProfit?: number
    positionSize?: number
  }

  aiSummary?: string
}



export interface UserSession {
  id: string
  startTime: string
  expectedEndTime?: string
  endTime?: string
  status: "Active" | "Closed"
  pnl?: number
  tradesCount?: number
  notes?: string
}


export interface TradeScreenshot {
  url: string
}

export const sampleUserSessions: UserSession[] = [
  {
    id: "session-1",
    startTime: "2025-01-20T13:00:00Z",
    endTime: "2025-01-20T15:30:00Z",
    status: "Closed",
    pnl: 350.50,
    tradesCount: 4,
    notes: "Good session, stuck to the plan.",
  },
  {
    id: "session-2",
    startTime: "2025-01-21T08:00:00Z",
    endTime: "2025-01-21T11:00:00Z",
    status: "Closed",
    pnl: -120.00,
    tradesCount: 2,
    notes: "Choppy market, stopped out early.",
  }
]

// Sample psychology journal entries
export const samplePsychologyEntries: PsychologyEntry[] = [
  {
    id: "p1",
    date: "2025-01-22",
    emotionTags: ["1", "4"], // Confident, Focused
    confidenceLevel: 4,
    journalEntry: "Had a great trading day. Stuck to my plan and didn't chase any setups. The TSLA trade hit target 2 which was very satisfying. Need to maintain this discipline going forward.",
    overallMood: 4,
  },
  {
    id: "p2",
    date: "2025-01-18",
    emotionTags: ["11", "10"], // Frustrated, Impulsive
    confidenceLevel: 2,
    journalEntry: "Tough day. Took a few impulsive trades that weren't part of my plan. The ETH entry was premature. I need to wait for proper confirmation before entering. Setting a rule: no trades in the first 30 minutes of the session.",
    overallMood: 2,
  },
  {
    id: "p3",
    date: "2025-01-15",
    emotionTags: ["5", "16", "2"], // Calm, Analytical, Disciplined
    confidenceLevel: 5,
    journalEntry: "Excellent mindset today. Reviewed all my setups carefully before market open. Only took high-conviction trades. The NVDA close was perfect timing. This is the kind of day I want to replicate.",
    overallMood: 5,
  },
  {
    id: "p4",
    date: "2025-01-10",
    emotionTags: ["7", "15"], // Anxious, Cautious
    confidenceLevel: 3,
    journalEntry: "Market feels uncertain. I'm staying smaller on position sizes until I see clearer direction. Closed the MSFT trade for a nice profit which helps the account. Need to manage anxiety better during drawdowns.",
    overallMood: 3,
  },
  {
    id: "p5",
    date: "2025-01-05",
    emotionTags: ["9", "12"], // Greedy, Revenge Trading
    confidenceLevel: 1,
    journalEntry: "Worst day this month. After the SPY stop-loss hit, I immediately shorted META out of frustration. Classic revenge trade. Lost $1500 on a trade I never should have taken. Writing this down so I remember the pain next time I feel like chasing.",
    overallMood: 1,
  },
]

// Calculate profit trajectory over time
export function getProfitTrajectory(trades: Trade[]) {
  const closedTrades = trades
    .filter((t) => t.status === TradeStatus.Closed && t.closedDate && t.pnl !== undefined)
    .sort((a, b) => new Date(a.closedDate!).getTime() - new Date(b.closedDate!).getTime())

  let cumulativeProfit = 0
  return closedTrades.map((trade) => {
    cumulativeProfit += trade.pnl!
    return {
      date: trade.closedDate!,
      profit: cumulativeProfit,
      asset: trade.asset,
    }
  })
}

// Calculate win/loss statistics
export function getWinLossStats(trades: Trade[]) {
  const closedTrades = trades.filter((t) => t.status === TradeStatus.Closed && t.pnl !== undefined)
  const wins = closedTrades.filter((t) => t.pnl! > 0).length
  const losses = closedTrades.filter((t) => t.pnl! <= 0).length
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0

  return { wins, losses, totalPnL, winRate, total: closedTrades.length }
}

// Get open positions
export function getOpenPositions(trades: Trade[]) {
  return trades.filter((t) => t.status === TradeStatus.Open)
}

// Calculate unrealized PnL for open position (simplified calculation)
export function calculateUnrealizedPnL(trade: Trade, currentPrice: number): number {
  const multiplier = trade.position === PositionType.Long ? 1 : -1
  const percentage = ((currentPrice - trade.entryPrice) / trade.entryPrice) * multiplier
  
  if (trade.riskGuardrails?.accountEquity) {
    return percentage * trade.riskGuardrails.accountEquity
  }
  
  return (currentPrice - trade.entryPrice) * multiplier * 1 // Assuming 1 unit
}

// Psychology analytics helpers
export function getEmotionFrequency(trades: Trade[], apiTags: {id: number, name: string}[]) {
  const freq: Record<string, number> = {}
  trades.forEach((t) => {
    t.emotionTags?.forEach((tag) => {
      freq[tag] = (freq[tag] || 0) + 1
    })
  })
  return apiTags
    .filter((tag) => freq[tag.id.toString()])
    .map((tag) => ({ ...tag, label: tag.name, count: freq[tag.id.toString()] }))
    .sort((a, b) => b.count - a.count)
}

export function getEmotionWinRate(trades: Trade[], apiTags: {id: number, name: string}[]) {
  const closedTrades = trades.filter((t) => t.status === TradeStatus.Closed && t.pnl !== undefined)
  const tagStats: Record<string, { wins: number; total: number }> = {}

  closedTrades.forEach((t) => {
    t.emotionTags?.forEach((tag) => {
      if (!tagStats[tag]) tagStats[tag] = { wins: 0, total: 0 }
      tagStats[tag].total++
      if (t.pnl! > 0) tagStats[tag].wins++
    })
  })

  return apiTags
    .filter((tag) => tagStats[tag.id.toString()])
    .map((tag) => ({
      ...tag,
      label: tag.name,
      winRate: Math.round((tagStats[tag.id.toString()].wins / tagStats[tag.id.toString()].total) * 100),
      total: tagStats[tag.id.toString()].total,
    }))
}

export function getEmotionPnlHeatmap(trades: Trade[], apiTags: {id: number, name: string}[]) {
  const closedTrades = trades.filter((t) => t.status === TradeStatus.Closed && t.pnl !== undefined && t.emotionTags?.length)

  // For each emotion, calculate avg PnL, total PnL, trade count, and separate win/loss averages
  const emotionStats: Record<string, { totalPnl: number; count: number; wins: number; losses: number; winPnl: number; lossPnl: number }> = {}

  closedTrades.forEach((t) => {
    t.emotionTags!.forEach((tagId) => {
      if (!emotionStats[tagId]) {
        emotionStats[tagId] = { totalPnl: 0, count: 0, wins: 0, losses: 0, winPnl: 0, lossPnl: 0 }
      }
      emotionStats[tagId].totalPnl += t.pnl!
      emotionStats[tagId].count++
      if (t.pnl! > 0) {
        emotionStats[tagId].wins++
        emotionStats[tagId].winPnl += t.pnl!
      } else {
        emotionStats[tagId].losses++
        emotionStats[tagId].lossPnl += t.pnl!
      }
    })
  })

  return apiTags
    .filter((tag) => emotionStats[tag.id.toString()])
    .map((tag) => {
      const s = emotionStats[tag.id.toString()]
      return {
        ...tag,
        label: tag.name,
        avgPnl: Math.round(s.totalPnl / s.count),
        totalPnl: Math.round(s.totalPnl),
        count: s.count,
        wins: s.wins,
        losses: s.losses,
        winRate: Math.round((s.wins / s.count) * 100),
        avgWinPnl: s.wins > 0 ? Math.round(s.winPnl / s.wins) : 0,
        avgLossPnl: s.losses > 0 ? Math.round(s.lossPnl / s.losses) : 0,
      }
    })
    .sort((a, b) => b.avgPnl - a.avgPnl)
}

export function getMoodTrend(entries: PsychologyEntry[]) {
  return [...entries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((entry) => ({
      date: entry.date,
      mood: entry.overallMood,
      confidence: entry.confidenceLevel,
    }))
}

// --- Advanced Analytics ---

export interface AnalyticsSnapshot {
  totalPnl: number
  winRate: number
  wins: number
  losses: number
  totalClosed: number
  avgWin: number
  avgLoss: number
  largestWin: number
  largestLoss: number
  profitFactor: number
  expectancy: number
  maxDrawdown: number
  maxDrawdownPct: number
  sharpeRatio: number
  avgHoldingDays: number
  longsWinRate: number
  shortsWinRate: number
  bestAsset: { asset: string; pnl: number } | null
  worstAsset: { asset: string; pnl: number } | null
  consecutiveWins: number
  consecutiveLosses: number
  avgRiskReward: number
}

export function computeFullAnalytics(trades: Trade[]): AnalyticsSnapshot {
  const closed = trades.filter((t) => t.status === TradeStatus.Closed && t.pnl !== undefined)
  const wins = closed.filter((t) => t.pnl! > 0)
  const losses = closed.filter((t) => t.pnl! <= 0)

  const totalPnl = closed.reduce((s, t) => s + t.pnl!, 0)
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl!, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl!, 0) / losses.length) : 0
  const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.pnl!)) : 0
  const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.pnl!)) : 0

  // Profit factor
  const grossProfit = wins.reduce((s, t) => s + t.pnl!, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl!, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  // Expectancy
  const expectancy = closed.length > 0
    ? ((winRate / 100) * avgWin) - ((1 - winRate / 100) * avgLoss)
    : 0

  // Max drawdown from equity curve
  const sorted = [...closed].sort((a, b) => new Date(a.closedDate!).getTime() - new Date(b.closedDate!).getTime())
  let peak = 0
  let equity = 0
  let maxDD = 0
  let maxDDPct = 0
  for (const t of sorted) {
    equity += t.pnl!
    if (equity > peak) peak = equity
    const dd = peak - equity
    if (dd > maxDD) {
      maxDD = dd
      maxDDPct = peak > 0 ? (dd / peak) * 100 : 0
    }
  }

  // Sharpe ratio (simplified, daily returns annualized)
  const returns = sorted.map((t) => t.pnl!)
  const meanReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0
  const stdDev = returns.length > 1
    ? Math.sqrt(returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (returns.length - 1))
    : 0
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0

  // Avg holding days
  const holdingDays = closed
    .filter((t) => t.closedDate)
    .map((t) => (new Date(t.closedDate!).getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24))
  const avgHoldingDays = holdingDays.length > 0 ? holdingDays.reduce((s, d) => s + d, 0) / holdingDays.length : 0

  // Long vs short
  const longs = closed.filter((t) => t.position === PositionType.Long)
  const shorts = closed.filter((t) => t.position === PositionType.Short)
  const longsWinRate = longs.length > 0 ? (longs.filter((t) => t.pnl! > 0).length / longs.length) * 100 : 0
  const shortsWinRate = shorts.length > 0 ? (shorts.filter((t) => t.pnl! > 0).length / shorts.length) * 100 : 0

  // Best / worst asset
  const assetPnl: Record<string, number> = {}
  closed.forEach((t) => { assetPnl[t.asset] = (assetPnl[t.asset] || 0) + t.pnl! })
  const assetEntries = Object.entries(assetPnl)
  const bestAsset = assetEntries.length > 0
    ? assetEntries.reduce((best, [a, p]) => p > best.pnl ? { asset: a, pnl: p } : best, { asset: "", pnl: -Infinity })
    : null
  const worstAsset = assetEntries.length > 0
    ? assetEntries.reduce((worst, [a, p]) => p < worst.pnl ? { asset: a, pnl: p } : worst, { asset: "", pnl: Infinity })
    : null

  // Consecutive
  let maxConsecWins = 0
  let maxConsecLosses = 0
  let curWins = 0
  let curLosses = 0
  for (const t of sorted) {
    if (t.pnl! > 0) { curWins++; curLosses = 0; maxConsecWins = Math.max(maxConsecWins, curWins) }
    else { curLosses++; curWins = 0; maxConsecLosses = Math.max(maxConsecLosses, curLosses) }
  }

  // Avg risk-reward
  const rrTrades = closed.filter((t) => t.stopLoss > 0 && t.targetTier1 > 0 && t.entryPrice > 0)
  const rrValues = rrTrades.map((t) => {
    const risk = Math.abs(t.entryPrice - t.stopLoss)
    const reward = Math.abs(t.targetTier1 - t.entryPrice)
    return risk > 0 ? reward / risk : 0
  }).filter((r) => r > 0)
  const avgRiskReward = rrValues.length > 0 ? rrValues.reduce((s, r) => s + r, 0) / rrValues.length : 0

  return {
    totalPnl, winRate, wins: wins.length, losses: losses.length, totalClosed: closed.length,
    avgWin, avgLoss, largestWin, largestLoss, profitFactor, expectancy,
    maxDrawdown: maxDD, maxDrawdownPct: maxDDPct, sharpeRatio,
    avgHoldingDays, longsWinRate, shortsWinRate,
    bestAsset: bestAsset && bestAsset.asset ? bestAsset : null,
    worstAsset: worstAsset && worstAsset.asset ? worstAsset : null,
    consecutiveWins: maxConsecWins, consecutiveLosses: maxConsecLosses,
    avgRiskReward,
  }
}

export function getMonthlyReturns(trades: Trade[]) {
  const closed = trades.filter((t) => t.status === TradeStatus.Closed && t.pnl !== undefined && t.closedDate)
  const monthly: Record<string, number> = {}
  closed.forEach((t) => {
    const d = new Date(t.closedDate!)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    monthly[key] = (monthly[key] || 0) + t.pnl!
  })
  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => ({ month, pnl: Math.round(pnl) }))
}

export function getAssetBreakdown(trades: Trade[]) {
  const closed = trades.filter((t) => t.status === TradeStatus.Closed && t.pnl !== undefined)
  const assets: Record<string, { pnl: number; count: number; wins: number }> = {}
  closed.forEach((t) => {
    if (!assets[t.asset]) assets[t.asset] = { pnl: 0, count: 0, wins: 0 }
    assets[t.asset].pnl += t.pnl!
    assets[t.asset].count++
    if (t.pnl! > 0) assets[t.asset].wins++
  })
  return Object.entries(assets)
    .map(([asset, data]) => ({ asset, pnl: Math.round(data.pnl), count: data.count, winRate: Math.round((data.wins / data.count) * 100) }))
    .sort((a, b) => b.pnl - a.pnl)
}

export function getDayOfWeekBreakdown(trades: Trade[]) {
  const closed = trades.filter((t) => t.status === TradeStatus.Closed && t.pnl !== undefined && t.closedDate)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const dayData: Record<number, { pnl: number; count: number; wins: number }> = {}
  closed.forEach((t) => {
    const d = new Date(t.closedDate!).getDay()
    if (!dayData[d]) dayData[d] = { pnl: 0, count: 0, wins: 0 }
    dayData[d].pnl += t.pnl!
    dayData[d].count++
    if (t.pnl! > 0) dayData[d].wins++
  })
  return days.map((name, i) => ({
    day: name,
    pnl: Math.round(dayData[i]?.pnl || 0),
    count: dayData[i]?.count || 0,
    winRate: dayData[i]?.count ? Math.round(((dayData[i]?.wins || 0) / dayData[i].count) * 100) : 0,
  }))
}

export function generateInsights(analytics: AnalyticsSnapshot, trades: Trade[]): { type: "success" | "warning" | "info"; title: string; description: string }[] {
  const insights: { type: "success" | "warning" | "info"; title: string; description: string }[] = []

  // Profitability
  if (analytics.profitFactor >= 2) {
    insights.push({ type: "success", title: "Strong profit factor", description: `Your profit factor of ${analytics.profitFactor.toFixed(2)} indicates strong edge. Gross profits significantly outweigh gross losses.` })
  } else if (analytics.profitFactor < 1) {
    insights.push({ type: "warning", title: "Profit factor below breakeven", description: `A profit factor of ${analytics.profitFactor.toFixed(2)} means losses outpace profits. Review your exit strategy and trade selection.` })
  }

  // Win rate
  if (analytics.winRate >= 60) {
    insights.push({ type: "success", title: "High win rate", description: `${analytics.winRate.toFixed(1)}% win rate is excellent. Maintain your selection criteria and discipline.` })
  } else if (analytics.winRate < 40) {
    insights.push({ type: "warning", title: "Low win rate", description: `${analytics.winRate.toFixed(1)}% win rate suggests reviewing entry confluences. Consider adding more confirmation filters.` })
  }

  // Risk reward
  if (analytics.avgRiskReward >= 2.5) {
    insights.push({ type: "success", title: "Great risk-to-reward", description: `Average R:R of ${analytics.avgRiskReward.toFixed(1)}:1 means you capture large moves relative to risk.` })
  } else if (analytics.avgRiskReward > 0 && analytics.avgRiskReward < 1.5) {
    insights.push({ type: "warning", title: "Low risk-to-reward", description: `Average R:R of ${analytics.avgRiskReward.toFixed(1)}:1 requires a very high win rate to stay profitable. Aim for 2:1 or better.` })
  }

  // Drawdown
  if (analytics.maxDrawdownPct > 20) {
    insights.push({ type: "warning", title: "High drawdown", description: `Max drawdown of ${analytics.maxDrawdownPct.toFixed(1)}% is steep. Consider reducing position sizes or tightening stops.` })
  }

  // Consecutive losses
  if (analytics.consecutiveLosses >= 3) {
    insights.push({ type: "warning", title: "Losing streaks detected", description: `You had ${analytics.consecutiveLosses} consecutive losses. Consider reducing size after 2 consecutive losses.` })
  }

  // Position bias
  if (analytics.longsWinRate > 0 && analytics.shortsWinRate > 0 && Math.abs(analytics.longsWinRate - analytics.shortsWinRate) > 25) {
    const better = analytics.longsWinRate > analytics.shortsWinRate ? PositionType.Long : PositionType.Short
    const worse = better === PositionType.Long ? PositionType.Short : PositionType.Long
    insights.push({ type: "info", title: `Stronger on ${better} trades`, description: `Your ${better} win rate is significantly higher. Consider focusing more on ${better} setups or reviewing your ${worse} strategy.` })
  }

  // Holding time
  if (analytics.avgHoldingDays > 15) {
    insights.push({ type: "info", title: "Long holding periods", description: `Average ${analytics.avgHoldingDays.toFixed(0)} days per trade. If you're a day/swing trader, exits may need tightening.` })
  }

  // Best asset
  if (analytics.bestAsset && analytics.bestAsset.pnl > 0) {
    insights.push({ type: "success", title: `Top performer: ${analytics.bestAsset.asset}`, description: `${analytics.bestAsset.asset} generated $${analytics.bestAsset.pnl.toLocaleString()} in profits. Consider increasing allocation.` })
  }
  if (analytics.worstAsset && analytics.worstAsset.pnl < 0) {
    insights.push({ type: "warning", title: `Underperformer: ${analytics.worstAsset.asset}`, description: `${analytics.worstAsset.asset} lost $${Math.abs(analytics.worstAsset.pnl).toLocaleString()}. Evaluate if this market suits your strategy.` })
  }

  // Sharpe
  if (analytics.sharpeRatio > 1.5) {
    insights.push({ type: "success", title: "Strong risk-adjusted returns", description: `Sharpe ratio of ${analytics.sharpeRatio.toFixed(2)} indicates good returns relative to volatility.` })
  }

  if (insights.length === 0) {
    insights.push({ type: "info", title: "Keep trading", description: "More data will unlock deeper insights. Continue logging trades with complete data for better analysis." })
  }

  return insights
}

// Mock current prices for demo
export const mockCurrentPrices: Record<string, number> = {
  "BTC/USD": 43200,
  "ETH/USD": 2380,
  AAPL: 183,
  TSLA: 248,
  NVDA: 545,
  SPY: 478,
  AMD: 162,
  GOOGL: 158,
  META: 535,
  MSFT: 412,
}

import { api, type ApiResponse } from "./api"

export enum AnalyticsFilter {
  OneWeek = 0,
  OneMonth = 1,
  ThreeMonths = 2,
  SixMonths = 3,
  AllTime = 4,
}

export const FILTER_LABELS: Record<string, AnalyticsFilter> = {
  "1W": AnalyticsFilter.OneWeek,
  "1M": AnalyticsFilter.OneMonth,
  "3M": AnalyticsFilter.ThreeMonths,
  "6M": AnalyticsFilter.SixMonths,
  "All": AnalyticsFilter.AllTime,
}

export interface PerformanceSummary {
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
  consecutiveWins: number
  consecutiveLosses: number
  avgRiskReward: number
}

export interface MonthlyReturn {
  month: string
  pnl: number
}

export interface AssetBreakdown {
  asset: string
  pnl: number
  count: number
  winRate: number
}

export interface DayOfWeekBreakdown {
  day: string
  pnl: number
  count: number
  winRate: number
}

export interface EquityPoint {
  date: string
  profit: number
}

export interface Insight {
  type: "success" | "warning" | "info"
  title: string
  description: string
}

export async function fetchPerformanceSummary(filter: AnalyticsFilter): Promise<PerformanceSummary> {
  const response = await api.get<ApiResponse<PerformanceSummary>>(`/v1/analytics/performance-summary?filter=${filter}`)
  return response.data.value
}

export async function fetchMonthlyReturns(filter: AnalyticsFilter): Promise<MonthlyReturn[]> {
  const response = await api.get<ApiResponse<MonthlyReturn[]>>(`/v1/analytics/monthly-returns?filter=${filter}`)
  return response.data.value
}

export async function fetchAssetBreakdown(filter: AnalyticsFilter): Promise<AssetBreakdown[]> {
  const response = await api.get<ApiResponse<AssetBreakdown[]>>(`/v1/analytics/asset-breakdown?filter=${filter}`)
  return response.data.value
}

export async function fetchDayOfWeekBreakdown(filter: AnalyticsFilter): Promise<DayOfWeekBreakdown[]> {
  const response = await api.get<ApiResponse<DayOfWeekBreakdown[]>>(`/v1/analytics/day-of-week?filter=${filter}`)
  return response.data.value
}

export async function fetchEquityCurve(filter: AnalyticsFilter): Promise<EquityPoint[]> {
  const response = await api.get<ApiResponse<EquityPoint[]>>(`/v1/analytics/equity-curve?filter=${filter}`)
  return response.data.value
}

export async function fetchInsights(filter: AnalyticsFilter): Promise<Insight[]> {
  const response = await api.get<ApiResponse<Insight[]>>(`/v1/analytics/insights?filter=${filter}`)
  return response.data.value
}

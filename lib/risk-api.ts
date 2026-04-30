import { api, type ApiResponse } from "./api"

// ─── Risk Config Types ────────────────────────────────────────────────

export interface RiskConfig {
  dailyLossLimitPercent: number
  weeklyDrawdownCapPercent: number
  riskPerTradePercent: number
  maxOpenPositions: number
  maxCorrelatedPositions: number
  accountBalance: number
}

// ─── Risk Dashboard Types ─────────────────────────────────────────────

export interface RiskAlert {
  severity: "critical" | "warning" | "info"
  title: string
  message: string
}

export interface RiskDashboard {
  accountBalance: number
  dailyLossLimitPercent: number
  weeklyDrawdownCapPercent: number
  maxOpenPositions: number
  dailyPnl: number
  dailyPnlPercent: number
  weeklyPnl: number
  weeklyPnlPercent: number
  todayTradeCount: number
  openPositionCount: number
  weekTradeCount: number
  todayWins: number
  todayLosses: number
  dailyLimitUsedPercent: number
  weeklyCapUsedPercent: number
  isDailyLimitBreached: boolean
  isWeeklyCapBreached: boolean
  alerts: RiskAlert[]
}

// ─── Account Balance Types ────────────────────────────────────────────

export interface AccountBalanceEntry {
  id: number
  entryType: string
  amount: number
  balanceAfter: number
  notes: string | null
  entryDate: string
}

// ─── Position Size Types ──────────────────────────────────────────────

export interface PositionSizeResult {
  accountBalance: number
  riskPercent: number
  riskAmount: number
  units: number
  lots: number
  stopLossDistance: number
  stopLossDistancePips: number
}

// ─── Correlation Types ────────────────────────────────────────────────

export interface CorrelationPair {
  asset1: string
  asset2: string
  correlation: number
}

export interface CorrelationWarning {
  severity: string
  message: string
  asset1: string
  asset2: string
  correlation: number
}

export interface CorrelationMatrix {
  assets: string[]
  pairs: CorrelationPair[]
  warnings: CorrelationWarning[]
}

// ─── Heatmap Types ────────────────────────────────────────────────────

export interface AssetExposure {
  asset: string
  count: number
  direction: string
  pnl: number
}

export interface DirectionExposure {
  longCount: number
  shortCount: number
  longPnl: number
  shortPnl: number
}

export interface RiskHeatmap {
  byAsset: AssetExposure[]
  byDirection: DirectionExposure
  totalExposure: number
}

// ─── API Functions ────────────────────────────────────────────────────

export async function fetchRiskConfig(): Promise<RiskConfig> {
  const res = await api.get<ApiResponse<RiskConfig>>("/v1/risk/config")
  return res.data.value
}

export async function updateRiskConfig(config: RiskConfig): Promise<void> {
  await api.put("/v1/risk/config", config)
}

export async function fetchRiskDashboard(): Promise<RiskDashboard> {
  const res = await api.get<ApiResponse<RiskDashboard>>("/v1/risk/dashboard")
  return res.data.value
}

export async function fetchAccountBalance(): Promise<AccountBalanceEntry[]> {
  const res = await api.get<ApiResponse<AccountBalanceEntry[]>>("/v1/risk/account-balance")
  return res.data.value
}

export async function createAccountBalanceEntry(data: {
  entryType: number; amount: number; notes?: string; entryDate: string
}): Promise<number> {
  const res = await api.post<ApiResponse<number>>("/v1/risk/account-balance", data)
  return res.data.value
}

export async function fetchPositionSize(
  entryPrice: number, stopLossPrice: number,
  accountBalance?: number, riskPercent?: number
): Promise<PositionSizeResult> {
  const params = new URLSearchParams({ entryPrice: String(entryPrice), stopLossPrice: String(stopLossPrice) })
  if (accountBalance != null) params.set("accountBalance", String(accountBalance))
  if (riskPercent != null) params.set("riskPercent", String(riskPercent))
  const res = await api.get<ApiResponse<PositionSizeResult>>(`/v1/risk/position-size?${params}`)
  return res.data.value
}

export async function fetchCorrelationMatrix(): Promise<CorrelationMatrix> {
  const res = await api.get<ApiResponse<CorrelationMatrix>>("/v1/risk/correlation")
  return res.data.value
}

export async function fetchRiskHeatmap(): Promise<RiskHeatmap> {
  const res = await api.get<ApiResponse<RiskHeatmap>>("/v1/risk/heatmap")
  return res.data.value
}

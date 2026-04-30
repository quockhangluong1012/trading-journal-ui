import { api, type ApiResponse } from "./api"
import { AnalyticsFilter } from "./analytics-api"

// --- Types ---

export interface PlaybookSetupCard {
  setupId: number
  setupName: string
  description: string | null
  status: number // 1=Active, 2=Draft, 3=Archived, 4=Retired
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  totalPnl: number
  profitFactor: number
  expectancy: number
  avgRiskReward: number
  grade: string
}

export interface PlaybookOverview {
  setups: PlaybookSetupCard[]
  totalSetups: number
  activeSetups: number
  retiredSetups: number
  topSetupName: string | null
  worstSetupName: string | null
}

export interface PlaybookDetail {
  id: number
  name: string
  description: string | null
  status: number
  entryRules: string | null
  exitRules: string | null
  idealMarketConditions: string | null
  riskPerTrade: number | null
  targetRiskReward: number | null
  preferredTimeframes: string | null
  preferredAssets: string | null
  retiredReason: string | null
  retiredDate: string | null
  createdAt: string
  lastUpdatedAt: string
}

export interface PlaybookRulesPayload {
  entryRules: string | null
  exitRules: string | null
  idealMarketConditions: string | null
  riskPerTrade: number | null
  targetRiskReward: number | null
  preferredTimeframes: string | null
  preferredAssets: string | null
}

export interface SetupComparisonMetrics {
  setupId: number
  setupName: string
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  totalPnl: number
  avgPnl: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  expectancy: number
  largestWin: number
  largestLoss: number
  avgRiskReward: number
  avgHoldingDays: number
  grade: string
}

export interface SetupComparison {
  setupA: SetupComparisonMetrics
  setupB: SetupComparisonMetrics
  recommendation: string
}

// --- Status helpers ---

export const SETUP_STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Draft",
  3: "Archived",
  4: "Retired",
}

export const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  B: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  C: "text-amber-400 bg-amber-500/15 border-amber-500/30",
  D: "text-orange-400 bg-orange-500/15 border-orange-500/30",
  F: "text-red-400 bg-red-500/15 border-red-500/30",
  "N/A": "text-muted-foreground bg-secondary/40 border-border",
}

// --- API calls ---

export async function fetchPlaybookOverview(filter: AnalyticsFilter): Promise<PlaybookOverview> {
  const response = await api.get<ApiResponse<PlaybookOverview>>(`/v1/analytics/playbook-overview?filter=${filter}`)
  return response.data.value
}

export async function fetchPlaybookDetail(setupId: number): Promise<PlaybookDetail> {
  const response = await api.get<ApiResponse<PlaybookDetail>>(`/v1/trading-setups/${setupId}/playbook`)
  return response.data.value
}

export async function updatePlaybookRules(setupId: number, payload: PlaybookRulesPayload): Promise<boolean> {
  const response = await api.put<ApiResponse<boolean>>(`/v1/trading-setups/${setupId}/playbook`, payload)
  return response.data.value
}

export async function retireSetup(setupId: number, reason: string): Promise<boolean> {
  const response = await api.post<ApiResponse<boolean>>(`/v1/trading-setups/${setupId}/retire`, { reason })
  return response.data.value
}

export async function reactivateSetup(setupId: number): Promise<boolean> {
  const response = await api.post<ApiResponse<boolean>>(`/v1/trading-setups/${setupId}/reactivate`)
  return response.data.value
}

export async function compareSetups(setupIdA: number, setupIdB: number, filter: AnalyticsFilter): Promise<SetupComparison> {
  const response = await api.get<ApiResponse<SetupComparison>>(
    `/v1/analytics/compare-setups?setupIdA=${setupIdA}&setupIdB=${setupIdB}&filter=${filter}`
  )
  return response.data.value
}

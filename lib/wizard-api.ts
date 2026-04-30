import { api, type ApiResponse } from "./api"
import { ReviewPeriodType, toISODateString, getPeriodBounds } from "./review-api"

// --- Types ---

export interface WizardPeriodMetrics {
  periodLabel: string
  periodStart: string
  periodEnd: string
  totalTrades: number
  wins: number
  losses: number
  totalPnl: number
  winRate: number
  averageWin: number
  averageLoss: number
  bestTradePnl: number
  worstTradePnl: number
  longTrades: number
  shortTrades: number
  ruleBreakTrades: number
  highConfidenceTrades: number
  topAsset?: string
  primaryTradingZone?: string
  dominantEmotion?: string
  profitFactor: number
  expectancy: number
}

export interface WizardTradeHighlight {
  tradeId: number
  asset: string
  position: string
  pnl: number
  openDate: string
  closedDate: string
  entryPrice: number
  exitPrice: number | null
  isRuleBroken: boolean
  notes?: string
  emotionTags: string[]
}

export interface WizardDistributionItem {
  label: string
  count: number
  percentage: number
}

export interface WizardDisciplineSummary {
  totalRuleChecks: number
  rulesFollowed: number
  rulesBroken: number
  complianceRate: number
  ruleBreakdowns: { ruleName: string; timesFollowed: number; timesBroken: number }[]
}

export interface ReviewActionItem {
  id: number
  tradingReviewId: number
  title: string
  description?: string
  priority: number
  status: number
  category: number
  dueDate?: string
  completedDate?: string
  completionNotes?: string
  createdDate: string
}

export interface TradingReviewData {
  id: number
  periodType: number
  periodStart: string
  periodEnd: string
  status: number
  completedDate?: string
  executionRating?: number
  disciplineRating?: number
  psychologyRating?: number
  riskManagementRating?: number
  overallRating?: number
  performanceNotes?: string
  bestTradeReflection?: string
  worstTradeReflection?: string
  disciplineNotes?: string
  psychologyNotes?: string
  goalsForNextPeriod?: string
  keyTakeaways?: string
  totalTrades: number
  wins: number
  losses: number
  totalPnl: number
  winRate: number
  ruleBreaks: number
  actionItems: ReviewActionItem[]
}

export interface WizardData {
  current: WizardPeriodMetrics
  previous: WizardPeriodMetrics | null
  bestTrades: WizardTradeHighlight[]
  worstTrades: WizardTradeHighlight[]
  emotionDistribution: WizardDistributionItem[]
  confidenceDistribution: WizardDistributionItem[]
  discipline: WizardDisciplineSummary
  pendingActionItems: ReviewActionItem[]
  existingReview: TradingReviewData | null
  reviewStreak: number
}

export interface ReviewStreakData {
  currentStreak: number
  longestStreak: number
  totalReviews: number
  lastReviewDate?: string
}

export interface ActionItemRequest {
  id?: number
  title: string
  description?: string
  priority: number
  status: number
  category: number
  dueDate?: string
}

export interface SaveWizardRequest {
  periodType: ReviewPeriodType
  periodStart: string
  periodEnd: string
  markAsCompleted: boolean
  executionRating?: number
  disciplineRating?: number
  psychologyRating?: number
  riskManagementRating?: number
  overallRating?: number
  performanceNotes?: string
  bestTradeReflection?: string
  worstTradeReflection?: string
  disciplineNotes?: string
  psychologyNotes?: string
  goalsForNextPeriod?: string
  keyTakeaways?: string
  totalTrades: number
  wins: number
  losses: number
  totalPnl: number
  winRate: number
  ruleBreaks: number
  actionItems?: ActionItemRequest[]
}

// --- API Functions ---

export async function fetchWizardData(
  periodType: ReviewPeriodType,
  periodStart: string
): Promise<WizardData> {
  const response = await api.get<ApiResponse<WizardData>>(
    `/v1/review-wizard/data?periodType=${periodType}&periodStart=${periodStart}`
  )
  return response.data.value
}

export async function saveWizardReview(
  data: SaveWizardRequest
): Promise<TradingReviewData> {
  const response = await api.post<ApiResponse<TradingReviewData>>(
    "/v1/review-wizard",
    data
  )
  return response.data.value
}

export async function fetchReviewStreak(
  periodType: ReviewPeriodType
): Promise<ReviewStreakData> {
  const response = await api.get<ApiResponse<ReviewStreakData>>(
    `/v1/review-wizard/streak?periodType=${periodType}`
  )
  return response.data.value
}

export async function updateActionItemStatus(
  id: number,
  status: number,
  completionNotes?: string
): Promise<ReviewActionItem> {
  const response = await api.put<ApiResponse<ReviewActionItem>>(
    `/v1/action-items/${id}/status`,
    { id, status, completionNotes }
  )
  return response.data.value
}

export async function fetchActionItems(
  statusFilter?: number
): Promise<ReviewActionItem[]> {
  const params = statusFilter !== undefined ? `?status=${statusFilter}` : ""
  const response = await api.get<ApiResponse<ReviewActionItem[]>>(
    `/v1/action-items${params}`
  )
  return response.data.value
}

// --- Helpers ---

export const WIZARD_STEPS = [
  { id: "performance", title: "Performance", description: "Review your numbers" },
  { id: "trades", title: "Key Trades", description: "Best & worst analysis" },
  { id: "discipline", title: "Discipline", description: "Rule compliance" },
  { id: "psychology", title: "Psychology", description: "Emotional patterns" },
  { id: "goals", title: "Goals", description: "Set action items" },
  { id: "complete", title: "Complete", description: "Finish review" },
] as const

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"]

export const ACTION_ITEM_PRIORITIES = [
  { value: 0, label: "Low", color: "text-muted-foreground" },
  { value: 1, label: "Medium", color: "text-blue-400" },
  { value: 2, label: "High", color: "text-amber-400" },
  { value: 3, label: "Critical", color: "text-red-400" },
] as const

export const ACTION_ITEM_STATUSES = [
  { value: 0, label: "Open" },
  { value: 1, label: "In Progress" },
  { value: 2, label: "Completed" },
  { value: 3, label: "Dismissed" },
] as const

export function getWizardPeriodBounds(periodType: ReviewPeriodType, date: Date) {
  return getPeriodBounds(periodType, date)
}

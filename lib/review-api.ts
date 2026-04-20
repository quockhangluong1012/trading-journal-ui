import { api, type ApiResponse } from "./api"

export enum ReviewPeriodType {
  Daily = 0,
  Weekly = 1,
  Monthly = 2,
  Quarterly = 3,
}

export const PERIOD_LABELS: Record<string, ReviewPeriodType> = {
  Daily: ReviewPeriodType.Daily,
  Weekly: ReviewPeriodType.Weekly,
  Monthly: ReviewPeriodType.Monthly,
  Quarterly: ReviewPeriodType.Quarterly,
}

export interface ReviewData {
  id?: number
  periodType: ReviewPeriodType
  periodStart: string
  periodEnd: string
  userNotes?: string
  aiSummary?: string
  aiStrengths?: string
  aiWeaknesses?: string
  aiActionItems?: string
  aiTechnicalInsights?: string
  aiPsychologyAnalysis?: string
  aiCriticalMistakesTechnical?: string
  aiCriticalMistakesPsychological?: string
  aiWhatToImprove?: string
  aiSummaryGenerating: boolean
  totalPnl: number
  winRate: number
  totalTrades: number
  wins: number
  losses: number
  averageWin: number
  averageLoss: number
  bestTradePnl: number
  worstTradePnl: number
  bestDayPnl: number
  worstDayPnl: number
  longTrades: number
  shortTrades: number
  ruleBreakTrades: number
  highConfidenceTrades: number
  topAsset?: string
  primaryTradingZone?: string
  dominantEmotion?: string
  topTechnicalTheme?: string
}

export interface ReviewSummaryResult {
  summary: string
  strengthsAnalysis: string
  weaknessAnalysis: string
  actionItems: string[]
  technicalInsights: string
  psychologyAnalysis: string
  criticalMistakes: {
    technical: string[]
    psychological: string[]
  }
  whatToImprove: string[]
}

export interface ReviewSummaryStatus {
  isGenerating: boolean
  aiSummary?: string
  aiStrengths?: string
  aiWeaknesses?: string
  aiActionItems?: string
  aiTechnicalInsights?: string
  aiPsychologyAnalysis?: string
  aiCriticalMistakesTechnical?: string
  aiCriticalMistakesPsychological?: string
  aiWhatToImprove?: string
}

export interface ReviewTrade {
  id: number
  asset: string
  position: string
  pnl: number | null
  date: string
  closedDate: string | null
  entryPrice: number
  exitPrice: number | null
  confidenceLevel: number
  tradingZone?: string | null
  isRuleBroken: boolean
  ruleBreakReason?: string | null
}

export interface PaginatedReviewTrades {
  values: ReviewTrade[]
  totalItems: number
  hasMore: boolean
}

type ReviewPayload = Partial<ReviewData> & Record<string, unknown>

function readReviewValue<T>(payload: ReviewPayload, camelKey: string): T | undefined {
  const pascalKey = `${camelKey.charAt(0).toUpperCase()}${camelKey.slice(1)}`

  return (payload[camelKey] ?? payload[pascalKey]) as T | undefined
}

function readReviewNumber(payload: ReviewPayload, key: string): number {
  const value = readReviewValue<number>(payload, key)
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function readReviewString(payload: ReviewPayload, key: string): string | undefined {
  const value = readReviewValue<string>(payload, key)
  return typeof value === "string" ? value : undefined
}

function readReviewBoolean(payload: ReviewPayload, key: string): boolean {
  const value = readReviewValue<boolean>(payload, key)
  return typeof value === "boolean" ? value : false
}

function normalizeReviewData(
  payload: ReviewPayload,
  fallback: { periodStart: string; periodType: ReviewPeriodType },
): ReviewData {
  return {
    id: readReviewValue<number>(payload, "id"),
    periodType: readReviewValue<ReviewPeriodType>(payload, "periodType") ?? fallback.periodType,
    periodStart: readReviewString(payload, "periodStart") ?? fallback.periodStart,
    periodEnd: readReviewString(payload, "periodEnd") ?? fallback.periodStart,
    userNotes: readReviewString(payload, "userNotes"),
    aiSummary: readReviewString(payload, "aiSummary"),
    aiStrengths: readReviewString(payload, "aiStrengths"),
    aiWeaknesses: readReviewString(payload, "aiWeaknesses"),
    aiActionItems: readReviewString(payload, "aiActionItems"),
    aiTechnicalInsights: readReviewString(payload, "aiTechnicalInsights"),
    aiPsychologyAnalysis: readReviewString(payload, "aiPsychologyAnalysis"),
    aiCriticalMistakesTechnical: readReviewString(payload, "aiCriticalMistakesTechnical"),
    aiCriticalMistakesPsychological: readReviewString(payload, "aiCriticalMistakesPsychological"),
    aiWhatToImprove: readReviewString(payload, "aiWhatToImprove"),
    aiSummaryGenerating: readReviewBoolean(payload, "aiSummaryGenerating"),
    totalPnl: readReviewNumber(payload, "totalPnl"),
    winRate: readReviewNumber(payload, "winRate"),
    totalTrades: readReviewNumber(payload, "totalTrades"),
    wins: readReviewNumber(payload, "wins"),
    losses: readReviewNumber(payload, "losses"),
    averageWin: readReviewNumber(payload, "averageWin"),
    averageLoss: readReviewNumber(payload, "averageLoss"),
    bestTradePnl: readReviewNumber(payload, "bestTradePnl"),
    worstTradePnl: readReviewNumber(payload, "worstTradePnl"),
    bestDayPnl: readReviewNumber(payload, "bestDayPnl"),
    worstDayPnl: readReviewNumber(payload, "worstDayPnl"),
    longTrades: readReviewNumber(payload, "longTrades"),
    shortTrades: readReviewNumber(payload, "shortTrades"),
    ruleBreakTrades: readReviewNumber(payload, "ruleBreakTrades"),
    highConfidenceTrades: readReviewNumber(payload, "highConfidenceTrades"),
    topAsset: readReviewString(payload, "topAsset"),
    primaryTradingZone: readReviewString(payload, "primaryTradingZone"),
    dominantEmotion: readReviewString(payload, "dominantEmotion"),
    topTechnicalTheme: readReviewString(payload, "topTechnicalTheme"),
  }
}

// --- API Functions ---

export async function fetchReview(
  periodType: ReviewPeriodType,
  periodStart: string
): Promise<ReviewData> {
  const response = await api.get<ApiResponse<ReviewData>>(
    `/v1/reviews?periodType=${periodType}&periodStart=${periodStart}`
  )

  return normalizeReviewData(response.data.value as ReviewPayload, {
    periodStart,
    periodType,
  })
}

export async function saveReview(data: {
  periodType: ReviewPeriodType
  periodStart: string
  periodEnd: string
  userNotes: string
}): Promise<number> {
  const response = await api.post<ApiResponse<number>>("/v1/reviews", data)
  return response.data.value
}

export async function generateReviewSummary(data: {
  periodType: ReviewPeriodType
  periodStart: string
  periodEnd: string
}): Promise<boolean> {
  const response = await api.post<ApiResponse<boolean>>(
    "/v1/reviews/generate-summary",
    data
  )
  return response.data.value
}

export async function fetchReviewSummaryStatus(
  periodType: ReviewPeriodType,
  periodStart: string
): Promise<ReviewSummaryStatus> {
  const response = await api.get<ApiResponse<ReviewSummaryStatus>>(
    `/v1/reviews/summary-status?periodType=${periodType}&periodStart=${periodStart}`
  )
  return response.data.value
}

export async function fetchReviewTrades(
  fromDate: string,
  toDate: string,
  page = 1,
  pageSize = 50
): Promise<PaginatedReviewTrades> {
  const response = await api.post<ApiResponse<PaginatedReviewTrades>>(
    "/v1/reviews/trades",
    { fromDate, toDate, page, pageSize }
  )
  return response.data.value
}

// --- Period Helpers ---

export function getPeriodBounds(
  periodType: ReviewPeriodType,
  referenceDate: Date
): { start: Date; end: Date } {
  const d = new Date(referenceDate)
  switch (periodType) {
    case ReviewPeriodType.Daily:
      return {
        start: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59),
      }
    case ReviewPeriodType.Weekly: {
      // Start on Monday
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      sunday.setHours(23, 59, 59)
      return { start: monday, end: sunday }
    }
    case ReviewPeriodType.Monthly:
      return {
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      }
    case ReviewPeriodType.Quarterly: {
      const quarter = Math.floor(d.getMonth() / 3)
      const qStart = new Date(d.getFullYear(), quarter * 3, 1)
      const qEnd = new Date(d.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59)
      return { start: qStart, end: qEnd }
    }
  }
}

export function navigatePeriod(
  periodType: ReviewPeriodType,
  current: Date,
  direction: "prev" | "next"
): Date {
  const d = new Date(current)
  const delta = direction === "prev" ? -1 : 1

  switch (periodType) {
    case ReviewPeriodType.Daily:
      d.setDate(d.getDate() + delta)
      break
    case ReviewPeriodType.Weekly:
      d.setDate(d.getDate() + delta * 7)
      break
    case ReviewPeriodType.Monthly:
      d.setMonth(d.getMonth() + delta)
      break
    case ReviewPeriodType.Quarterly:
      d.setMonth(d.getMonth() + delta * 3)
      break
  }
  return d
}

export function formatPeriodLabel(
  periodType: ReviewPeriodType,
  date: Date
): string {
  const opts: Intl.DateTimeFormatOptions = {}
  switch (periodType) {
    case ReviewPeriodType.Daily:
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    case ReviewPeriodType.Weekly: {
      const bounds = getPeriodBounds(ReviewPeriodType.Weekly, date)
      const s = bounds.start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const e = bounds.end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      return `${s} – ${e}`
    }
    case ReviewPeriodType.Monthly:
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    case ReviewPeriodType.Quarterly: {
      const q = Math.floor(date.getMonth() / 3) + 1
      return `Q${q} ${date.getFullYear()}`
    }
  }
}

export function toISODateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

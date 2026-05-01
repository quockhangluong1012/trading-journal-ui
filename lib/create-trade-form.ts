import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"
import type { TradeScreenshot } from "@/lib/trade-store"

export const CREATE_TRADE_PATH = "/trade/new"
export const DEFAULT_CREATE_TRADE_RETURN_PATH = "/history"
export const CREATE_TRADE_SCREENSHOT_MAX_COUNT = 5
export const CREATE_TRADE_SCREENSHOT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
export const CREATE_TRADE_SCREENSHOT_MAX_TOTAL_SIZE_BYTES = 15 * 1024 * 1024

const CREATE_TRADE_SCREENSHOT_ALLOWED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const

const CREATE_TRADE_SCREENSHOT_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const

export interface TradeFormData {
  asset: string
  position: PositionType
  entryPrice: string
  targetTier1: string
  targetTier2: string
  targetTier3: string
  stopLoss: string
  notes: string
  date: string
}

export interface TradeRiskMetrics {
  riskPerUnit: number
  rewardPerUnit: number
  rrRatio: number
  riskPctFromSl: number
  riskScore: number
}

export interface CreateTradeScreenshotCandidate {
  name: string
  type: string
  size: number
}

export interface CreateTradePayload {
  asset: string
  position: number
  entryPrice: number
  targetTier1: number
  targetTier2: number | null
  targetTier3: number | null
  stopLoss: number
  notes: string
  date: string
  status: TradeStatus
  exitPrice: null
  pnl: null
  closedDate: null
  screenshots: string[] | null
  tradeTechnicalAnalysisTags: number[] | null
  emotionTags: number[] | null
  confidenceLevel: number | null
  tradeHistoryChecklists: number[] | null
  tradingZoneId: number | null
  tradingSessionId: number | null
  powerOf3Phase: number | null
  dailyBias: number | null
  marketStructure: number | null
  premiumDiscount: number | null
}

interface BuildCreateTradePayloadOptions {
  formData: TradeFormData
  screenshots: TradeScreenshot[]
  analysisTags: string[]
  selectedEmotions: string[]
  confidenceLevel: number
  checkedItems: string[]
  tradingSession: string
  activeSessionId?: string | null
  ictPowerOf3?: number | null
  ictDailyBias?: number | null
  ictMarketStructure?: number | null
  ictPremiumDiscount?: number | null
}

const parseOptionalNumber = (value: string): number | null => {
  const parsedValue = Number.parseFloat(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const parseOptionalInteger = (value: string | null | undefined): number | null => {
  if (!value) {
    return null
  }

  const parsedValue = Number.parseInt(value, 10)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const parseStringIdList = (values: string[]): number[] | null => {
  const parsedValues = values
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value))

  return parsedValues.length > 0 ? parsedValues : null
}

export const getInitialTradeFormData = (now: Date = new Date()): TradeFormData => ({
  asset: "",
  position: PositionType.Long,
  entryPrice: "",
  targetTier1: "",
  targetTier2: "",
  targetTier3: "",
  stopLoss: "",
  notes: "",
  date: now.toISOString().split("T")[0] ?? "",
})

export const calculateTradeRiskMetrics = (formData: TradeFormData): TradeRiskMetrics => {
  const entry = Number.parseFloat(formData.entryPrice) || 0
  const stopLoss = Number.parseFloat(formData.stopLoss) || 0
  const targetTier1 = Number.parseFloat(formData.targetTier1) || 0

  const riskPerUnit = entry > 0 && stopLoss > 0 ? Math.abs(entry - stopLoss) : 0
  const rewardPerUnit = entry > 0 && targetTier1 > 0 ? Math.abs(targetTier1 - entry) : 0
  const rrRatio = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0
  const riskPctFromSl = entry > 0 && stopLoss > 0 ? (riskPerUnit / entry) * 100 : 0

  let riskScore = 0

  if (rrRatio >= 2) {
    riskScore += 45
  } else if (rrRatio >= 1.5) {
    riskScore += 25
  } else if (rrRatio >= 1) {
    riskScore += 10
  }

  if (stopLoss > 0) {
    riskScore += 30
  }

  if (targetTier1 > 0) {
    riskScore += 25
  }

  return {
    riskPerUnit,
    rewardPerUnit,
    rrRatio,
    riskPctFromSl,
    riskScore,
  }
}

export const isAllowedCreateTradeScreenshotDataUrl = (value: string): boolean =>
  CREATE_TRADE_SCREENSHOT_ALLOWED_MIME_TYPES.some((mimeType) =>
    value.startsWith(`data:${mimeType}`),
  )

export const validateCreateTradeScreenshot = (
  candidate: CreateTradeScreenshotCandidate,
  currentCount: number,
  currentTotalSizeBytes: number,
): string | null => {
  if (currentCount >= CREATE_TRADE_SCREENSHOT_MAX_COUNT) {
    return `You can upload up to ${CREATE_TRADE_SCREENSHOT_MAX_COUNT} screenshots per trade.`
  }

  const fileExtension = candidate.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ""
  const hasAllowedExtension = CREATE_TRADE_SCREENSHOT_ALLOWED_EXTENSIONS.includes(
    fileExtension as (typeof CREATE_TRADE_SCREENSHOT_ALLOWED_EXTENSIONS)[number],
  )
  const hasAllowedMimeType = CREATE_TRADE_SCREENSHOT_ALLOWED_MIME_TYPES.includes(
    candidate.type as (typeof CREATE_TRADE_SCREENSHOT_ALLOWED_MIME_TYPES)[number],
  )

  if (!hasAllowedExtension || !hasAllowedMimeType) {
    return "Only PNG, JPG, and WebP screenshots are supported."
  }

  if (candidate.size > CREATE_TRADE_SCREENSHOT_MAX_FILE_SIZE_BYTES) {
    return "Each screenshot must be 5MB or smaller."
  }

  if (currentTotalSizeBytes + candidate.size > CREATE_TRADE_SCREENSHOT_MAX_TOTAL_SIZE_BYTES) {
    return "Total screenshot size must stay under 15MB per trade."
  }

  return null
}

export const buildCreateTradePayload = ({
  formData,
  screenshots,
  analysisTags,
  selectedEmotions,
  confidenceLevel,
  checkedItems,
  tradingSession,
  activeSessionId,
}: BuildCreateTradePayloadOptions): CreateTradePayload => ({
  asset: formData.asset.toUpperCase().trim(),
  position: Number(formData.position),
  entryPrice: parseOptionalNumber(formData.entryPrice) ?? 0,
  targetTier1: parseOptionalNumber(formData.targetTier1) ?? 0,
  targetTier2: parseOptionalNumber(formData.targetTier2),
  targetTier3: parseOptionalNumber(formData.targetTier3),
  stopLoss: parseOptionalNumber(formData.stopLoss) ?? 0,
  notes: formData.notes,
  date: new Date(formData.date).toISOString(),
  status: TradeStatus.Open,
  exitPrice: null,
  pnl: null,
  closedDate: null,
  screenshots: screenshots.length > 0 ? screenshots.map((screenshot) => screenshot.url) : null,
  tradeTechnicalAnalysisTags: parseStringIdList(analysisTags),
  emotionTags: parseStringIdList(selectedEmotions),
  confidenceLevel: confidenceLevel > 0 ? confidenceLevel : null,
  tradeHistoryChecklists: parseStringIdList(checkedItems),
  tradingZoneId: parseOptionalInteger(tradingSession),
  tradingSessionId: parseOptionalInteger(activeSessionId),
  powerOf3Phase: options.ictPowerOf3 ?? null,
  dailyBias: options.ictDailyBias ?? null,
  marketStructure: options.ictMarketStructure ?? null,
  premiumDiscount: options.ictPremiumDiscount ?? null,
})

export const sanitizeTradeReturnPath = (
  candidate: string | null | undefined,
  fallback: string = DEFAULT_CREATE_TRADE_RETURN_PATH,
): string => {
  if (!candidate) {
    return fallback
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback
  }

  return candidate
}

export const buildCreateTradeHref = (nextPath?: string): string => {
  const safeNextPath = sanitizeTradeReturnPath(nextPath, "")

  if (!safeNextPath) {
    return CREATE_TRADE_PATH
  }

  return `${CREATE_TRADE_PATH}?next=${encodeURIComponent(safeNextPath)}`
}
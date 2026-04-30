import { api, ApiResponse } from "@/lib/api"

// ─── Types ─────────────────────────────────────────────────────────────

export interface TradeTemplateDto {
  id: number
  name: string
  description: string | null
  asset: string | null
  position: number | null
  tradingZoneId: number | null
  tradingZoneName: string | null
  tradingSessionId: number | null
  tradingSetupId: number | null
  defaultStopLoss: number | null
  defaultTargetTier1: number | null
  defaultTargetTier2: number | null
  defaultTargetTier3: number | null
  defaultConfidenceLevel: number | null
  defaultNotes: string | null
  defaultChecklistIds: number[] | null
  defaultEmotionTagIds: number[] | null
  defaultTechnicalAnalysisTagIds: number[] | null
  usageCount: number
  isFavorite: boolean
  sortOrder: number
  createdDate: string
}

export interface CreateTemplateRequest {
  name: string
  description: string | null
  asset: string | null
  position: number | null
  tradingZoneId: number | null
  tradingSessionId: number | null
  tradingSetupId: number | null
  defaultStopLoss: number | null
  defaultTargetTier1: number | null
  defaultTargetTier2: number | null
  defaultTargetTier3: number | null
  defaultConfidenceLevel: number | null
  defaultNotes: string | null
  defaultChecklistIds: number[] | null
  defaultEmotionTagIds: number[] | null
  defaultTechnicalAnalysisTagIds: number[] | null
  isFavorite: boolean
}

export type UpdateTemplateRequest = CreateTemplateRequest & { id: number }

// ─── API Functions ─────────────────────────────────────────────────────

const TEMPLATE_BASE = "/v1/trade-templates"

export async function getTemplates() {
  return api.get<ApiResponse<TradeTemplateDto[]>>(TEMPLATE_BASE)
}

export async function getTemplateById(id: number) {
  return api.get<ApiResponse<TradeTemplateDto>>(`${TEMPLATE_BASE}/${id}`)
}

export async function createTemplate(data: CreateTemplateRequest) {
  return api.post<ApiResponse<number>>(TEMPLATE_BASE, data)
}

export async function updateTemplate(data: UpdateTemplateRequest) {
  return api.put<ApiResponse<boolean>>(`${TEMPLATE_BASE}/${data.id}`, data)
}

export async function deleteTemplate(id: number) {
  return api.delete<ApiResponse<boolean>>(`${TEMPLATE_BASE}/${id}`)
}

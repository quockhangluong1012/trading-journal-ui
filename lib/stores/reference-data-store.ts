import { create } from "zustand"
import { api, type ApiResponse } from "@/lib/api"
import type {
  EmotionTagApi,
  ChecklistModelApi,
  ChecklistModelDetailApi,
  TechnicalAnalysisTagApi,
} from "@/lib/trade-store"
import type { PretradeChecklistDto } from "@/lib/pretrade-models-api"
import type { TradingSetupSummaryDto } from "@/lib/setup-api"

export interface TradingZoneApi {
  id: number
  name: string
  description: string | null
  fromTime: string
  toTime: string
}

// Shared, cached reference data used by the trade detail/edit screens. These
// lists (emotions, checklist models, technical-analysis tags, trading zones,
// setups, and the flat checklist list used to infer a trade's model) barely
// change between page mounts, so we fetch them once and reuse them. Without
// this store each mount of the detail page re-fetched all five lists.
interface ReferenceDataState {
  emotions: EmotionTagApi[]
  checklistModels: ChecklistModelApi[]
  technicalTags: TechnicalAnalysisTagApi[]
  tradingZones: TradingZoneApi[]
  setups: TradingSetupSummaryDto[]
  // Flat list of every checklist criterion with its owning model id, used to
  // infer which checklist model a trade was logged against.
  allChecklists: PretradeChecklistDto[]
  // Per-model criteria detail, cached by model id.
  modelDetails: Record<number, ChecklistModelDetailApi>
  loaded: boolean
  isLoading: boolean
  loadAll: (force?: boolean) => Promise<void>
  loadModelDetail: (
    modelId: number,
    force?: boolean,
  ) => Promise<ChecklistModelDetailApi | null>
}

export const useReferenceDataStore = create<ReferenceDataState>((set, get) => ({
  emotions: [],
  checklistModels: [],
  technicalTags: [],
  tradingZones: [],
  setups: [],
  allChecklists: [],
  modelDetails: {},
  loaded: false,
  isLoading: false,

  loadAll: async (force = false) => {
    const state = get()
    if (state.isLoading) return
    if (state.loaded && !force) return

    set({ isLoading: true })

    const [
      emotionsRes,
      modelsRes,
      techRes,
      zonesRes,
      setupsRes,
      checklistsRes,
    ] = await Promise.allSettled([
      api.get<ApiResponse<EmotionTagApi[]>>("/v1/emotions"),
      api.get<ApiResponse<ChecklistModelApi[]>>("/v1/checklist-models"),
      api.get<ApiResponse<TechnicalAnalysisTagApi[]>>("/v1/technical-analysis"),
      api.get<ApiResponse<TradingZoneApi[]>>("/v1/trading-zones"),
      api.get<ApiResponse<TradingSetupSummaryDto[]>>("/v1/trading-setups"),
      api.get<ApiResponse<PretradeChecklistDto[]>>("/v1/pretrade-checklists"),
    ])

    const next: Partial<ReferenceDataState> = { loaded: true, isLoading: false }

    if (emotionsRes.status === "fulfilled" && emotionsRes.value.data.isSuccess) {
      next.emotions = emotionsRes.value.data.value
    }
    if (modelsRes.status === "fulfilled" && modelsRes.value.data.isSuccess) {
      next.checklistModels = modelsRes.value.data.value
    }
    if (techRes.status === "fulfilled" && techRes.value.data.isSuccess) {
      next.technicalTags = techRes.value.data.value
    }
    if (zonesRes.status === "fulfilled" && zonesRes.value.data.isSuccess) {
      next.tradingZones = zonesRes.value.data.value
    }
    if (setupsRes.status === "fulfilled" && setupsRes.value.data.isSuccess) {
      next.setups = setupsRes.value.data.value
    }
    if (checklistsRes.status === "fulfilled" && checklistsRes.value.data.isSuccess) {
      next.allChecklists = checklistsRes.value.data.value
    }

    set(next)
  },

  loadModelDetail: async (modelId, force = false) => {
    if (!Number.isFinite(modelId)) return null

    const cached = get().modelDetails[modelId]
    if (cached && !force) return cached

    try {
      const response = await api.get<ApiResponse<ChecklistModelDetailApi>>(
        `/v1/checklist-models/${modelId}`,
      )
      if (!response.data.isSuccess) return null

      const detail = response.data.value
      set((state) => ({
        modelDetails: { ...state.modelDetails, [modelId]: detail },
      }))
      return detail
    } catch {
      return null
    }
  },
}))

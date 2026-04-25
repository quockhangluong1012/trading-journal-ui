import { create } from "zustand"
import { api, attachToken, type ApiResponse } from "@/lib/api"
import { Trade } from "@/app/types/trade"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"

// ─── API Types ──────────────────────────────────────────────────────────

interface TradeSearchRequest {
  asset?: string
  position?: PositionType
  status?: TradeStatus
  fromDate?: string
  toDate?: string
  page?: number
  pageSize?: number
}

interface PaginationResult<T> {
  values: T[]
  totalItems: number
  hasMore: boolean
}

interface CloseTradeRequest {
  tradeId: number
  exitPrice: number
  pnL: number
  tradingResult?: string
  hitStopLoss?: boolean
}

interface UpdateTradeRequest {
  id: number
  asset: string
  position: PositionType
  entryPrice: number
  targetTier1: number
  targetTier2?: number
  targetTier3?: number
  stopLoss: number
  notes: string
  date: string
  status: TradeStatus
  exitPrice?: number
  pnl?: number
  closedDate?: string
  screenshots?: string[]
  tradeTechnicalAnalysisTags?: number[]
  emotionTags?: number[]
  confidenceLevel: number
  psychologyNotes?: string
  tradeHistoryChecklists: number[]
  tradingZoneId: number
  tradingSessionId?: number
}

// ─── API Response Mapping ───────────────────────────────────────────────

interface TradeApiResponseDto {
  id?: number
  asset?: string
  position?: PositionType
  entryPrice?: number
  targetTier1?: number
  targetTier2?: number
  targetTier3?: number
  stopLoss?: number
  notes?: string
  date?: string
  status?: TradeStatus
  exitPrice?: number
  pnl?: number
  closedDate?: string
  tradeScreenShots?: { url: string }[]
  emotionTags?: { id: number }[]
  confidenceLevel?: number
  tradeTechnicalAnalysisTags?: { id: number }[]
  tradingZoneId?: number
  tradingSessionId?: number
  tradeChecklists?: { pretradeChecklistId: number }[]
}

function mapTradeFromApi(t: TradeApiResponseDto): Trade {
  return {
    id: t.id?.toString() ?? "",
    asset: t.asset ?? "",
    position: t.position ?? PositionType.Long,
    entryPrice: t.entryPrice ?? 0,
    targetTier1: t.targetTier1 ?? 0,
    targetTier2: t.targetTier2 ?? 0,
    targetTier3: t.targetTier3 ?? 0,
    stopLoss: t.stopLoss ?? 0,
    notes: t.notes ?? "",
    date: t.date ? new Date(t.date).toISOString().split("T")[0] : "",
    status: t.status ?? TradeStatus.Open,
    exitPrice: t.exitPrice ?? undefined,
    pnl: t.pnl ?? undefined,
    closedDate: t.closedDate
      ? new Date(t.closedDate).toISOString().split("T")[0]
      : undefined,
    screenshots: t.tradeScreenShots?.map((s) => ({
      url: s.url,
    })),
    emotionTags: t.emotionTags?.map((e) => e.id.toString()),
    confidenceLevel: t.confidenceLevel ?? undefined,
    analysisTags: t.tradeTechnicalAnalysisTags?.map(
      (ta) => ta.id.toString()
    ),
    tradingSession: t.tradingZoneId?.toString() ?? undefined,
    sessionId: t.tradingSessionId?.toString() ?? undefined,
    pretradeChecklist: t.tradeChecklists?.map(
      (c) => c.pretradeChecklistId.toString()
    ),
  }
}

// ─── Store ──────────────────────────────────────────────────────────────

interface TradeApiStore {
  // State
  trades: Trade[]
  totalItems: number
  hasMore: boolean
  isLoading: boolean
  error: string | null

  // Search params
  searchParams: TradeSearchRequest

  // Actions
  loadTrades: (params?: TradeSearchRequest) => Promise<void>
  loadAllTrades: () => Promise<void>
  updateTrade: (id: string, updates: Partial<Trade>) => Promise<boolean>
  deleteTrade: (id: string) => Promise<boolean>
  closeTrade: (
    id: string,
    exitPrice: number,
    pnl: number,
    tradingResult?: string,
    hitStopLoss?: boolean
  ) => Promise<boolean>
  addTradeToLocal: (trade: Trade) => void
  setSearchParams: (params: TradeSearchRequest) => void
  reset: () => void
}

const initialState = {
  trades: [] as Trade[],
  totalItems: 0,
  hasMore: false,
  isLoading: false,
  error: null as string | null,
  searchParams: { page: 1, pageSize: 50 } as TradeSearchRequest,
}

export const useTradeApiStore = create<TradeApiStore>((set, get) => ({
  ...initialState,

  loadTrades: async (params?: TradeSearchRequest) => {
    set({ isLoading: true, error: null })
    try {
      attachToken()
      const searchParams = params ?? get().searchParams
      const res = await api.post<ApiResponse<PaginationResult<TradeApiResponseDto>>>(
        "/v1/trade-histories/search",
        searchParams
      )

      if (res.data.isSuccess && res.data.value) {
        const mapped = (res.data.value.values ?? []).map(mapTradeFromApi)
        set({
          trades: mapped,
          totalItems: res.data.value.totalItems,
          hasMore: res.data.value.hasMore,
          isLoading: false,
          searchParams,
        })
      } else {
        set({ isLoading: false, error: "Failed to load trades" })
      }
    } catch {
      set({ isLoading: false, error: "Failed to load trades" })
    }
  },

  loadAllTrades: async () => {
    set({ isLoading: true, error: null })
    try {
      attachToken()
      const res = await api.post<ApiResponse<PaginationResult<TradeApiResponseDto>>>(
        "/v1/trade-histories/search",
        { page: 1, pageSize: 1000 }
      )

      if (res.data.isSuccess && res.data.value) {
        const mapped = (res.data.value.values ?? []).map(mapTradeFromApi)
        set({
          trades: mapped,
          totalItems: res.data.value.totalItems,
          hasMore: res.data.value.hasMore,
          isLoading: false,
        })
      } else {
        set({ isLoading: false, error: "Failed to load trades" })
      }
    } catch {
      set({ isLoading: false, error: "Failed to load trades" })
    }
  },

  updateTrade: async (id: string, updates: Partial<Trade>) => {
    try {
      attachToken()
      const current = get().trades.find((t) => t.id === id)
      if (!current) return false

      const merged = { ...current, ...updates }

      const payload: UpdateTradeRequest = {
        id: parseInt(id, 10),
        asset: merged.asset,
        position: merged.position,
        entryPrice: merged.entryPrice,
        targetTier1: merged.targetTier1,
        targetTier2: merged.targetTier2 || undefined,
        targetTier3: merged.targetTier3 || undefined,
        stopLoss: merged.stopLoss,
        notes: merged.notes,
        date: merged.date,
        status: merged.status,
        exitPrice: merged.exitPrice,
        pnl: merged.pnl,
        closedDate: merged.closedDate,
        screenshots: merged.screenshots?.map((s) => s.url),
        emotionTags: merged.emotionTags?.map((e) => parseInt(e, 10)),
        confidenceLevel: merged.confidenceLevel ?? 0,
        tradeTechnicalAnalysisTags: merged.analysisTags?.map((t) =>
          parseInt(t, 10)
        ),
        tradeHistoryChecklists: merged.pretradeChecklist?.map((c) =>
          parseInt(c, 10)
        ) ?? [],
        tradingZoneId: merged.tradingSession
          ? parseInt(merged.tradingSession, 10)
          : 0,
        tradingSessionId: merged.sessionId
          ? parseInt(merged.sessionId, 10)
          : undefined,
      }

      const res = await api.put<ApiResponse<boolean>>(
        "/v1/trade-histories",
        payload
      )

      if (res.data.isSuccess) {
        set((s) => ({
          trades: s.trades.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  deleteTrade: async (id: string) => {
    try {
      attachToken()
      const res = await api.delete<ApiResponse<number>>(
        `/v1/trade-histories/${id}`
      )

      if (res.data.isSuccess) {
        set((s) => ({
          trades: s.trades.filter((t) => t.id !== id),
          totalItems: s.totalItems - 1,
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  closeTrade: async (
    id: string,
    exitPrice: number,
    pnl: number,
    tradingResult?: string,
    hitStopLoss?: boolean
  ) => {
    try {
      attachToken()
      const payload: CloseTradeRequest = {
        tradeId: parseInt(id, 10),
        exitPrice,
        pnL: pnl,
        tradingResult,
        hitStopLoss,
      }

      const res = await api.post<ApiResponse<boolean>>(
        "/v1/trade-histories/close",
        payload
      )

      if (res.data.isSuccess) {
        set((s) => ({
          trades: s.trades.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: TradeStatus.Closed,
                  exitPrice,
                  pnl,
                  closedDate: new Date().toISOString().split("T")[0],
                }
              : t
          ),
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  addTradeToLocal: (trade: Trade) => {
    set((s) => ({
      trades: [trade, ...s.trades],
      totalItems: s.totalItems + 1,
    }))
  },

  setSearchParams: (params: TradeSearchRequest) => {
    set({ searchParams: { ...get().searchParams, ...params } })
  },

  reset: () => set(initialState),
}))

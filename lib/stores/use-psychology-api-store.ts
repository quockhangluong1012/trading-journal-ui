import { create } from "zustand"
import { api, attachToken, type ApiResponse } from "@/lib/api"

// ─── Types ──────────────────────────────────────────────────────────────

export interface PsychologyEmotionTag {
  id: number
  name: string
}

export interface PsychologyJournal {
  id: number
  date: string
  todayTradingReview: string
  overallMood: number
  confidentLevel: number
  emotionTags: PsychologyEmotionTag[]
}

interface PaginationResult<T> {
  values: T[]
  totalItems: number
  hasMore: boolean
}

interface CreatePsychologyRequest {
  date: string
  todayTradingReview: string
  overallMood: number
  confidentLevel: number
  emotionTagIds: number[]
}

interface UpdatePsychologyRequest {
  id: number
  todayTradingReview: string
  overallMood: number
  confidentLevel: number
  emotionTagIds: number[]
}

// ─── Store ──────────────────────────────────────────────────────────────

interface PsychologyApiStore {
  // State
  journals: PsychologyJournal[]
  totalItems: number
  hasMore: boolean
  isLoading: boolean
  error: string | null

  // Actions
  loadJournals: (params?: {
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
  }) => Promise<void>
  createJournal: (entry: CreatePsychologyRequest) => Promise<boolean>
  updateJournal: (entry: UpdatePsychologyRequest) => Promise<boolean>
  deleteJournal: (id: number) => Promise<boolean>
  reset: () => void
}

const initialState = {
  journals: [] as PsychologyJournal[],
  totalItems: 0,
  hasMore: false,
  isLoading: false,
  error: null as string | null,
}

export const usePsychologyApiStore = create<PsychologyApiStore>((set) => ({
  ...initialState,

  loadJournals: async (params) => {
    set({ isLoading: true, error: null })
    try {
      attachToken()
      const res = await api.post<
        ApiResponse<PaginationResult<PsychologyJournal>>
      >("/v1/psychology-journals/search", {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 50,
        startDate: params?.startDate ?? null,
        endDate: params?.endDate ?? null,
      })

      if (res.data.isSuccess && res.data.value) {
        set({
          journals: res.data.value.values ?? [],
          totalItems: res.data.value.totalItems,
          hasMore: res.data.value.hasMore,
          isLoading: false,
        })
      } else {
        set({ isLoading: false, error: "Failed to load journals" })
      }
    } catch {
      set({ isLoading: false, error: "Failed to load journals" })
    }
  },

  createJournal: async (entry) => {
    try {
      attachToken()
      const res = await api.post<ApiResponse<number>>(
        "/v1/psychology-journals",
        entry
      )

      if (res.data.isSuccess) {
        // Optimistically add the new journal to the list
        const newJournal: PsychologyJournal = {
          id: res.data.value,
          date: entry.date,
          todayTradingReview: entry.todayTradingReview,
          overallMood: entry.overallMood,
          confidentLevel: entry.confidentLevel,
          emotionTags: entry.emotionTagIds.map((id) => ({
            id,
            name: "", // Will be resolved on next load
          })),
        }
        set((s) => ({
          journals: [newJournal, ...s.journals],
          totalItems: s.totalItems + 1,
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  updateJournal: async (entry) => {
    try {
      attachToken()
      const res = await api.put<ApiResponse<boolean>>(
        "/v1/psychology-journals",
        entry
      )

      if (res.data.isSuccess) {
        set((s) => ({
          journals: s.journals.map((j) =>
            j.id === entry.id
              ? {
                  ...j,
                  todayTradingReview: entry.todayTradingReview,
                  overallMood: entry.overallMood,
                  confidentLevel: entry.confidentLevel,
                  emotionTags: entry.emotionTagIds.map((id) => ({
                    id,
                    name:
                      j.emotionTags.find((e) => e.id === id)?.name ?? "",
                  })),
                }
              : j
          ),
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  deleteJournal: async (id) => {
    try {
      attachToken()
      const res = await api.delete<ApiResponse<number>>(
        `/v1/psychology-journals/${id}`
      )

      if (res.data.isSuccess) {
        set((s) => ({
          journals: s.journals.filter((j) => j.id !== id),
          totalItems: s.totalItems - 1,
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  },

  reset: () => set(initialState),
}))

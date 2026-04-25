import { create } from "zustand"
import { api, attachToken, type ApiResponse } from "@/lib/api"

// ─── Types ──────────────────────────────────────────────────────────────

export interface UserSession {
  id: string
  startTime: string
  expectedEndTime?: string
  endTime?: string
  status: "Active" | "Closed"
  pnl?: number
  tradesCount?: number
  notes?: string
  duration?: string
}

interface SessionApiResponseDto {
  id?: number
  fromTime?: string
  startTime?: string
  toTime?: string
  endTime?: string
  status?: number | string
  pnL?: number
  pnl?: number
  tradeCount?: number
  tradesCount?: number
  note?: string
  notes?: string
  duration?: string
}

function mapSessionFromApi(s: SessionApiResponseDto): UserSession {
  return {
    id: s.id?.toString() ?? "",
    startTime: s.fromTime ?? s.startTime ?? "",
    endTime: s.toTime ?? s.endTime ?? undefined,
    status: s.status === 1 || s.status === "Closed" ? "Closed" : "Active",
    pnl: s.pnL ?? s.pnl ?? undefined,
    tradesCount: s.tradeCount ?? s.tradesCount ?? undefined,
    notes: s.note ?? s.notes ?? undefined,
    duration: s.duration ?? undefined,
  }
}

// ─── Store ──────────────────────────────────────────────────────────────

interface SessionStore {
  sessions: UserSession[]
  isLoading: boolean
  activeSession: UserSession | null

  loadSessions: () => Promise<void>
  startSession: () => Promise<void>
  endSession: (note: string, duration: string) => Promise<void>
  reset: () => void
}

const initialState = {
  sessions: [] as UserSession[],
  isLoading: false,
  activeSession: null as UserSession | null,
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  loadSessions: async () => {
    set({ isLoading: true })
    try {
      attachToken()
      const res = await api.get<ApiResponse<SessionApiResponseDto[]>>("/v1/trading-sessions")

      if (res.data.isSuccess && res.data.value) {
        const mapped = res.data.value.map(mapSessionFromApi)
        const active = mapped.find((s) => s.status === "Active") ?? null
        set({ sessions: mapped, activeSession: active, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  startSession: async () => {
    try {
      attachToken()
      const now = new Date()
      const res = await api.post<ApiResponse<number>>("/v1/trading-sessions", {
        fromTime: now.toISOString(),
      })

      if (res.data.isSuccess) {
        const newSession: UserSession = {
          id: res.data.value.toString(),
          startTime: now.toISOString(),
          status: "Active",
          tradesCount: 0,
          pnl: 0,
        }
        set((s) => ({
          sessions: [newSession, ...s.sessions],
          activeSession: newSession,
        }))
      } else {
        throw new Error("Failed to create session")
      }
    } catch (error) {
      console.error("Error starting session:", error)
      throw error
    }
  },

  endSession: async (note: string, duration: string) => {
    const session = get().activeSession
    if (!session) return

    try {
      attachToken()
      const now = new Date()
      const res = await api.post<ApiResponse<boolean>>(
        "/v1/trading-sessions/end",
        {
          id: parseInt(session.id, 10),
          toTime: now.toISOString(),
          note: note || "",
          duration,
        }
      )

      if (!res.data.isSuccess) {
        throw new Error("Failed to end session")
      }

      set((s) => ({
        sessions: s.sessions.map((sess) => {
          if (sess.id === session.id) {
            return {
              ...sess,
              status: "Closed" as const,
              endTime: now.toISOString(),
              notes: note || undefined,
              duration,
            }
          }
          return sess
        }),
        activeSession: null,
      }))
    } catch (error) {
      console.error("Error ending session:", error)
      throw error
    }
  },

  reset: () => set(initialState),
}))

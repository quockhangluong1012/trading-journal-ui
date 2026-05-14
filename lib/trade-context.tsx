"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "@/lib/auth-context"
import { useTradeApiStore } from "@/lib/stores/use-trade-api-store"
import { useSessionStore, type UserSession } from "@/lib/stores/use-session-store"
import { samplePsychologyEntries, type PsychologyEntry } from "./trade-store"
import { PositionType } from "./enum/PositionType"
import { toast } from "@/hooks/use-toast"
import { Trade } from "@/app/types/trade"


// ─── Compatibility Layer ────────────────────────────────────────────────
// This context now delegates to focused Zustand stores.
// Consumers can continue using `useTrades()` as before, or migrate
// directly to the individual stores for better performance:
//
//   import { useTradeApiStore } from "@/lib/stores/use-trade-api-store"
//   import { useSessionStore } from "@/lib/stores/use-session-store"
// ─────────────────────────────────────────────────────────────────────────

interface TradeContextType {
  trades: Trade[]
  addTrade: (trade: Omit<Trade, "id">) => void
  updateTrade: (id: string, trade: Partial<Trade>) => Promise<void>
  deleteTrade: (id: string) => Promise<void>
  closeTrade: (id: string, exitPrice: number) => Promise<void>

  // User Sessions
  userSessions: UserSession[]
  activeSession: UserSession | null
  startSession: () => Promise<void>
  endSession: (note: string, duration: string) => Promise<void>

  psychologyEntries: PsychologyEntry[]
  addPsychologyEntry: (entry: Omit<PsychologyEntry, "id">) => void
  updatePsychologyEntry: (id: string, entry: Partial<PsychologyEntry>) => void
  deletePsychologyEntry: (id: string) => void
}

const TradeContext = createContext<TradeContextType | undefined>(undefined)

export function TradeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthLoading } = useAuth()

  // ── Zustand Stores ──
  const [psychologyEntries, setPsychologyEntries] = useState<PsychologyEntry[]>(
    samplePsychologyEntries,
  )
  const trades = useTradeApiStore((state) => state.trades)
  const loadAllTrades = useTradeApiStore((state) => state.loadAllTrades)
  const updateTradeInStore = useTradeApiStore((state) => state.updateTrade)
  const deleteTradeInStore = useTradeApiStore((state) => state.deleteTrade)
  const closeTradeInStore = useTradeApiStore((state) => state.closeTrade)
  const addTradeToLocal = useTradeApiStore((state) => state.addTradeToLocal)
  const resetTrades = useTradeApiStore((state) => state.reset)

  const userSessions = useSessionStore((state) => state.sessions)
  const activeSession = useSessionStore((state) => state.activeSession)
  const loadSessions = useSessionStore((state) => state.loadSessions)
  const startSessionInStore = useSessionStore((state) => state.startSession)
  const endSessionInStore = useSessionStore((state) => state.endSession)
  const resetSessions = useSessionStore((state) => state.reset)

  // ── Load data from API after auth has hydrated ──
  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!user) {
      resetTrades()
      resetSessions()
      return
    }

    void loadAllTrades()
    void loadSessions()
  }, [isAuthLoading, loadAllTrades, loadSessions, resetSessions, resetTrades, user])

  // ── Trade CRUD (delegates to API store) ──
  const addTrade = (trade: Omit<Trade, "id">) => {
    // Trade is already created via API in create-trade-page.tsx
    // This just adds to local state for immediate UI feedback
    const newTrade: Trade = {
      ...trade,
      id: Date.now().toString(),
    }
    addTradeToLocal(newTrade)
  }

  const updateTrade = async (id: string, updates: Partial<Trade>) => {
    const success = await updateTradeInStore(id, updates)
    if (success) {
      toast({ title: "Trade updated", description: "Your trade has been updated." })
    } else {
      toast({ title: "Failed to update trade", description: "Could not update trade. Please try again.", variant: "destructive" })
    }
  }

  const deleteTrade = async (id: string) => {
    const success = await deleteTradeInStore(id)
    if (success) {
      toast({ title: "Trade deleted", description: "Trade has been removed." })
    } else {
      toast({ title: "Failed to delete trade", description: "Could not delete trade. Please try again.", variant: "destructive" })
    }
  }

  const closeTrade = async (id: string, exitPrice: number) => {
    const trade = trades.find((storedTrade) => storedTrade.id === id)
    if (!trade) return

    const multiplier = trade.position === PositionType.Long ? 1 : -1
    const pnl = (exitPrice - trade.entryPrice) * multiplier * 100

    const success = await closeTradeInStore(id, exitPrice, pnl)
    if (success) {
      toast({ title: "Trade closed", description: `PnL: $${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}` })
    } else {
      toast({ title: "Failed to close trade", description: "Could not close trade. Please try again.", variant: "destructive" })
    }
  }

  // ── Session (delegates to session store) ──
  const startSession = async () => {
    try {
      await startSessionInStore()
      toast({ title: "Session started", description: "Your trading session has begun. Good luck!" })
    } catch {
      toast({ title: "Failed to start session", description: "Could not create session. Please try again.", variant: "destructive" })
    }
  }

  const endSession = async (note: string, duration: string) => {
    try {
      await endSessionInStore(note, duration)
      toast({ title: "Session ended", description: "Your trading session has been saved." })
    } catch {
      toast({ title: "Failed to end session", description: "Could not end session. Please try again.", variant: "destructive" })
    }
  }


  const addPsychologyEntry = (entry: Omit<PsychologyEntry, "id">) => {
    const newEntry: PsychologyEntry = {
      ...entry,
      id: `p-${Date.now()}`,
    }
    setPsychologyEntries((prev) => [...prev, newEntry])
  }

  const updatePsychologyEntry = (
    id: string,
    updates: Partial<PsychologyEntry>,
  ) => {
    setPsychologyEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
    )
  }

  const deletePsychologyEntry = (id: string) => {
    setPsychologyEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  return (
    <TradeContext.Provider
      value={{
        trades,
        addTrade,
        updateTrade,
        deleteTrade,
        closeTrade,
        userSessions,
        activeSession,
        startSession,
        endSession,
        psychologyEntries,
        addPsychologyEntry,
        updatePsychologyEntry,
        deletePsychologyEntry
      }}
    >
      {children}
    </TradeContext.Provider>
  )
}

export function useTrades() {
  const context = useContext(TradeContext)
  if (!context) {
    throw new Error("useTrades must be used within a TradeProvider")
  }
  return context
}

"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
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
  updateTrade: (id: string, trade: Partial<Trade>) => void
  deleteTrade: (id: string) => void
  closeTrade: (id: string, exitPrice: number) => void

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
  // ── Zustand Stores ──
  const [psychologyEntries, setPsychologyEntries] = useState<PsychologyEntry[]>(
    samplePsychologyEntries,
  );
  const tradeStore = useTradeApiStore()
  const sessionStore = useSessionStore()

  // ── Load data from API on mount ──
  useEffect(() => {
    tradeStore.loadAllTrades()
    sessionStore.loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Trade CRUD (delegates to API store) ──
  const addTrade = (trade: Omit<Trade, "id">) => {
    // Trade is already created via API in create-trade-page.tsx
    // This just adds to local state for immediate UI feedback
    const newTrade: Trade = {
      ...trade,
      id: Date.now().toString(),
    }
    tradeStore.addTradeToLocal(newTrade)
  }

  const updateTrade = async (id: string, updates: Partial<Trade>) => {
    const success = await tradeStore.updateTrade(id, updates)
    if (success) {
      toast({ title: "Trade updated", description: "Your trade has been updated." })
    } else {
      toast({ title: "Failed to update trade", description: "Could not update trade. Please try again.", variant: "destructive" })
    }
  }

  const deleteTrade = async (id: string) => {
    const success = await tradeStore.deleteTrade(id)
    if (success) {
      toast({ title: "Trade deleted", description: "Trade has been removed." })
    } else {
      toast({ title: "Failed to delete trade", description: "Could not delete trade. Please try again.", variant: "destructive" })
    }
  }

  const closeTrade = async (id: string, exitPrice: number) => {
    const trade = tradeStore.trades.find((t) => t.id === id)
    if (!trade) return

    const multiplier = trade.position === PositionType.Long ? 1 : -1
    const pnl = (exitPrice - trade.entryPrice) * multiplier * 100

    const success = await tradeStore.closeTrade(id, exitPrice, pnl)
    if (success) {
      toast({ title: "Trade closed", description: `PnL: $${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}` })
    } else {
      toast({ title: "Failed to close trade", description: "Could not close trade. Please try again.", variant: "destructive" })
    }
  }

  // ── Session (delegates to session store) ──
  const startSession = async () => {
    try {
      await sessionStore.startSession()
      toast({ title: "Session started", description: "Your trading session has begun. Good luck!" })
    } catch {
      toast({ title: "Failed to start session", description: "Could not create session. Please try again.", variant: "destructive" })
    }
  }

  const endSession = async (note: string, duration: string) => {
    try {
      await sessionStore.endSession(note, duration)
      toast({ title: "Session ended", description: "Your trading session has been saved." })
    } catch {
      toast({ title: "Failed to end session", description: "Could not end session. Please try again.", variant: "destructive" })
    }
  }


  const addPsychologyEntry = (entry: Omit<PsychologyEntry, "id">) => {
    const newEntry: PsychologyEntry = {
      ...entry,
      id: `p-${Date.now()}`,
    };
    setPsychologyEntries((prev) => [...prev, newEntry]);
  };

  const updatePsychologyEntry = (
    id: string,
    updates: Partial<PsychologyEntry>,
  ) => {
    setPsychologyEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
    );
  };

  const deletePsychologyEntry = (id: string) => {
    setPsychologyEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  return (
    <TradeContext.Provider
      value={{
        trades: tradeStore.trades,
        addTrade,
        updateTrade,
        deleteTrade,
        closeTrade,
        userSessions: sessionStore.sessions,
        activeSession: sessionStore.activeSession,
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

import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Trade } from "@/app/types/trade"
import { useTrades, TradeProvider } from "@/lib/trade-context"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"

const loadAllTradesMock = vi.fn<() => Promise<void>>()
const updateTradeMock = vi.fn<() => Promise<boolean>>()
const deleteTradeMock = vi.fn<() => Promise<boolean>>()
const closeTradeMock = vi.fn<() => Promise<boolean>>()
const addTradeToLocalMock = vi.fn()
const resetTradesMock = vi.fn()

const loadSessionsMock = vi.fn<() => Promise<void>>()
const startSessionMock = vi.fn<() => Promise<void>>()
const endSessionMock = vi.fn<() => Promise<void>>()
const resetSessionsMock = vi.fn()

let authState: {
  user: { username: string; email: string } | null
  isAuthLoading: boolean
} = {
  user: { username: "trader", email: "trader@example.com" },
  isAuthLoading: false,
}

const persistedTrades: Trade[] = [
  {
    id: "trade-1",
    asset: "CUSTOM_ASSET",
    position: PositionType.Long,
    entryPrice: 100,
    targetTier1: 120,
    targetTier2: 0,
    targetTier3: 0,
    stopLoss: 90,
    notes: "",
    date: "2026-05-14",
    status: TradeStatus.Open,
  },
]

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}))

vi.mock("@/lib/stores/use-trade-api-store", () => ({
  useTradeApiStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      trades: persistedTrades,
      loadAllTrades: loadAllTradesMock,
      updateTrade: updateTradeMock,
      deleteTrade: deleteTradeMock,
      closeTrade: closeTradeMock,
      addTradeToLocal: addTradeToLocalMock,
      reset: resetTradesMock,
    }

    return selector ? selector(state) : state
  },
}))

vi.mock("@/lib/stores/use-session-store", () => ({
  useSessionStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      sessions: [],
      activeSession: null,
      loadSessions: loadSessionsMock,
      startSession: startSessionMock,
      endSession: endSessionMock,
      reset: resetSessionsMock,
    }

    return selector ? selector(state) : state
  },
}))

function TradeCountConsumer() {
  const { trades } = useTrades()

  return <div>Trade count: {trades.length}</div>
}

describe("TradeProvider", () => {
  beforeEach(() => {
    authState = {
      user: { username: "trader", email: "trader@example.com" },
      isAuthLoading: false,
    }

    loadAllTradesMock.mockReset().mockResolvedValue(undefined)
    updateTradeMock.mockReset().mockResolvedValue(true)
    deleteTradeMock.mockReset().mockResolvedValue(true)
    closeTradeMock.mockReset().mockResolvedValue(true)
    addTradeToLocalMock.mockReset()
    resetTradesMock.mockReset()

    loadSessionsMock.mockReset().mockResolvedValue(undefined)
    startSessionMock.mockReset().mockResolvedValue(undefined)
    endSessionMock.mockReset().mockResolvedValue(undefined)
    resetSessionsMock.mockReset()
  })

  it("hydrates persisted trades and sessions after auth is ready", async () => {
    render(
      <TradeProvider>
        <TradeCountConsumer />
      </TradeProvider>,
    )

    expect(screen.getByText("Trade count: 1")).toBeInTheDocument()

    await waitFor(() => {
      expect(loadAllTradesMock).toHaveBeenCalledTimes(1)
      expect(loadSessionsMock).toHaveBeenCalledTimes(1)
    })

    expect(resetTradesMock).not.toHaveBeenCalled()
    expect(resetSessionsMock).not.toHaveBeenCalled()
  })

  it("clears trade and session state when auth is ready without a user", async () => {
    authState = {
      user: null,
      isAuthLoading: false,
    }

    render(
      <TradeProvider>
        <TradeCountConsumer />
      </TradeProvider>,
    )

    await waitFor(() => {
      expect(resetTradesMock).toHaveBeenCalledTimes(1)
      expect(resetSessionsMock).toHaveBeenCalledTimes(1)
    })

    expect(loadAllTradesMock).not.toHaveBeenCalled()
    expect(loadSessionsMock).not.toHaveBeenCalled()
  })
})
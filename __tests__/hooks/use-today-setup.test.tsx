import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TradingSetupDetailDto, TradingSetupSummaryDto } from "@/lib/setup-api"
import { useTodaySetup } from "@/hooks/use-today-setup"

const getTradingSetupsMock = vi.fn()
const getTradingSetupDetailMock = vi.fn()

vi.mock("@/lib/api", () => ({
  attachToken: vi.fn(),
}))

vi.mock("@/lib/setup-api", () => ({
  getTradingSetups: (...args: unknown[]) => getTradingSetupsMock(...args),
  getTradingSetupDetail: (...args: unknown[]) => getTradingSetupDetailMock(...args),
}))

function createSetupSummary(overrides: Partial<TradingSetupSummaryDto> = {}): TradingSetupSummaryDto {
  return {
    id: 7,
    name: "London breakout",
    description: "Wait for the reclaim candle.",
    stepCount: 1,
    createdAt: "2026-04-21T13:30:00.000Z",
    lastUpdatedAt: "2026-04-21T13:30:00.000Z",
    ...overrides,
  }
}

function createSetupDetail(overrides: Partial<TradingSetupDetailDto> = {}): TradingSetupDetailDto {
  return {
    ...createSetupSummary(),
    nodes: [
      {
        id: "setup-node-start",
        kind: "start",
        title: "Start",
        notes: null,
        position: { x: 80, y: 160 },
      },
      {
        id: "setup-node-step",
        kind: "step",
        title: "Validate context",
        notes: "Check bias before entry.",
        position: { x: 320, y: 160 },
      },
      {
        id: "setup-node-end",
        kind: "end",
        title: "Execute",
        notes: null,
        position: { x: 560, y: 160 },
      },
    ],
    edges: [
      { id: "edge-1", source: "setup-node-start", target: "setup-node-step", label: null },
      { id: "edge-2", source: "setup-node-step", target: "setup-node-end", label: "All conditions align" },
    ],
    ...overrides,
  }
}

async function flushAsyncEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("useTodaySetup", () => {
  const userKey = "trader@example.com"

  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("returns the setup whose created date is today", async () => {
    vi.setSystemTime(new Date(2026, 3, 21, 9, 0, 0))
    const todayCreatedAt = new Date(2026, 3, 21, 8, 15, 0).toISOString()
    const previousDayCreatedAt = new Date(2026, 3, 20, 18, 15, 0).toISOString()

    getTradingSetupsMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: [
          createSetupSummary({ id: 7, createdAt: todayCreatedAt }),
          createSetupSummary({ id: 8, createdAt: previousDayCreatedAt }),
        ],
      },
    })
    getTradingSetupDetailMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: createSetupDetail({ id: 7, createdAt: todayCreatedAt }),
      },
    })

    const { result } = renderHook(() => useTodaySetup(userKey))

    await flushAsyncEffects()

    expect(result.current.setup?.id).toBe(7)

    expect(getTradingSetupsMock).toHaveBeenCalledTimes(1)
    expect(getTradingSetupDetailMock).toHaveBeenCalledWith(7)
  })

  it("clears the mounted setup after the local day rolls over", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 21, 23, 59, 50))
    const beforeMidnightCreatedAt = new Date(2026, 3, 21, 18, 15, 0).toISOString()

    getTradingSetupsMock
      .mockResolvedValueOnce({
        data: {
          isSuccess: true,
          value: [createSetupSummary({ id: 7, createdAt: beforeMidnightCreatedAt })],
        },
      })
      .mockResolvedValueOnce({
        data: {
          isSuccess: true,
          value: [createSetupSummary({ id: 7, createdAt: beforeMidnightCreatedAt })],
        },
      })
    getTradingSetupDetailMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: createSetupDetail({ id: 7, createdAt: beforeMidnightCreatedAt }),
      },
    })

    const { result } = renderHook(() => useTodaySetup(userKey))

    await flushAsyncEffects()

    expect(result.current.setup?.id).toBe(7)

    await act(async () => {
      vi.advanceTimersByTime(11_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.setup).toBeNull()

    expect(getTradingSetupsMock).toHaveBeenCalledTimes(2)
  })
})
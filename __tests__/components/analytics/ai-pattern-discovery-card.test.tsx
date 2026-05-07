import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AiPatternDiscoveryCard } from "@/components/analytics/ai-pattern-discovery-card"
import type { TradePatternDiscoveryResult } from "@/lib/ai-insights-api"

const discoverTradePatternsMock = vi.fn()

vi.mock("@/lib/ai-insights-api", () => ({
  discoverTradePatterns: (...args: unknown[]) => discoverTradePatternsMock(...args),
}))

function createPatternResult(overrides: Partial<TradePatternDiscoveryResult> = {}): TradePatternDiscoveryResult {
  return {
    summary: "Your London-session continuation setups are producing the cleanest edge.",
    sampleSize: 18,
    patterns: [
      {
        title: "London continuation edge",
        category: "timing",
        description: "Continuation setups after the London open are outperforming the rest of your playbook.",
        evidence: "6 of your last 8 London continuation trades closed green.",
        confidence: 0.84,
      },
    ],
    actionItems: ["Size up only when the London continuation checklist is fully met."],
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void

  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}

const RealDate = Date

function freezeDate(isoTimestamp: string) {
  const frozenDate = new RealDate(isoTimestamp)

  class MockDate extends RealDate {
    constructor(value?: string | number | Date) {
      super(value ?? frozenDate)
    }

    static now() {
      return frozenDate.getTime()
    }

    static parse(dateString: string) {
      return RealDate.parse(dateString)
    }

    static UTC(...args: Parameters<DateConstructor["UTC"]>) {
      return RealDate.UTC(...args)
    }
  }

  vi.stubGlobal("Date", MockDate as unknown as DateConstructor)
}

describe("AiPatternDiscoveryCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    freezeDate("2026-05-06T12:00:00.000Z")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("requests pattern mining for the selected range and renders the returned analysis", async () => {
    const user = userEvent.setup()
    const result = createPatternResult()
    const pendingDiscovery = createDeferred<TradePatternDiscoveryResult>()

    discoverTradePatternsMock.mockImplementation(() => pendingDiscovery.promise)

    render(<AiPatternDiscoveryCard rangeLabel="1M" surfaceClassName="surface" />)

    await user.click(screen.getByRole("button", { name: "Discover patterns" }))

    expect(discoverTradePatternsMock).toHaveBeenCalledWith({
      fromDate: "2026-04-06",
      toDate: "2026-05-06",
    })
    expect(screen.getByText("Mining patterns...")).toBeInTheDocument()

    await act(async () => {
      pendingDiscovery.resolve(result)
      await Promise.resolve()
    })

    expect(screen.getByText(result.summary)).toBeInTheDocument()

    expect(screen.getByText("Sample size: 18 closed trades")).toBeInTheDocument()
    expect(screen.getByText("London continuation edge")).toBeInTheDocument()
    expect(screen.getByText("84%")).toBeInTheDocument()
    expect(screen.getByText("Size up only when the London continuation checklist is fully met.")).toBeInTheDocument()
  })

  it("shows an error state when pattern discovery fails", async () => {
    const user = userEvent.setup()

    discoverTradePatternsMock.mockRejectedValue(new Error("Network down"))

    render(<AiPatternDiscoveryCard rangeLabel="All" surfaceClassName="surface" />)

    await user.click(screen.getByRole("button", { name: "Discover patterns" }))

    expect(discoverTradePatternsMock).toHaveBeenCalledWith({ fromDate: null, toDate: null })

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText("Pattern mining is unavailable right now.")).toBeInTheDocument()
  })
})
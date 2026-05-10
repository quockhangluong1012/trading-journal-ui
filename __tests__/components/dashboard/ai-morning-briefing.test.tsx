import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AiMorningBriefing } from "@/components/dashboard/ai-morning-briefing"
import type { MorningBriefingResult } from "@/lib/ai-insights-api"

const getMorningBriefingMock = vi.fn()
const generateMorningBriefingMock = vi.fn()

vi.mock("@/lib/ai-insights-api", () => ({
  getMorningBriefing: (...args: unknown[]) => getMorningBriefingMock(...args),
  generateMorningBriefing: (...args: unknown[]) => generateMorningBriefingMock(...args),
}))

function createMorningBriefingResult(
  overrides: Partial<MorningBriefingResult> = {},
): MorningBriefingResult {
  return {
    greeting: "Good morning, trader.",
    briefing: "Lean on patience around high-impact macro releases before committing risk.",
    focusAreas: ["Wait for clean post-news structure", "Keep risk tight through London open"],
    warnings: ["USD volatility could spike around the next data release."],
    actionItem: "Define invalidation before taking the first trade.",
    overallMood: "cautious",
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

describe("AiMorningBriefing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads and renders the saved briefing on mount", async () => {
    const savedBriefing = createMorningBriefingResult()

    getMorningBriefingMock.mockResolvedValue(savedBriefing)

    render(<AiMorningBriefing />)

    expect(getMorningBriefingMock).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(savedBriefing.briefing)).toBeInTheDocument()
    expect(screen.getByText(savedBriefing.actionItem)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Morning Briefing" })).not.toBeInTheDocument()
  })

  it("generates and renders a briefing when no saved briefing exists", async () => {
    const user = userEvent.setup()
    const generatedBriefing = createMorningBriefingResult({
      briefing: "Respect the first impulse, then wait for confirmation before joining trend continuation.",
    })

    getMorningBriefingMock.mockResolvedValue(null)
    generateMorningBriefingMock.mockResolvedValue(generatedBriefing)

    render(<AiMorningBriefing />)

    await user.click(await screen.findByRole("button", { name: "Morning Briefing" }))

    expect(generateMorningBriefingMock).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(generatedBriefing.briefing)).toBeInTheDocument()
  })

  it("keeps the current briefing visible while a refresh is in progress", async () => {
    const user = userEvent.setup()
    const savedBriefing = createMorningBriefingResult()
    const refreshedBriefing = createMorningBriefingResult({
      briefing: "Hold fire until volatility compresses and risk returns to your planned range.",
      actionItem: "Skip the first impulsive setup if it forms inside event noise.",
    })
    const pendingRefresh = createDeferred<MorningBriefingResult>()

    getMorningBriefingMock.mockResolvedValue(savedBriefing)
    generateMorningBriefingMock.mockImplementation(() => pendingRefresh.promise)

    render(<AiMorningBriefing />)

    expect(await screen.findByText(savedBriefing.briefing)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Refresh" }))

    expect(screen.getByText(savedBriefing.briefing)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Refreshing..." })).toBeDisabled()

    await act(async () => {
      pendingRefresh.resolve(refreshedBriefing)
      await Promise.resolve()
    })

    expect(await screen.findByText(refreshedBriefing.briefing)).toBeInTheDocument()
    expect(screen.getByText(refreshedBriefing.actionItem)).toBeInTheDocument()
  })
})
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AiDisciplineGuardian } from "@/components/trade/create-trade/ai-discipline-guardian"
import type { AiDisciplineGuardianResult } from "@/lib/ai-insights-api"

const generateDisciplineGuardianMock = vi.fn()

vi.mock("@/lib/ai-insights-api", () => ({
  generateDisciplineGuardian: (...args: unknown[]) => generateDisciplineGuardianMock(...args),
}))

function createDisciplineGuardianResult(
  overrides: Partial<AiDisciplineGuardianResult> = {},
): AiDisciplineGuardianResult {
  return {
    riskLevel: "high",
    tiltType: "overtrading",
    title: "Discipline is slipping",
    message: "You are close to breaking your own process if you rush another trade here.",
    actionItems: ["Pause for 30 minutes", "Review your last two executions"],
    shouldNotify: true,
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

describe("AiDisciplineGuardian", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requests discipline guidance and renders the returned warning", async () => {
    const user = userEvent.setup()
    const result = createDisciplineGuardianResult()
    const pendingGuard = createDeferred<AiDisciplineGuardianResult>()

    generateDisciplineGuardianMock.mockImplementation(() => pendingGuard.promise)

    render(<AiDisciplineGuardian />)

    await user.click(screen.getByRole("button", { name: "Check discipline" }))

    expect(generateDisciplineGuardianMock).toHaveBeenCalledWith()
    expect(screen.getByText("Checking...")).toBeInTheDocument()

    await act(async () => {
      pendingGuard.resolve(result)
      await Promise.resolve()
    })

    expect(screen.getByText("high risk")).toBeInTheDocument()
    expect(screen.getByText("overtrading")).toBeInTheDocument()
    expect(screen.getByText(result.title)).toBeInTheDocument()
    expect(screen.getByText("Pause for 30 minutes")).toBeInTheDocument()
  })

  it("shows an error state when the discipline guardian request fails", async () => {
    const user = userEvent.setup()

    generateDisciplineGuardianMock.mockRejectedValue(new Error("Guardian unavailable"))

    render(<AiDisciplineGuardian />)

    await user.click(screen.getByRole("button", { name: "Check discipline" }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText("Guardian unavailable")).toBeInTheDocument()
  })
})
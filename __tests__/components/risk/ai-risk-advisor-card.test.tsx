import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AiRiskAdvisorCard } from "@/components/risk/ai-risk-advisor-card"
import type { AiRiskAdvisorResult } from "@/lib/ai-insights-api"

const generateRiskAdviceMock = vi.fn()

vi.mock("@/lib/ai-insights-api", () => ({
  generateRiskAdvice: (...args: unknown[]) => generateRiskAdviceMock(...args),
}))

function createRiskAdvice(overrides: Partial<AiRiskAdvisorResult> = {}): AiRiskAdvisorResult {
  return {
    riskLevel: "high",
    summary: "Open exposure and drawdown usage are both elevated relative to your guardrails.",
    positionSizingAdvice: "Cut your next position to half size until daily loss usage cools off.",
    keyRisks: ["Three correlated USD positions are live."],
    actionItems: ["Reduce position size", "Avoid adding new correlated trades"],
    shouldReduceRisk: true,
    confidence: 0.86,
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

describe("AiRiskAdvisorCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requests AI risk advice and renders the returned guidance", async () => {
    const user = userEvent.setup()
    const result = createRiskAdvice()
    const pendingAdvice = createDeferred<AiRiskAdvisorResult>()

    generateRiskAdviceMock.mockImplementation(() => pendingAdvice.promise)

    render(<AiRiskAdvisorCard />)

    await user.click(screen.getByRole("button", { name: "Generate AI advice" }))

    expect(generateRiskAdviceMock).toHaveBeenCalledWith()
    expect(screen.getByText("Generating...")).toBeInTheDocument()

    await act(async () => {
      pendingAdvice.resolve(result)
      await Promise.resolve()
    })

    expect(screen.getByText("high risk")).toBeInTheDocument()
    expect(screen.getByText("86% confidence")).toBeInTheDocument()
    expect(screen.getByText(result.summary)).toBeInTheDocument()
    expect(screen.getByText(result.positionSizingAdvice)).toBeInTheDocument()
    expect(screen.getByText("Reduce position size")).toBeInTheDocument()
  })

  it("shows an error state when AI risk advice fails", async () => {
    const user = userEvent.setup()

    generateRiskAdviceMock.mockRejectedValue(new Error("Risk service unavailable"))

    render(<AiRiskAdvisorCard />)

    await user.click(screen.getByRole("button", { name: "Generate AI advice" }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText("Risk service unavailable")).toBeInTheDocument()
  })
})
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AiEconomicImpactCard } from "@/components/dashboard/ai-economic-impact-card"
import type { AiEconomicImpactPredictorResult } from "@/lib/ai-insights-api"

const generateEconomicImpactPredictionMock = vi.fn()

vi.mock("@/lib/ai-insights-api", () => ({
  generateEconomicImpactPrediction: (...args: unknown[]) => generateEconomicImpactPredictionMock(...args),
}))

function createEconomicImpactResult(
  overrides: Partial<AiEconomicImpactPredictorResult> = {},
): AiEconomicImpactPredictorResult {
  return {
    riskLevel: "high",
    summary: "The next high-impact USD release could invalidate near-term EURUSD structure.",
    tradeStance: "Reduce exposure into the release and wait for post-event repricing.",
    keyDrivers: ["USD event is inside your current hold window."],
    actionItems: ["Tighten stops", "Avoid fresh entries before the release"],
    confidence: 0.81,
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

describe("AiEconomicImpactCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requests an impact prediction for the selected symbol and renders the returned analysis", async () => {
    const user = userEvent.setup()
    const result = createEconomicImpactResult()
    const pendingPrediction = createDeferred<AiEconomicImpactPredictorResult>()

    generateEconomicImpactPredictionMock.mockImplementation(() => pendingPrediction.promise)

    render(<AiEconomicImpactCard symbols={["GBPUSD", "EURUSD"]} />)

    await user.click(screen.getByRole("button", { name: "EURUSD" }))
    await user.click(screen.getByRole("button", { name: "Predict impact" }))

    expect(generateEconomicImpactPredictionMock).toHaveBeenCalledWith("EURUSD")
    expect(screen.getByText("Analyzing...")).toBeInTheDocument()

    await act(async () => {
      pendingPrediction.resolve(result)
      await Promise.resolve()
    })

    expect(screen.getByText("high risk")).toBeInTheDocument()
    expect(screen.getByText("81% confidence")).toBeInTheDocument()
    expect(screen.getByText(result.tradeStance)).toBeInTheDocument()
    expect(screen.getByText("Tighten stops")).toBeInTheDocument()
  })

  it("shows a validation message when no symbol is entered", async () => {
    const user = userEvent.setup()

    render(<AiEconomicImpactCard symbols={[]} />)

    const input = screen.getByRole("textbox", { name: "Economic impact symbol" })
    await user.clear(input)
    await user.click(screen.getByRole("button", { name: "Predict impact" }))

    expect(generateEconomicImpactPredictionMock).not.toHaveBeenCalled()
    expect(screen.getByText("Enter an FX symbol like EURUSD to evaluate economic-event impact.")).toBeInTheDocument()
  })
})
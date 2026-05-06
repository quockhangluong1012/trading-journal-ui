import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AiHistorySearchBar } from "@/components/trade/ai-history-search-bar"
import type { NaturalLanguageTradeSearchResult } from "@/lib/ai-insights-api"

const searchTradesNaturalLanguageMock = vi.fn()

vi.mock("@/lib/ai-insights-api", () => ({
  searchTradesNaturalLanguage: (...args: unknown[]) => searchTradesNaturalLanguageMock(...args),
}))

function createSearchResult(overrides: Partial<NaturalLanguageTradeSearchResult> = {}): NaturalLanguageTradeSearchResult {
  return {
    asset: "EURUSD",
    position: "Long",
    status: "Closed",
    fromDate: "2026-05-01",
    toDate: "2026-05-06",
    interpretation: "Closed EURUSD long trades from this month.",
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

describe("AiHistorySearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("submits a natural-language query, shows loading, and applies the returned filters", async () => {
    const user = userEvent.setup()
    const onApplyFilters = vi.fn()
    const result = createSearchResult()
    const pendingSearch = createDeferred<NaturalLanguageTradeSearchResult>()

    searchTradesNaturalLanguageMock.mockImplementation(() => pendingSearch.promise)

    render(<AiHistorySearchBar onApplyFilters={onApplyFilters} />)

    const input = screen.getByRole("textbox", { name: "Natural language trade search" })
    await user.type(input, "Find closed EURUSD longs from last week")
    await user.click(screen.getByRole("button", { name: "Search trades with AI" }))

    expect(searchTradesNaturalLanguageMock).toHaveBeenCalledWith("Find closed EURUSD longs from last week")
    expect(screen.getByRole("button", { name: "Search trades with AI" })).toBeDisabled()
    expect(input).toBeDisabled()
    expect(screen.getByText("Interpreting...")).toBeInTheDocument()

    pendingSearch.resolve(result)

    await waitFor(() => expect(onApplyFilters).toHaveBeenCalledWith(result))

    expect(screen.getByText("Closed EURUSD long trades from this month.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Search trades with AI" })).not.toBeDisabled()
  })

  it("submits on Enter and renders backend errors", async () => {
    const user = userEvent.setup()
    const onApplyFilters = vi.fn()

    searchTradesNaturalLanguageMock.mockRejectedValue(new Error("AI service unavailable"))

    render(<AiHistorySearchBar onApplyFilters={onApplyFilters} />)

    const input = screen.getByRole("textbox", { name: "Natural language trade search" })
    await user.type(input, "show me my recent losses{enter}")

    await waitFor(() => expect(searchTradesNaturalLanguageMock).toHaveBeenCalledWith("show me my recent losses"))

    expect(await screen.findByText("AI service unavailable")).toBeInTheDocument()
    expect(onApplyFilters).not.toHaveBeenCalled()
  })
})
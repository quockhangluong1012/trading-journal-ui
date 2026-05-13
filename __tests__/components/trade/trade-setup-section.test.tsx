import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Trade } from "@/app/types/trade"
import { TradeSetupSection } from "@/components/trade/create-trade/trade-setup-section"
import {
  getInitialTradeFormData,
  type TradeFormData,
} from "@/lib/create-trade-form"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"
import { useTrades } from "@/lib/trade-context"

vi.mock("@/lib/trade-context", () => ({
  useTrades: vi.fn(),
}))

const mockedUseTrades = vi.mocked(useTrades)

function buildTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: overrides.id ?? "trade-1",
    asset: overrides.asset ?? "NQ",
    position: overrides.position ?? PositionType.Long,
    entryPrice: overrides.entryPrice ?? 100,
    targetTier1: overrides.targetTier1 ?? 120,
    targetTier2: overrides.targetTier2 ?? 0,
    targetTier3: overrides.targetTier3 ?? 0,
    stopLoss: overrides.stopLoss ?? 90,
    notes: overrides.notes ?? "",
    date: overrides.date ?? "2026-05-13",
    status: overrides.status ?? TradeStatus.Open,
    ...overrides,
  }
}

function renderTradeSetupSection({ trades = [] }: { trades?: Trade[] } = {}) {
  const handleInputChangeSpy = vi.fn()

  mockedUseTrades.mockReturnValue({ trades } as unknown as ReturnType<typeof useTrades>)

  function Harness() {
    const [formData, setFormData] = useState<TradeFormData>({
      ...getInitialTradeFormData(),
      position: PositionType.Long,
    })

    const handleInputChange = (
      field: keyof Omit<TradeFormData, "position">,
      value: string,
    ) => {
      handleInputChangeSpy(field, value)
      setFormData((current) => ({ ...current, [field]: value }))
    }

    const handlePositionChange = (value: string) => {
      setFormData((current) => ({
        ...current,
        position: Number.parseInt(value, 10) as PositionType,
      }))
    }

    return (
      <TradeSetupSection
        formData={formData}
        errors={{}}
        handleInputChange={handleInputChange}
        handlePositionChange={handlePositionChange}
        setupOptions={[]}
        selectedTradingSetupId=""
        selectedTradingSetup={null}
        surfaceFieldClassName=""
      />
    )
  }

  return {
    user: userEvent.setup(),
    handleInputChangeSpy,
    ...render(<Harness />),
  }
}

describe("TradeSetupSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it("shows recent assets and applies a selected asset", async () => {
    const { user, handleInputChangeSpy } = renderTradeSetupSection({
      trades: [
        buildTrade({ id: "trade-1", asset: "AAPL", date: "2026-05-10" }),
        buildTrade({ id: "trade-2", asset: "NQ", date: "2026-05-12" }),
        buildTrade({ id: "trade-3", asset: "AAPL", date: "2026-05-11" }),
        buildTrade({ id: "trade-4", asset: "MES", date: "2026-05-09" }),
      ],
    })

    await user.click(screen.getByRole("combobox", { name: /asset name/i }))

    const options = screen.getAllByRole("option")
    expect(options.map((option) => option.textContent)).toEqual(["NQ", "AAPL", "MES"])

    await user.click(screen.getByRole("option", { name: "NQ" }))

    expect(handleInputChangeSpy).toHaveBeenLastCalledWith("asset", "NQ")
    expect(screen.getByRole("combobox", { name: /asset name/i })).toHaveTextContent("NQ")
  })

  it("allows entering a custom asset when it is not already listed", async () => {
    const { user, handleInputChangeSpy } = renderTradeSetupSection({
      trades: [
        buildTrade({ id: "trade-1", asset: "NQ" }),
        buildTrade({ id: "trade-2", asset: "MES" }),
      ],
    })

    await user.click(screen.getByRole("combobox", { name: /asset name/i }))
    await user.type(
      screen.getByPlaceholderText("Search recent assets or add a new one"),
      "SPY",
    )

    expect(screen.getByRole("option", { name: /use "SPY"/i })).toBeInTheDocument()

    await user.click(screen.getByRole("option", { name: /use "SPY"/i }))

    expect(handleInputChangeSpy).toHaveBeenLastCalledWith("asset", "SPY")
    expect(screen.getByRole("combobox", { name: /asset name/i })).toHaveTextContent("SPY")
  })

  it("shows empty guidance when no recent assets are available", async () => {
    const { user } = renderTradeSetupSection()

    await user.click(screen.getByRole("combobox", { name: /asset name/i }))

    expect(screen.getByText("No recent assets yet. Type to add one.")).toBeInTheDocument()
  })
})
import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TradeSetupSection } from "@/components/trade/create-trade/trade-setup-section"
import {
  getInitialTradeFormData,
  type TradeFormData,
} from "@/lib/create-trade-form"
import { PositionType } from "@/lib/enum/PositionType"

function renderTradeSetupSection({ assetOptions = [] }: { assetOptions?: string[] } = {}) {
  const handleInputChangeSpy = vi.fn()

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
        assetOptions={assetOptions}
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

  it("shows saved assets and applies a selected asset", async () => {
    const { user, handleInputChangeSpy } = renderTradeSetupSection({
      assetOptions: ["NQ", "AAPL", "MES"],
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
      assetOptions: ["NQ", "MES"],
    })

    await user.click(screen.getByRole("combobox", { name: /asset name/i }))
    await user.type(
      screen.getByPlaceholderText("Search saved assets or add a new one"),
      "SPY",
    )

    expect(screen.getByRole("option", { name: /use "SPY"/i })).toBeInTheDocument()

    await user.click(screen.getByRole("option", { name: /use "SPY"/i }))

    expect(handleInputChangeSpy).toHaveBeenLastCalledWith("asset", "SPY")
    expect(screen.getByRole("combobox", { name: /asset name/i })).toHaveTextContent("SPY")
  })

  it("shows empty guidance when no saved assets are available", async () => {
    const { user } = renderTradeSetupSection()

    await user.click(screen.getByRole("combobox", { name: /asset name/i }))

    expect(screen.getByText("No saved assets yet. Type to add one.")).toBeInTheDocument()
  })
})
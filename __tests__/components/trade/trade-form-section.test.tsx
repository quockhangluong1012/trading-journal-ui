import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TradeFormSection } from "@/components/trade/create-trade/trade-form-section"

describe("TradeFormSection", () => {
  it("renders the heading, accessory, and content", () => {
    render(
      <TradeFormSection
        title="Risk Management"
        description="Keep the trade plan and guardrails obvious."
        icon={<span data-testid="section-icon">icon</span>}
        headerAccessory={<button type="button">Review rules</button>}
      >
        <div>Section body</div>
      </TradeFormSection>,
    )

    expect(screen.getByText("Risk Management")).toBeInTheDocument()
    expect(screen.getByText("Keep the trade plan and guardrails obvious.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Review rules" })).toBeInTheDocument()
    expect(screen.getByText("Section body")).toBeInTheDocument()
    expect(screen.getByTestId("section-icon")).toBeInTheDocument()
  })
})
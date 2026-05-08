import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ReviewTradeJournal } from "@/components/review/review-trade-journal"
import type { ReviewTrade } from "@/lib/review-api"

vi.mock("@/components/ui/safe-html", () => ({
  SafeHtml: ({ html, className }: { html: string; className?: string }) => <div className={className}>{html}</div>,
}))

const trade: ReviewTrade = {
  id: 42,
  asset: "EURUSD",
  position: "Long",
  pnl: 125.5,
  date: "2026-05-07T08:30:00.000Z",
  closedDate: "2026-05-07T10:00:00.000Z",
  entryPrice: 1.0825,
  exitPrice: 1.085,
  confidenceLevel: 4,
  tradingZone: "London Open",
  tradingSetupName: "AI Venom Model",
  isRuleBroken: false,
  ruleBreakReason: null,
  notes: "Followed the model cleanly.",
  emotionTags: ["Focused"],
  technicalThemes: ["Liquidity sweep"],
  checklistItems: ["Waited for displacement"],
}

describe("ReviewTradeJournal", () => {
  it("shows the linked setup in both the collapsed badge row and expanded journal content", async () => {
    const user = userEvent.setup()

    render(<ReviewTradeJournal isLoading={false} trades={[trade]} />)

    expect(screen.getByText("AI Venom Model")).toBeInTheDocument()

    const tradeCard = screen.getByText("EURUSD").closest("button")

    if (!tradeCard) {
      throw new Error("Trade card button not found")
    }

    await user.click(tradeCard)

    expect(screen.getByText("Linked Setup")).toBeInTheDocument()
    expect(screen.getAllByText("AI Venom Model")).toHaveLength(2)
  })
})
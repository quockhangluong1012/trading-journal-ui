import { describe, expect, it } from "vitest"
import { TRADE_PRICE_INPUT_STEP, formatTradePrice } from "@/lib/trade-price-format"

describe("formatTradePrice", () => {
  it("preserves five decimal places when present", () => {
    expect(formatTradePrice(1.78654)).toBe("1.78654")
  })

  it("keeps at least two decimals for whole-number prices", () => {
    expect(formatTradePrice(4200)).toBe("4,200.00")
  })

  it("returns a placeholder for missing prices", () => {
    expect(formatTradePrice(null)).toBe("—")
  })

  it("returns a placeholder for non-finite prices", () => {
    expect(formatTradePrice(Number.NaN)).toBe("—")
    expect(formatTradePrice(Number.POSITIVE_INFINITY)).toBe("—")
  })

  it("uses five-decimal input steps for price fields", () => {
    expect(TRADE_PRICE_INPUT_STEP).toBe("0.00001")
  })
})
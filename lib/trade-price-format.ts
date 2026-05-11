const tradePriceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 5,
})

export const TRADE_PRICE_INPUT_STEP = "0.00001"

export function formatTradePrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—"
  }

  return tradePriceFormatter.format(value)
}
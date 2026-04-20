export type MarketPriceDirection = "up" | "down" | "flat";

export interface MarketPriceState {
  change: number;
  direction: MarketPriceDirection;
}

export function getMarketPriceState(currentPrice: number, previousPrice: number | null): MarketPriceState {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    return { direction: "flat", change: 0 };
  }

  if (previousPrice == null || !Number.isFinite(previousPrice) || previousPrice <= 0) {
    return { direction: "flat", change: 0 };
  }

  const change = currentPrice - previousPrice;

  if (change > 0) {
    return { direction: "up", change };
  }

  if (change < 0) {
    return { direction: "down", change };
  }

  return { direction: "flat", change: 0 };
}
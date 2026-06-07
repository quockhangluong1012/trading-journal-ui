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

// Quote currencies we treat as forex when an asset is a 6-letter pair. JPY-quoted
// pairs price to two decimals (pip = 0.01); every other major prices to four.
const FOREX_QUOTE_CODES = new Set(["AUD", "CAD", "CHF", "CNH", "EUR", "GBP", "JPY", "NZD", "USD"]);

// Explicit tick (minimum price increment) sizes for the instruments this app
// supports. Without this the TP/SL "ticks" readout assumes a 4-decimal FX pip,
// which is wildly wrong for gold (0.01), index futures (0.25), and crypto.
const ASSET_TICK_SIZES: Record<string, number> = {
  XAUUSD: 0.01,
  XAGUSD: 0.001,
  BTCUSD: 0.1,
  BTCUSDT: 0.1,
  ETHUSD: 0.01,
  ETHUSDT: 0.01,
  SOLUSD: 0.01,
  SOLUSDT: 0.01,
  NQ: 0.25,
  MNQ: 0.25,
  ES: 0.25,
  MES: 0.25,
  YM: 1,
  MYM: 1,
  RTY: 0.1,
  M2K: 0.1,
  CL: 0.01,
  GC: 0.1,
  SI: 0.005,
  US30: 1,
  NAS100: 0.25,
  SPX500: 0.25,
  DXY: 0.001,
};

export function normalizeAssetSymbol(asset: string | null | undefined): string {
  if (!asset) {
    return "";
  }

  return asset.trim().toUpperCase().replace(/[\s/]/g, "");
}

// Last-resort tick size for assets we don't recognise: pick an increment that
// keeps the readout meaningful for the price's order of magnitude.
export function getPriceScaleTickSize(price: number | null | undefined): number {
  if (price == null || !Number.isFinite(price) || price <= 0) {
    return 0.0001;
  }

  if (price >= 10000) return 1;
  if (price >= 1000) return 0.1;
  if (price >= 100) return 0.01;
  if (price >= 1) return 0.001;
  return 0.0001;
}

export function getAssetTickSize(asset: string | null | undefined, referencePrice?: number | null): number {
  const normalized = normalizeAssetSymbol(asset);

  if (normalized && ASSET_TICK_SIZES[normalized]) {
    return ASSET_TICK_SIZES[normalized];
  }

  // Forex pairs are 6-letter codes; the quote currency decides the pip scale.
  if (/^[A-Z]{6}$/.test(normalized)) {
    const quote = normalized.slice(3);
    if (FOREX_QUOTE_CODES.has(quote)) {
      return quote === "JPY" ? 0.01 : 0.0001;
    }
  }

  return getPriceScaleTickSize(referencePrice);
}

export function calculateTicks(target: number, price: number, tickSize: number): number {
  if (
    !Number.isFinite(target) ||
    !Number.isFinite(price) ||
    !Number.isFinite(tickSize) ||
    tickSize <= 0
  ) {
    return 0;
  }

  return Math.abs(target - price) / tickSize;
}
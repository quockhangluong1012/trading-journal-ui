import { describe, expect, it } from "vitest"
import { PositionType } from "@/lib/enum/PositionType"
import {
  buildCreateTradeHref,
  buildCreateTradePayload,
  calculateTradeRiskMetrics,
  CREATE_TRADE_SCREENSHOT_MAX_COUNT,
  CREATE_TRADE_SCREENSHOT_MAX_FILE_SIZE_BYTES,
  CREATE_TRADE_SCREENSHOT_MAX_TOTAL_SIZE_BYTES,
  DEFAULT_CREATE_TRADE_RETURN_PATH,
  isAllowedCreateTradeScreenshotDataUrl,
  sanitizeTradeReturnPath,
  type TradeFormData,
  validateCreateTradeScreenshot,
} from "../../lib/create-trade-form"

const createFormData = (overrides: Partial<TradeFormData> = {}): TradeFormData => ({
  asset: "BTCUSD",
  tradingSetupId: "",
  position: PositionType.Long,
  entryPrice: "100",
  targetTier1: "120",
  targetTier2: "",
  targetTier3: "",
  stopLoss: "90",
  notes: "Trade thesis",
  date: "2026-04-19",
  ...overrides,
})

describe("calculateTradeRiskMetrics", () => {
  it("derives reward, risk, and score from the trade form", () => {
    const metrics = calculateTradeRiskMetrics(createFormData())

    expect(metrics).toEqual({
      riskPerUnit: 10,
      rewardPerUnit: 20,
      rrRatio: 2,
      riskPctFromSl: 10,
      riskScore: 100,
    })
  })
})

describe("buildCreateTradePayload", () => {
  it("normalizes user input into the backend payload shape", () => {
    const payload = buildCreateTradePayload({
      formData: createFormData({
        asset: " eth/usd ",
        tradingSetupId: "21",
        position: PositionType.Short,
        entryPrice: "123.45",
        targetTier1: "120",
        targetTier2: "118",
        stopLoss: "126",
        notes: "Mapped from the page",
      }),
      screenshots: [{ url: "data:image/png;base64,abc" }],
      analysisTags: ["3", "invalid", "4"],
      selectedEmotions: ["8"],
      confidenceLevel: 4,
      checkedItems: ["11", "12"],
      tradingSession: "7",
      activeSessionId: "42",
      ictPowerOf3: 1,
      ictDailyBias: 0,
      ictMarketStructure: 1,
      ictPremiumDiscount: 2,
    })

    expect(payload).toMatchObject({
      asset: "ETH/USD",
      position: Number(PositionType.Short),
      entryPrice: 123.45,
      targetTier1: 120,
      targetTier2: 118,
      targetTier3: null,
      stopLoss: 126,
      notes: "Mapped from the page",
      date: new Date("2026-04-19").toISOString(),
      status: 1,
      exitPrice: null,
      pnl: null,
      closedDate: null,
      screenshots: ["data:image/png;base64,abc"],
      tradeTechnicalAnalysisTags: [3, 4],
      emotionTags: [8],
      confidenceLevel: 4,
      tradeHistoryChecklists: [11, 12],
      tradingSetupId: 21,
      tradingZoneId: 7,
      tradingSessionId: 42,
      powerOf3Phase: 1,
      dailyBias: 0,
      marketStructure: 1,
      premiumDiscount: 2,
    })
  })
})

describe("sanitizeTradeReturnPath", () => {
  it("accepts safe internal return paths", () => {
    expect(sanitizeTradeReturnPath("/history?filter=open")).toBe("/history?filter=open")
  })

  it("falls back when the return path is external or malformed", () => {
    expect(sanitizeTradeReturnPath("https://example.com")).toBe(DEFAULT_CREATE_TRADE_RETURN_PATH)
    expect(sanitizeTradeReturnPath("//example.com")).toBe(DEFAULT_CREATE_TRADE_RETURN_PATH)
    expect(sanitizeTradeReturnPath(undefined)).toBe(DEFAULT_CREATE_TRADE_RETURN_PATH)
  })
})

describe("buildCreateTradeHref", () => {
  it("preserves a safe next destination in the create trade route", () => {
    expect(buildCreateTradeHref("/")).toBe("/trade/new?next=%2F")
  })

  it("omits the query string for invalid next destinations", () => {
    expect(buildCreateTradeHref("https://example.com")).toBe("/trade/new")
  })
})

describe("validateCreateTradeScreenshot", () => {
  it("accepts a supported screenshot within the per-trade limits", () => {
    expect(
      validateCreateTradeScreenshot(
        {
          name: "setup.png",
          type: "image/png",
          size: 1024,
        },
        0,
        0,
      ),
    ).toBeNull()
  })

  it("rejects unsupported extensions or mime types", () => {
    expect(
      validateCreateTradeScreenshot(
        {
          name: "setup.svg",
          type: "image/svg+xml",
          size: 1024,
        },
        0,
        0,
      ),
    ).toBe("Only PNG, JPG, and WebP screenshots are supported.")
  })

  it("rejects oversized screenshots and upload totals", () => {
    expect(
      validateCreateTradeScreenshot(
        {
          name: "large.png",
          type: "image/png",
          size: CREATE_TRADE_SCREENSHOT_MAX_FILE_SIZE_BYTES + 1,
        },
        0,
        0,
      ),
    ).toBe("Each screenshot must be 5MB or smaller.")

    expect(
      validateCreateTradeScreenshot(
        {
          name: "setup.png",
          type: "image/png",
          size: 1024,
        },
        CREATE_TRADE_SCREENSHOT_MAX_COUNT,
        0,
      ),
    ).toBe(`You can upload up to ${CREATE_TRADE_SCREENSHOT_MAX_COUNT} screenshots per trade.`)

    expect(
      validateCreateTradeScreenshot(
        {
          name: "setup.png",
          type: "image/png",
          size: 1024,
        },
        1,
        CREATE_TRADE_SCREENSHOT_MAX_TOTAL_SIZE_BYTES,
      ),
    ).toBe("Total screenshot size must stay under 15MB per trade.")
  })
})

describe("isAllowedCreateTradeScreenshotDataUrl", () => {
  it("accepts supported screenshot data urls", () => {
    expect(isAllowedCreateTradeScreenshotDataUrl("data:image/png;base64,abc")).toBe(true)
  })

  it("rejects unsupported data urls", () => {
    expect(isAllowedCreateTradeScreenshotDataUrl("data:image/svg+xml;base64,abc")).toBe(false)
  })
})
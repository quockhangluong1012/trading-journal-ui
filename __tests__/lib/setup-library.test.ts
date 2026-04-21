import { describe, expect, it } from "vitest"

import type { TradingSetupSummaryDto } from "@/lib/setup-api"
import {
  filterSetupsByQuery,
  getVisibleTradingSetups,
  sortSetupsByNewest,
} from "@/lib/setup-library"

function createSetup(overrides: Partial<TradingSetupSummaryDto>): TradingSetupSummaryDto {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Setup",
    description: overrides.description ?? null,
    stepCount: overrides.stepCount ?? 3,
    createdAt: overrides.createdAt ?? "2026-04-21T10:00:00.000Z",
    lastUpdatedAt: overrides.lastUpdatedAt ?? "2026-04-21T10:00:00.000Z",
  }
}

describe("setup library helpers", () => {
  it("sorts setups from newest to oldest", () => {
    const setups = [
      createSetup({ id: 1, name: "Asia range", lastUpdatedAt: "2026-04-19T08:30:00.000Z" }),
      createSetup({ id: 2, name: "London continuation", lastUpdatedAt: "2026-04-21T09:15:00.000Z" }),
      createSetup({ id: 3, name: "NY reversal", lastUpdatedAt: "2026-04-20T16:45:00.000Z" }),
    ]

    expect(sortSetupsByNewest(setups).map((setup) => setup.id)).toEqual([2, 3, 1])
  })

  it("preserves the original order when timestamps match", () => {
    const timestamp = "2026-04-21T09:15:00.000Z"
    const setups = [
      createSetup({ id: 10, name: "First", lastUpdatedAt: timestamp }),
      createSetup({ id: 11, name: "Second", lastUpdatedAt: timestamp }),
      createSetup({ id: 12, name: "Third", lastUpdatedAt: timestamp }),
    ]

    expect(sortSetupsByNewest(setups).map((setup) => setup.id)).toEqual([10, 11, 12])
  })

  it("filters setups by name and description with trimmed case-insensitive queries", () => {
    const setups = [
      createSetup({ id: 1, name: "London open continuation", description: "Momentum after liquidity sweep" }),
      createSetup({ id: 2, name: "Asia range fade", description: "Mean reversion around session extremes" }),
      createSetup({ id: 3, name: "NY breakout", description: null }),
    ]

    expect(filterSetupsByQuery(setups, "  LIQUIDITY  ").map((setup) => setup.id)).toEqual([1])
    expect(filterSetupsByQuery(setups, "asia").map((setup) => setup.id)).toEqual([2])
    expect(filterSetupsByQuery(setups, "").map((setup) => setup.id)).toEqual([1, 2, 3])
  })

  it("returns newest matching setups first", () => {
    const setups = [
      createSetup({ id: 1, name: "London continuation", description: "Trend", lastUpdatedAt: "2026-04-19T08:30:00.000Z" }),
      createSetup({ id: 2, name: "London reversal", description: "Counter trend", lastUpdatedAt: "2026-04-21T09:15:00.000Z" }),
      createSetup({ id: 3, name: "Asia range", description: "Range fade", lastUpdatedAt: "2026-04-20T16:45:00.000Z" }),
    ]

    expect(getVisibleTradingSetups(setups, "london").map((setup) => setup.id)).toEqual([2, 1])
  })
})
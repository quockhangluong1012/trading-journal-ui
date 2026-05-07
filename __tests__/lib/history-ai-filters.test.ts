import { describe, expect, it } from "vitest"
import { mapAiTradeSearchToHistoryFilters } from "@/lib/history-ai-filters"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"

describe("mapAiTradeSearchToHistoryFilters", () => {
  it("maps structured AI filters into history page state", () => {
    expect(
      mapAiTradeSearchToHistoryFilters({
        asset: "EURUSD",
        position: "Long",
        status: "Closed",
        fromDate: "2026-05-01",
        toDate: "2026-05-06",
        interpretation: "Closed EURUSD longs from this month.",
      }),
    ).toEqual({
      searchQuery: "EURUSD",
      positionFilter: PositionType.Long,
      statusFilter: TradeStatus.Closed,
      dateFrom: "2026-05-01",
      dateTo: "2026-05-06",
      page: 1,
    })
  })

  it("falls back to all filters when the AI omits a field", () => {
    expect(
      mapAiTradeSearchToHistoryFilters({
        asset: null,
        position: null,
        status: null,
        fromDate: null,
        toDate: null,
        interpretation: "All trades.",
      }),
    ).toEqual({
      searchQuery: "",
      positionFilter: PositionType.All,
      statusFilter: TradeStatus.All,
      dateFrom: "",
      dateTo: "",
      page: 1,
    })
  })
})
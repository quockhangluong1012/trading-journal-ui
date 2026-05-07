import type { NaturalLanguageTradeSearchResult } from "@/lib/ai-insights-api"
import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"

export interface HistoryAiFilterState {
  searchQuery: string
  positionFilter: PositionType
  statusFilter: TradeStatus
  dateFrom: string
  dateTo: string
  page: number
}

export function mapAiTradeSearchToHistoryFilters(result: NaturalLanguageTradeSearchResult): HistoryAiFilterState {
  return {
    searchQuery: result.asset ?? "",
    positionFilter: mapPosition(result.position),
    statusFilter: mapStatus(result.status),
    dateFrom: result.fromDate ?? "",
    dateTo: result.toDate ?? "",
    page: 1,
  }
}

function mapPosition(position: NaturalLanguageTradeSearchResult["position"]): PositionType {
  switch (position) {
    case "Long":
      return PositionType.Long
    case "Short":
      return PositionType.Short
    default:
      return PositionType.All
  }
}

function mapStatus(status: NaturalLanguageTradeSearchResult["status"]): TradeStatus {
  switch (status) {
    case "Open":
      return TradeStatus.Open
    case "Closed":
      return TradeStatus.Closed
    default:
      return TradeStatus.All
  }
}
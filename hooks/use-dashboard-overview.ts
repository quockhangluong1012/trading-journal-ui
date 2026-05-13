"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { TradeHistory, WinLossData } from "@/app/types/trade"
import type { AssetBreakdown } from "@/lib/analytics-api"
import { api, ApiPaginatedResponse, ApiResponse } from "@/lib/api"
import {
  buildDashboardStats,
  type DashboardBaseStats,
  type DashboardRiskUsage,
  type DashboardStats,
  type ProfitTrajectoryPoint,
} from "@/lib/dashboard-insights"
import { DashboardFilter } from "@/lib/enum/TradeEnum"
import { TradeStatus } from "@/lib/enum/TradeStatus"
import { normalizeRichTextValue } from "@/lib/rich-text"
import { fetchRiskDashboard } from "@/lib/risk-api"

const EMPTY_BASE_STATS: DashboardBaseStats = {
  totalPnL: 0,
  winRate: 0,
  totalTrades: 0,
  openPositions: 0,
}

const EMPTY_STATS: DashboardStats = buildDashboardStats(EMPTY_BASE_STATS, [])
// The backend supports a larger page for the notes cleanup slice so the dashboard
// can show the full action list without pulling unrelated trades.
const MISSING_NOTES_PAGE_SIZE = 1000

interface DashboardOverviewState {
  stats: DashboardStats
  winLossData: WinLossData[]
  profitTrajectory: ProfitTrajectoryPoint[]
  assetBreakdown: AssetBreakdown[]
  openPositions: TradeHistory[]
  tradesMissingNotes: TradeHistory[]
  isLoading: boolean
  isRefreshing: boolean
  lastUpdatedAt: Date | null
  syncWarning: string | null
}

interface DashboardOverviewResult {
  stats: DashboardStats
  winLossData: WinLossData[]
  profitTrajectory: ProfitTrajectoryPoint[]
  assetBreakdown: AssetBreakdown[]
  openPositions: TradeHistory[]
  tradesMissingNotes: TradeHistory[]
  isLoading: boolean
  isRefreshing: boolean
  lastUpdatedAt: Date | null
  syncWarning: string | null
  refresh: () => Promise<void>
}

interface UseDashboardOverviewOptions {
  enabled?: boolean
}

function getFromDateForFilter(filter: DashboardFilter): string | null {
  const now = new Date()

  switch (filter) {
    case DashboardFilter.OneDay:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    case DashboardFilter.OneWeek:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case DashboardFilter.OneMonth:
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString()
    case DashboardFilter.ThreeMonth:
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString()
    case DashboardFilter.All:
    default:
      return null
  }
}

function normalizeStatsResponse(
  responseData: unknown,
): DashboardBaseStats {
  if (isApiResponse<DashboardBaseStats>(responseData)) {
    return responseData.isSuccess ? responseData.value : EMPTY_BASE_STATS
  }

  return responseData as DashboardBaseStats
}

function isApiResponse<T>(responseData: unknown): responseData is ApiResponse<T> {
  return typeof responseData === "object" && responseData !== null && "isSuccess" in responseData && "value" in responseData
}

function hasRiskUsage(value: unknown): value is DashboardRiskUsage {
  return (
    typeof value === "object" &&
    value !== null &&
    "dailyLimitUsedPercent" in value &&
    typeof value.dailyLimitUsedPercent === "number" &&
    "weeklyCapUsedPercent" in value &&
    typeof value.weeklyCapUsedPercent === "number"
  )
}

function buildTradeHistoryQueryString(
  filter: DashboardFilter,
  options: {
    pageSize: number
    status?: TradeStatus
    missingNotesOnly?: boolean
  },
): string {
  const params = new URLSearchParams()
  const fromDate = getFromDateForFilter(filter)

  if (typeof options.status === "number") {
    params.set("status", String(options.status))
  }

  if (options.missingNotesOnly) {
    params.set("missingNotesOnly", "true")
  }

  if (fromDate) {
    params.set("fromDate", fromDate)
  }

  params.set("page", "1")
  params.set("pageSize", String(options.pageSize))

  return params.toString()
}

function getTradesMissingNotes(trades: TradeHistory[]): TradeHistory[] {
  return [...trades]
    .filter((trade) => normalizeRichTextValue(trade.notes) === "")
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
}

export function useDashboardOverview(
  filter: DashboardFilter,
  options: UseDashboardOverviewOptions = {},
): DashboardOverviewResult {
  const { enabled = true } = options
  const requestIdRef = useRef(0)
  const [state, setState] = useState<DashboardOverviewState>({
    stats: EMPTY_STATS,
    winLossData: [],
    profitTrajectory: [],
    assetBreakdown: [],
    openPositions: [],
    tradesMissingNotes: [],
    isLoading: true,
    isRefreshing: false,
    lastUpdatedAt: null,
    syncWarning: null,
  })

  const refresh = useCallback(async () => {
    if (!enabled) {
      return
    }

    requestIdRef.current += 1
    const currentRequestId = requestIdRef.current

    setState((previous) => ({
      ...previous,
      isLoading: previous.lastUpdatedAt === null,
      isRefreshing: previous.lastUpdatedAt !== null,
      syncWarning: null,
    }))

    const openPositionsQueryString = buildTradeHistoryQueryString(filter, {
      pageSize: 10,
      status: TradeStatus.Open,
    })
    const missingNotesQueryString = buildTradeHistoryQueryString(filter, {
      pageSize: MISSING_NOTES_PAGE_SIZE,
      missingNotesOnly: true,
    })

    const totalRequests = 7
    const [statsResult, winLossResult, profitTrajectoryResult, assetBreakdownResult, openPositionsResult, missingNotesResult, riskDashboardResult] =
      await Promise.allSettled([
        api.get<DashboardBaseStats | ApiResponse<DashboardBaseStats>>(`/v1/dashboard/statistics?filter=${filter}`),
        api.get<ApiResponse<WinLossData[]>>(`/v1/dashboard/win-loss-ratio?filter=${filter}`),
        api.get<ApiResponse<ProfitTrajectoryPoint[]>>(`/v1/dashboard/profit-trajectory?filter=${filter}`),
        api.get<ApiResponse<AssetBreakdown[]>>(`/v1/dashboard/asset-breakdown?filter=${filter}`),
        api.get<ApiPaginatedResponse<TradeHistory>>(`/v1/trade-histories?${openPositionsQueryString}`),
        api.get<ApiPaginatedResponse<TradeHistory>>(`/v1/trade-histories?${missingNotesQueryString}`),
        fetchRiskDashboard(),
      ])

    if (currentRequestId !== requestIdRef.current) {
      return
    }

    const failedParts: string[] = []

    setState((previous) => {
      const nextState: DashboardOverviewState = {
        ...previous,
        isLoading: false,
        isRefreshing: false,
      }
      let nextBaseStats: DashboardBaseStats = previous.stats
      const nextRiskUsage: Partial<DashboardRiskUsage> = {
        dailyLimitUsedPercent: previous.stats.dailyLimitUsedPercent,
        weeklyCapUsedPercent: previous.stats.weeklyCapUsedPercent,
      }

      if (statsResult.status === "fulfilled") {
        nextBaseStats = normalizeStatsResponse(statsResult.value.data)
      } else {
        failedParts.push("statistics")
      }

      if (winLossResult.status === "fulfilled" && winLossResult.value.data.isSuccess) {
        nextState.winLossData = winLossResult.value.data.value
      } else if (winLossResult.status === "rejected" || !winLossResult.value.data.isSuccess) {
        failedParts.push("win/loss ratio")
      }

      if (
        profitTrajectoryResult.status === "fulfilled" &&
        profitTrajectoryResult.value.data.isSuccess
      ) {
        nextState.profitTrajectory = profitTrajectoryResult.value.data.value
      } else if (
        profitTrajectoryResult.status === "rejected" ||
        !profitTrajectoryResult.value.data.isSuccess
      ) {
        failedParts.push("profit trajectory")
      }

      if (assetBreakdownResult.status === "fulfilled" && assetBreakdownResult.value.data.isSuccess) {
        nextState.assetBreakdown = assetBreakdownResult.value.data.value
      } else if (
        assetBreakdownResult.status === "rejected" ||
        !assetBreakdownResult.value.data.isSuccess
      ) {
        failedParts.push("asset breakdown")
      }

      if (
        openPositionsResult.status === "fulfilled" &&
        openPositionsResult.value.data.isSuccess
      ) {
        nextState.openPositions = openPositionsResult.value.data.value.values
      } else if (
        openPositionsResult.status === "rejected" ||
        !openPositionsResult.value.data.isSuccess
      ) {
        failedParts.push("open positions")
      }

      if (
        missingNotesResult.status === "fulfilled" &&
        missingNotesResult.value.data.isSuccess
      ) {
        nextState.tradesMissingNotes = getTradesMissingNotes(missingNotesResult.value.data.value.values)
      } else if (
        missingNotesResult.status === "rejected" ||
        !missingNotesResult.value.data.isSuccess
      ) {
        failedParts.push("trade notes coverage")
      }

      if (riskDashboardResult.status === "fulfilled" && hasRiskUsage(riskDashboardResult.value)) {
        nextRiskUsage.dailyLimitUsedPercent = riskDashboardResult.value.dailyLimitUsedPercent
        nextRiskUsage.weeklyCapUsedPercent = riskDashboardResult.value.weeklyCapUsedPercent
      } else {
        failedParts.push("risk dashboard")
      }

      nextState.stats = buildDashboardStats(nextBaseStats, nextState.profitTrajectory, nextRiskUsage)

      nextState.syncWarning =
        failedParts.length > 0
          ? `Some dashboard data could not be refreshed: ${failedParts.join(", ")}.`
          : null
      nextState.lastUpdatedAt = failedParts.length === totalRequests ? previous.lastUpdatedAt : new Date()

      return nextState
    })
  }, [enabled, filter])

  useEffect(() => {
    if (!enabled) {
      return
    }

    void refresh()
  }, [enabled, refresh])

  return {
    stats: state.stats,
    winLossData: state.winLossData,
    profitTrajectory: state.profitTrajectory,
    assetBreakdown: state.assetBreakdown,
    openPositions: state.openPositions,
    tradesMissingNotes: state.tradesMissingNotes,
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    lastUpdatedAt: state.lastUpdatedAt,
    syncWarning: state.syncWarning,
    refresh,
  }
}
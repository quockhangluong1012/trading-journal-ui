"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { TradeHistory, WinLossData } from "@/app/types/trade"
import { api, ApiPaginatedResponse, ApiResponse } from "@/lib/api"
import { DashboardStats, ProfitTrajectoryPoint } from "@/lib/dashboard-insights"
import { DashboardFilter } from "@/lib/enum/TradeEnum"
import { TradeStatus } from "@/lib/enum/TradeStatus"

const EMPTY_STATS: DashboardStats = {
  totalPnL: 0,
  winRate: 0,
  totalTrades: 0,
  openPositions: 0,
}

interface DashboardOverviewState {
  stats: DashboardStats
  winLossData: WinLossData[]
  profitTrajectory: ProfitTrajectoryPoint[]
  openPositions: TradeHistory[]
  isLoading: boolean
  isRefreshing: boolean
  lastUpdatedAt: Date | null
  syncWarning: string | null
}

interface DashboardOverviewResult {
  stats: DashboardStats
  winLossData: WinLossData[]
  profitTrajectory: ProfitTrajectoryPoint[]
  openPositions: TradeHistory[]
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
  responseData: DashboardStats | ApiResponse<DashboardStats>,
): DashboardStats {
  if (typeof responseData === "object" && responseData !== null && "isSuccess" in responseData) {
    return responseData.isSuccess ? responseData.value : EMPTY_STATS
  }

  return responseData
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
    openPositions: [],
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

    const fromDate = getFromDateForFilter(filter)
    const openPosParams = new URLSearchParams()
    openPosParams.set("status", String(TradeStatus.Open))
    if (fromDate) openPosParams.set("fromDate", fromDate)
    openPosParams.set("page", "1")
    openPosParams.set("pageSize", "10")

    const [statsResult, winLossResult, profitTrajectoryResult, openPositionsResult] =
      await Promise.allSettled([
        api.get<DashboardStats | ApiResponse<DashboardStats>>(`/v1/dashboard/statistics?filter=${filter}`),
        api.get<ApiResponse<WinLossData[]>>(`/v1/dashboard/win-loss-ratio?filter=${filter}`),
        api.get<ApiResponse<ProfitTrajectoryPoint[]>>(`/v1/dashboard/profit-trajectory?filter=${filter}`),
        api.get<ApiPaginatedResponse<TradeHistory>>(`/v1/trade-histories?${openPosParams.toString()}`),
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

      if (statsResult.status === "fulfilled") {
        nextState.stats = normalizeStatsResponse(statsResult.value.data)
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

      nextState.syncWarning =
        failedParts.length > 0
          ? `Some dashboard data could not be refreshed: ${failedParts.join(", ")}.`
          : null
      nextState.lastUpdatedAt = failedParts.length === 4 ? previous.lastUpdatedAt : new Date()

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
    openPositions: state.openPositions,
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    lastUpdatedAt: state.lastUpdatedAt,
    syncWarning: state.syncWarning,
    refresh,
  }
}
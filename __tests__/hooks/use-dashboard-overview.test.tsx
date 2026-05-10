import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useDashboardOverview } from "@/hooks/use-dashboard-overview"
import { DashboardFilter } from "@/lib/enum/TradeEnum"

const apiGetMock = vi.fn()

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}))

describe("useDashboardOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("enriches dashboard stats with expectancy, profit factor, and daily limit usage", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/v1/dashboard/statistics?filter=2") {
        return Promise.resolve({
          data: {
            totalPnL: 200,
            winRate: 66.7,
            totalTrades: 3,
            openPositions: 1,
          },
        })
      }

      if (url === "/v1/dashboard/win-loss-ratio?filter=2") {
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: [],
          },
        })
      }

      if (url === "/v1/dashboard/profit-trajectory?filter=2") {
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: [
              { date: "2026-04-14T13:00:00.000Z", pnL: 100 },
              { date: "2026-04-15T13:00:00.000Z", pnL: -50 },
              { date: "2026-04-16T13:00:00.000Z", pnL: 150 },
            ],
          },
        })
      }

      if (url === "/v1/dashboard/asset-breakdown?filter=2") {
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: [],
          },
        })
      }

      if (url.startsWith("/v1/trade-histories?")) {
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: {
              values: [],
            },
          },
        })
      }

      if (url === "/v1/risk/dashboard") {
        return Promise.resolve({
          data: {
            value: {
              accountBalance: 10000,
              dailyLossLimitPercent: 2,
              weeklyDrawdownCapPercent: 5,
              maxOpenPositions: 3,
              dailyPnl: -120,
              dailyPnlPercent: -1.2,
              weeklyPnl: 340,
              weeklyPnlPercent: 3.4,
              todayTradeCount: 2,
              openPositionCount: 1,
              weekTradeCount: 6,
              todayWins: 1,
              todayLosses: 1,
              dailyLimitUsedPercent: 48,
              weeklyCapUsedPercent: 62,
              isDailyLimitBreached: false,
              isWeeklyCapBreached: false,
              alerts: [],
            },
          },
        })
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const { result } = renderHook(() => useDashboardOverview(DashboardFilter.OneMonth))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stats).toMatchObject({
      totalPnL: 200,
      winRate: 66.7,
      totalTrades: 3,
      openPositions: 1,
      expectancy: 66.67,
      profitFactor: 5,
      dailyLimitUsedPercent: 48,
      weeklyCapUsedPercent: 62,
    })

    expect(apiGetMock).toHaveBeenCalledWith("/v1/risk/dashboard")
  })

  it("falls back to zero risk usage and reports a sync warning when the risk dashboard fails", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/v1/dashboard/statistics?filter=2") {
        return Promise.resolve({
          data: {
            totalPnL: 200,
            winRate: 66.7,
            totalTrades: 3,
            openPositions: 1,
          },
        })
      }

      if (url === "/v1/dashboard/win-loss-ratio?filter=2") {
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: [],
          },
        })
      }

      if (url === "/v1/dashboard/profit-trajectory?filter=2") {
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: [
              { date: "2026-04-14T13:00:00.000Z", pnL: 100 },
              { date: "2026-04-15T13:00:00.000Z", pnL: -50 },
            ],
          },
        })
      }

      if (url === "/v1/dashboard/asset-breakdown?filter=2") {
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: [],
          },
        })
      }

      if (url.startsWith("/v1/trade-histories?")) {
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: {
              values: [],
            },
          },
        })
      }

      if (url === "/v1/risk/dashboard") {
        return Promise.reject(new Error("risk service unavailable"))
      }

      throw new Error(`Unexpected URL: ${url}`)
    })

    const { result } = renderHook(() => useDashboardOverview(DashboardFilter.OneMonth))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stats.dailyLimitUsedPercent).toBe(0)
    expect(result.current.stats.weeklyCapUsedPercent).toBe(0)
    expect(result.current.syncWarning).toContain("risk dashboard")
  })
})
"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { attachToken } from "@/lib/api"
import {
  getTradingSetupDetail,
  getTradingSetups,
  type TradingSetupDetailDto,
  type TradingSetupSummaryDto,
} from "@/lib/setup-api"

function getMillisecondsUntilNextLocalMidnight(now: Date): number {
  const nextMidnight = new Date(now)
  nextMidnight.setHours(24, 0, 0, 0)

  return Math.max(nextMidnight.getTime() - now.getTime(), 1)
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function findTodayCreatedSetup(
  setups: TradingSetupSummaryDto[],
  referenceDate: Date,
): TradingSetupSummaryDto | null {
  const todaySetups = setups
    .filter((setup) => isSameLocalDay(new Date(setup.createdAt), referenceDate))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  return todaySetups[0] ?? null
}

interface UseTodaySetupResult {
  setup: TradingSetupDetailDto | null
  isLoading: boolean
  refresh: () => Promise<void>
}

export function useTodaySetup(userKey?: string | null): UseTodaySetupResult {
  const normalizedUserKey = userKey?.trim().toLowerCase() || null
  const [setup, setSetup] = useState<TradingSetupDetailDto | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const requestSequenceRef = useRef(0)

  const refresh = useCallback(async () => {
    const sequence = ++requestSequenceRef.current

    if (!normalizedUserKey) {
      setSetup(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      attachToken()

      const setupsResponse = await getTradingSetups()

      if (!setupsResponse.data.isSuccess) {
        if (sequence === requestSequenceRef.current) {
          setSetup(null)
        }
        return
      }

      const todaySetupSummary = findTodayCreatedSetup(setupsResponse.data.value, new Date())

      if (!todaySetupSummary) {
        if (sequence === requestSequenceRef.current) {
          setSetup(null)
        }
        return
      }

      const setupDetailResponse = await getTradingSetupDetail(todaySetupSummary.id)

      if (sequence !== requestSequenceRef.current) {
        return
      }

      setSetup(setupDetailResponse.data.isSuccess ? setupDetailResponse.data.value : null)
    } catch {
      if (sequence === requestSequenceRef.current) {
        setSetup(null)
      }
    } finally {
      if (sequence === requestSequenceRef.current) {
        setIsLoading(false)
      }
    }
  }, [normalizedUserKey])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window === "undefined" || !normalizedUserKey) {
      return
    }

    const handleFocus = () => {
      void refresh()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refresh()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [normalizedUserKey, refresh])

  useEffect(() => {
    if (typeof window === "undefined" || !normalizedUserKey) {
      return
    }

    let timeoutId: number | undefined

    const scheduleMidnightRefresh = () => {
      timeoutId = window.setTimeout(() => {
        void refresh()
        scheduleMidnightRefresh()
      }, getMillisecondsUntilNextLocalMidnight(new Date()))
    }

    scheduleMidnightRefresh()

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [normalizedUserKey, refresh])

  return {
    setup,
    isLoading,
    refresh,
  }
}
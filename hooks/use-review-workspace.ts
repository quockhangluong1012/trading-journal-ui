"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import {
  ReviewPeriodType,
  fetchReview,
  fetchReviewSummaryStatus,
  fetchReviewTrades,
  generateReviewSummary,
  getPeriodBounds,
  saveReview,
  toISODateString,
  type ReviewData,
  type ReviewTrade,
} from "@/lib/review-api"

interface ReviewWorkspaceState {
  review: ReviewData | null
  trades: ReviewTrade[]
  notes: string
  isLoading: boolean
  isRefreshing: boolean
  isSaving: boolean
  syncWarning: string | null
  lastUpdatedAt: Date | null
}

interface RefreshOptions {
  silent?: boolean
}

const AUTO_SAVE_DEBOUNCE_MS = 1200
const SUMMARY_POLL_INTERVAL_MS = 3000

export interface UseReviewWorkspaceResult {
  bounds: { start: Date; end: Date }
  currentDate: Date
  isGeneratingSummary: boolean
  isLoading: boolean
  isRefreshing: boolean
  isSaving: boolean
  lastUpdatedAt: Date | null
  notes: string
  periodEnd: string
  periodStart: string
  review: ReviewData | null
  syncWarning: string | null
  trades: ReviewTrade[]
  generateSummary: () => Promise<void>
  handleNotesChange: (value: string) => void
  refresh: (options?: RefreshOptions) => Promise<void>
  saveNotesNow: () => Promise<void>
  setCurrentDate: (value: Date) => void
}

export function useReviewWorkspace(periodType: ReviewPeriodType): UseReviewWorkspaceResult {
  const { toast } = useToast()
  const mountedRef = useRef(true)
  const periodKeyRef = useRef("")
  const requestIdRef = useRef(0)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadedPeriodKeyRef = useRef("")
  const notesDirtyRef = useRef(false)

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [state, setState] = useState<ReviewWorkspaceState>({
    review: null,
    trades: [],
    notes: "",
    isLoading: true,
    isRefreshing: false,
    isSaving: false,
    syncWarning: null,
    lastUpdatedAt: null,
  })

  const bounds = useMemo(() => getPeriodBounds(periodType, currentDate), [currentDate, periodType])
  const periodStart = useMemo(() => toISODateString(bounds.start), [bounds.start])
  const periodEnd = useMemo(() => toISODateString(bounds.end), [bounds.end])
  const periodKey = `${periodType}:${periodStart}`

  useEffect(() => {
    periodKeyRef.current = periodKey
  }, [periodKey])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const clearPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
  }, [])

  const refresh = useCallback(
    async (options: RefreshOptions = {}) => {
      requestIdRef.current += 1
      const currentRequestId = requestIdRef.current
      const isPeriodSwitch = loadedPeriodKeyRef.current !== periodKey
      const targetPeriodKey = periodKey

      setState((previous) => ({
        ...previous,
        isLoading: !options.silent && (previous.lastUpdatedAt === null || isPeriodSwitch),
        isRefreshing: options.silent || (previous.lastUpdatedAt !== null && !isPeriodSwitch),
        isSaving: isPeriodSwitch ? false : previous.isSaving,
        syncWarning: null,
        ...(isPeriodSwitch
          ? {
              review: null,
              trades: [],
            }
          : {}),
      }))

      const [reviewResult, tradesResult] = await Promise.allSettled([
        fetchReview(periodType, periodStart),
        fetchReviewTrades(periodStart, periodEnd),
      ])

      if (
        !mountedRef.current ||
        currentRequestId !== requestIdRef.current ||
        targetPeriodKey !== periodKeyRef.current
      ) {
        return
      }

      setState((previous) => {
        const failedParts: string[] = []
        const nextState: ReviewWorkspaceState = {
          ...previous,
          isLoading: false,
          isRefreshing: false,
        }

        if (reviewResult.status === "fulfilled") {
          nextState.review = reviewResult.value

          if (loadedPeriodKeyRef.current !== periodKey || !notesDirtyRef.current) {
            nextState.notes = reviewResult.value.userNotes ?? ""
            notesDirtyRef.current = false
          }
        } else {
          failedParts.push("review snapshot")
        }

        if (tradesResult.status === "fulfilled") {
          nextState.trades = tradesResult.value.values
        } else {
          failedParts.push("closed trades")
        }

        nextState.syncWarning =
          failedParts.length > 0
            ? `Some review data could not be refreshed: ${failedParts.join(", ")}.`
            : null
        nextState.lastUpdatedAt = failedParts.length === 2 ? previous.lastUpdatedAt : new Date()

        return nextState
      })

      loadedPeriodKeyRef.current = targetPeriodKey
    },
    [periodEnd, periodKey, periodStart, periodType],
  )

  const persistNotes = useCallback(
    async (
      value: string,
      targetPeriod: {
        periodEnd: string
        periodKey: string
        periodStart: string
        periodType: ReviewPeriodType
      },
    ) => {
      if (targetPeriod.periodKey === periodKeyRef.current) {
        setState((previous) => ({
          ...previous,
          isSaving: true,
        }))
      }

      try {
        await saveReview({
          periodType: targetPeriod.periodType,
          periodStart: targetPeriod.periodStart,
          periodEnd: targetPeriod.periodEnd,
          userNotes: value,
        })

        if (!mountedRef.current || targetPeriod.periodKey !== periodKeyRef.current) {
          return
        }

        notesDirtyRef.current = false

        setState((previous) => ({
          ...previous,
          isSaving: false,
          review: previous.review
            ? {
                ...previous.review,
                userNotes: value,
              }
            : previous.review,
        }))
      } catch {
        if (!mountedRef.current || targetPeriod.periodKey !== periodKeyRef.current) {
          return
        }

        setState((previous) => ({
          ...previous,
          isSaving: false,
          syncWarning: "Review notes could not be saved.",
        }))

        toast({
          title: "Could not save review notes",
          description: "The latest note draft is still on screen, but it was not persisted yet.",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const saveNotesNow = useCallback(async () => {
    clearPendingSave()
    await persistNotes(state.notes, {
      periodEnd,
      periodKey,
      periodStart,
      periodType,
    })
  }, [clearPendingSave, periodEnd, periodKey, periodStart, periodType, persistNotes, state.notes])

  const handleNotesChange = useCallback(
    (value: string) => {
      notesDirtyRef.current = true

      setState((previous) => ({
        ...previous,
        notes: value,
      }))

      clearPendingSave()
      const targetPeriod = {
        periodEnd,
        periodKey,
        periodStart,
        periodType,
      }

      saveTimeoutRef.current = setTimeout(() => {
        void persistNotes(value, targetPeriod)
      }, AUTO_SAVE_DEBOUNCE_MS)
    },
    [clearPendingSave, periodEnd, periodKey, periodStart, periodType, persistNotes],
  )

  const generateSummary = useCallback(async () => {
    const targetPeriod = {
      periodEnd,
      periodKey,
      periodStart,
      periodType,
    }

    setState((previous) => ({
      ...previous,
      review: previous.review
        ? {
            ...previous.review,
            aiSummaryGenerating: true,
          }
        : previous.review,
      syncWarning: null,
    }))

    try {
      await generateReviewSummary({
        periodType: targetPeriod.periodType,
        periodStart: targetPeriod.periodStart,
        periodEnd: targetPeriod.periodEnd,
      })
    } catch {
      if (!mountedRef.current || targetPeriod.periodKey !== periodKeyRef.current) {
        return
      }

      setState((previous) => ({
        ...previous,
        review: previous.review
          ? {
              ...previous.review,
              aiSummaryGenerating: false,
            }
          : previous.review,
        syncWarning: "AI review summary could not be started.",
      }))

      toast({
        title: "Could not start AI review",
        description: "Try again in a moment after the current review data finishes syncing.",
        variant: "destructive",
      })
    }
  }, [periodEnd, periodKey, periodStart, periodType, toast])

  const pollSummaryStatus = useCallback(() => {
    stopPolling()
    const pollingPeriodKey = periodKey

    pollingRef.current = setInterval(async () => {
      if (!mountedRef.current || pollingPeriodKey !== periodKeyRef.current) {
        stopPolling()
        return
      }

      try {
        const status = await fetchReviewSummaryStatus(periodType, periodStart)

        if (!mountedRef.current || pollingPeriodKey !== periodKeyRef.current) {
          return
        }

        if (!status.isGenerating) {
          stopPolling()
          await refresh({ silent: true })
          return
        }

        setState((previous) => ({
          ...previous,
          review: previous.review
            ? {
                ...previous.review,
                aiSummaryGenerating: true,
              }
            : previous.review,
        }))
      } catch {
        if (!mountedRef.current || pollingPeriodKey !== periodKeyRef.current) {
          return
        }

        stopPolling()

        setState((previous) => ({
          ...previous,
          review: previous.review
            ? {
                ...previous.review,
                aiSummaryGenerating: false,
              }
            : previous.review,
          syncWarning: "The AI summary is still processing, but live polling could not be refreshed.",
        }))
      }
    }, SUMMARY_POLL_INTERVAL_MS)
  }, [periodKey, periodStart, periodType, refresh, stopPolling])

  useEffect(() => {
    clearPendingSave()
    stopPolling()
    void refresh()

    return () => {
      clearPendingSave()
      stopPolling()
    }
  }, [clearPendingSave, periodKey, refresh, stopPolling])

  useEffect(() => {
    if (!state.review?.aiSummaryGenerating) {
      stopPolling()
      return
    }

    pollSummaryStatus()

    return stopPolling
  }, [pollSummaryStatus, state.review?.aiSummaryGenerating, stopPolling])

  return {
    bounds,
    currentDate,
    isGeneratingSummary: Boolean(state.review?.aiSummaryGenerating),
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    isSaving: state.isSaving,
    lastUpdatedAt: state.lastUpdatedAt,
    notes: state.notes,
    periodEnd,
    periodStart,
    review: state.review,
    syncWarning: state.syncWarning,
    trades: state.trades,
    generateSummary,
    handleNotesChange,
    refresh,
    saveNotesNow,
    setCurrentDate,
  }
}
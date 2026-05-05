"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { attachToken } from "@/lib/api"
import {
  getDailyNote,
  upsertDailyNote,
  type DailyNoteDto,
  type UpsertDailyNoteRequest,
} from "@/lib/daily-notes-api"

const DAILY_NOTES_SEEN_KEY = "trading-journey-daily-notes-last-seen"

function getTodayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function hasSeenToday(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(DAILY_NOTES_SEEN_KEY) === getTodayDateString()
  } catch {
    return true
  }
}

function markSeenToday(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(DAILY_NOTES_SEEN_KEY, getTodayDateString())
  } catch {
    // Ignore storage errors
  }
}

interface UseDailyNotesResult {
  /** Today's note from the server (null if none exists yet). */
  note: DailyNoteDto | null
  /** Whether the initial fetch is in-flight. */
  isLoading: boolean
  /** Whether a save is in-flight. */
  isSaving: boolean
  /** Whether the auto-popup should be shown (first visit of day). */
  shouldShowPopup: boolean
  /** Dismiss the auto-popup and mark as seen for the day. */
  dismissPopup: () => void
  /** Save (create or update) the daily note. Returns the saved note. */
  save: (data: UpsertDailyNoteRequest) => Promise<DailyNoteDto | null>
  /** Refresh the note from the server. */
  refresh: () => Promise<void>
}

export function useDailyNotes(userKey?: string | null): UseDailyNotesResult {
  const normalizedUserKey = userKey?.trim().toLowerCase() || null
  const [note, setNote] = useState<DailyNoteDto | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [shouldShowPopup, setShouldShowPopup] = useState(false)
  const requestSequenceRef = useRef(0)

  const refresh = useCallback(async () => {
    const sequence = ++requestSequenceRef.current

    if (!normalizedUserKey) {
      setNote(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      attachToken()
      const today = getTodayDateString()
      const response = await getDailyNote(today)

      if (sequence !== requestSequenceRef.current) return

      if (response.data.isSuccess) {
        const fetchedNote = response.data.value
        setNote(fetchedNote)

        // Show popup only if it's the first visit today AND no note exists yet
        if (!hasSeenToday() && !fetchedNote) {
          setShouldShowPopup(true)
        }
      } else {
        setNote(null)
        if (!hasSeenToday()) {
          setShouldShowPopup(true)
        }
      }
    } catch {
      if (sequence === requestSequenceRef.current) {
        setNote(null)
      }
    } finally {
      if (sequence === requestSequenceRef.current) {
        setIsLoading(false)
      }
    }
  }, [normalizedUserKey])

  const dismissPopup = useCallback(() => {
    setShouldShowPopup(false)
    markSeenToday()
  }, [])

  const save = useCallback(
    async (data: UpsertDailyNoteRequest): Promise<DailyNoteDto | null> => {
      setIsSaving(true)
      try {
        attachToken()
        const response = await upsertDailyNote(data)
        if (response.data.isSuccess) {
          setNote(response.data.value)
          markSeenToday()
          setShouldShowPopup(false)
          return response.data.value
        }
        return null
      } catch {
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [],
  )

  // Initial fetch
  useEffect(() => {
    void refresh()
  }, [refresh])

  // Refresh on tab focus / visibility change
  useEffect(() => {
    if (typeof window === "undefined" || !normalizedUserKey) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refresh()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [normalizedUserKey, refresh])

  // Schedule midnight refresh to reset popup logic
  useEffect(() => {
    if (typeof window === "undefined" || !normalizedUserKey) return

    let timeoutId: number | undefined

    const scheduleMidnightRefresh = () => {
      const now = new Date()
      const nextMidnight = new Date(now)
      nextMidnight.setHours(24, 0, 0, 0)
      const ms = Math.max(nextMidnight.getTime() - now.getTime(), 1)

      timeoutId = window.setTimeout(() => {
        void refresh()
        scheduleMidnightRefresh()
      }, ms)
    }

    scheduleMidnightRefresh()

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [normalizedUserKey, refresh])

  return {
    note,
    isLoading,
    isSaving,
    shouldShowPopup,
    dismissPopup,
    save,
    refresh,
  }
}

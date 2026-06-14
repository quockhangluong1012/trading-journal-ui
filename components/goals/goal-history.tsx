"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRight, CheckCircle2, Clock, ExternalLink, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  GOAL_ACTIVITY_SOURCE_LABELS,
  GOAL_METRIC_SOURCE_LABELS,
  GoalItemType,
} from "@/lib/enum/GoalEnums"
import { goalActivitySourceHref } from "@/lib/goals-overview"
import {
  fetchGoalActivityHistory,
  fetchGoalProgressHistory,
  type GoalActivityView,
  type ProgressEntryView,
} from "@/lib/goals-api"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"

/** Mirrors GetGoalDetail.HistoryPreviewLimit — the detail preview slice size. */
const PREVIEW_LIMIT = 25
const PAGE_SIZE = 50

const ITEM_TYPE_LABEL: Record<GoalItemType, string> = {
  [GoalItemType.Goal]: "Goal",
  [GoalItemType.Milestone]: "Milestone",
  [GoalItemType.Task]: "Task",
}

function timestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Drives "view all" pagination for one history list. Starts from the detail
 * preview; the first "load more" replaces it with page 1 (a superset), then
 * appends subsequent pages.
 */
function usePagedHistory<T extends { id: number }>(
  preview: T[],
  loadPage: (page: number, pageSize: number) => Promise<{ values: T[]; hasMore: boolean }>,
) {
  const [loaded, setLoaded] = useState<T[]>([])
  const [page, setPage] = useState(0) // 0 = still showing the live preview prop
  const [loadedHasMore, setLoadedHasMore] = useState(false)
  const [loading, setLoading] = useState(false)

  // In preview mode read straight from props so progress updates stay live; once
  // the user paginates we own the accumulated list.
  const items = page === 0 ? preview : loaded
  const hasMore = page === 0 ? preview.length >= PREVIEW_LIMIT : loadedHasMore

  const loadMore = async () => {
    setLoading(true)
    try {
      const nextPage = page === 0 ? 1 : page + 1
      const result = await loadPage(nextPage, PAGE_SIZE)
      setLoaded((prev) => (nextPage === 1 ? result.values : [...prev, ...result.values]))
      setLoadedHasMore(result.hasMore)
      setPage(nextPage)
    } catch {
      toast.error("Failed to load more history.")
    } finally {
      setLoading(false)
    }
  }

  return { items, hasMore, loading, loadMore }
}

export function GoalHistory({
  goalId,
  progress,
  activity,
}: {
  goalId: number
  progress: ProgressEntryView[]
  activity: GoalActivityView[]
}) {
  const progressLog = usePagedHistory(progress, (page, pageSize) =>
    fetchGoalProgressHistory(goalId, page, pageSize),
  )
  const activityLog = usePagedHistory(activity, (page, pageSize) =>
    fetchGoalActivityHistory(goalId, page, pageSize),
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className={SC}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" /> Progress log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progressLog.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No manual updates yet.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {progressLog.items.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5">
                      {entry.currentIsCompleted && !entry.previousIsCompleted
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        : <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground">
                        <span className="text-muted-foreground">{ITEM_TYPE_LABEL[entry.itemType]}:</span>{" "}
                        {entry.previousValue != null || entry.currentValue != null
                          ? <>{entry.previousValue ?? "—"} <ArrowRight className="inline h-3 w-3" /> {entry.currentValue ?? "—"}</>
                          : entry.currentIsCompleted ? "Marked complete" : "Marked incomplete"}
                      </p>
                      {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                      <p className="text-[11px] text-muted-foreground/70">{timestamp(entry.recordedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {progressLog.hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void progressLog.loadMore()}
                  disabled={progressLog.loading}
                >
                  {progressLog.loading ? "Loading..." : "View more"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className={SC}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" /> Auto-tracked activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLog.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No automatic activity recorded yet.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {activityLog.items.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5">
                      {entry.completedItem
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        : <Zap className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground">
                        {GOAL_METRIC_SOURCE_LABELS[entry.metricSource]}{" "}
                        <span className={entry.delta >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {entry.delta >= 0 ? "+" : ""}{entry.delta.toLocaleString()}
                        </span>
                      </p>
                      {(() => {
                        const href = goalActivitySourceHref(entry.sourceType, entry.sourceId)
                        const label = `${GOAL_ACTIVITY_SOURCE_LABELS[entry.sourceType]} #${entry.sourceId}`
                        return href ? (
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            from {label} <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">from {label}</p>
                        )
                      })()}
                      <p className="text-[11px] text-muted-foreground/70">{timestamp(entry.recordedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {activityLog.hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void activityLog.loadMore()}
                  disabled={activityLog.loading}
                >
                  {activityLog.loading ? "Loading..." : "View more"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { ChevronRight, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrackingProgress } from "@/components/goals/tracking-progress"
import { useGoalsStore } from "@/lib/stores/use-goals-store"
import {
  GOAL_STATUS_META,
  clampPercent,
  getGoalStatus,
  rollupOverridePercent,
} from "@/lib/goals-overview"
import { cn } from "@/lib/utils"

/** How many active goals to surface on the dashboard before "View all". */
const MAX_GOALS = 4

/** Compact "active goals + progress" snapshot for the dashboard. */
export function GoalsOverviewWidget() {
  const goals = useGoalsStore((s) => s.goals)
  const stats = useGoalsStore((s) => s.stats)
  const isLoadingList = useGoalsStore((s) => s.isLoadingList)
  const loadGoals = useGoalsStore((s) => s.loadGoals)
  const loadStats = useGoalsStore((s) => s.loadStats)

  useEffect(() => {
    void loadGoals(false)
    void loadStats()
  }, [loadGoals, loadStats])

  // Stable "now" so statuses don't recompute every render; refreshes with goals.
  const referenceDate = useMemo(() => new Date(), [goals])

  // Surface the goals nearest to done first — they're the most actionable.
  const active = useMemo(
    () =>
      goals
        .filter((g) => !g.tracking.isCompleted)
        .sort((a, b) => b.rollupProgressPercent - a.rollupProgressPercent)
        .slice(0, MAX_GOALS),
    [goals],
  )

  const activeCount = stats?.activeCount ?? goals.filter((g) => !g.tracking.isCompleted).length
  const avgProgress = stats ? clampPercent(stats.averageProgressPercent) : 0

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Target className="h-4 w-4 text-primary" />
          Goals
        </CardTitle>
        <Link
          href="/goals"
          className="flex items-center gap-0.5 text-[11px] text-primary hover:underline"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{activeCount}</p>
            <p className="text-[11px] text-muted-foreground">Active</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{avgProgress}%</p>
            <p className="text-[11px] text-muted-foreground">Avg progress</p>
          </div>
        </div>

        {isLoadingList && goals.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/40 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">No active goals yet.</p>
            <Link href="/goals" className="text-xs text-primary hover:underline">
              Set your first goal
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {active.map((goal) => {
              const meta = GOAL_STATUS_META[getGoalStatus(goal, referenceDate)]
              return (
                <li key={goal.id}>
                  <Link href={`/goals/${goal.id}`} className="group block space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                        {goal.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0 text-[9px] font-semibold",
                          meta.tone,
                        )}
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    <TrackingProgress
                      tracking={goal.tracking}
                      showValues={false}
                      progressOverride={rollupOverridePercent(
                        goal.tracking,
                        goal.rollupProgressPercent,
                      )}
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

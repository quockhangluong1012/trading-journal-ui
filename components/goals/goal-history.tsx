"use client"

import { ArrowRight, CheckCircle2, Clock, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  GOAL_ACTIVITY_SOURCE_LABELS,
  GOAL_METRIC_SOURCE_LABELS,
  GoalItemType,
} from "@/lib/enum/GoalEnums"
import type { GoalActivityView, ProgressEntryView } from "@/lib/goals-api"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"

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

export function GoalHistory({
  progress,
  activity,
}: {
  progress: ProgressEntryView[]
  activity: GoalActivityView[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className={SC}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" /> Progress log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progress.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No manual updates yet.</p>
          ) : (
            <ul className="space-y-3">
              {progress.map((entry) => (
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
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No automatic activity recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((entry) => (
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
                    <p className="text-[11px] text-muted-foreground">
                      from {GOAL_ACTIVITY_SOURCE_LABELS[entry.sourceType]}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">{timestamp(entry.recordedAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

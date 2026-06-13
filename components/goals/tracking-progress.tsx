"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Zap } from "lucide-react"
import { TrackingMode } from "@/lib/enum/GoalEnums"
import type { TrackingSnapshot } from "@/lib/goals-api"
import { clampPercent, describeTracking, formatMetricValue, isAutoTracked } from "@/lib/goals-overview"
import { cn } from "@/lib/utils"

interface Props {
  tracking: TrackingSnapshot
  className?: string
  /** Show the textual "current / target" line under the bar. */
  showValues?: boolean
}

export function TrackingProgress({ tracking, className, showValues = true }: Props) {
  const pct = clampPercent(tracking.progressPercent)
  const isMetric = tracking.mode === TrackingMode.Metric

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          {describeTracking(tracking)}
          {isAutoTracked(tracking) && (
            <Badge variant="outline" className="gap-1 border-primary/25 bg-primary/8 px-1.5 py-0 text-[9px] text-primary">
              <Zap className="h-2.5 w-2.5" /> Auto
            </Badge>
          )}
        </span>
        <span className={cn("text-xs font-semibold", tracking.isCompleted ? "text-emerald-400" : "text-foreground")}>
          {pct}%
        </span>
      </div>
      <Progress
        value={pct}
        className={cn("h-2", tracking.isCompleted && "[&_[data-slot=progress-indicator]]:bg-emerald-500")}
      />
      {showValues && isMetric && (
        <p className="text-[11px] text-muted-foreground">
          {formatMetricValue(tracking.currentValue, tracking.metricUnit)} /{" "}
          {formatMetricValue(tracking.targetValue, tracking.metricUnit)}
        </p>
      )}
    </div>
  )
}

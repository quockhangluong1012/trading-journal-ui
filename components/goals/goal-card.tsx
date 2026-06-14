"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CalendarDays, CheckCircle2, ListTodo, Target } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TrackingProgress } from "@/components/goals/tracking-progress"
import { htmlToPlainText } from "@/components/ui/safe-html"
import type { GoalSummary } from "@/lib/goals-api"
import { GOAL_STATUS_META, formatDate, getGoalStatus, rollupOverridePercent } from "@/lib/goals-overview"
import { cn } from "@/lib/utils"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm transition-colors hover:border-primary/40"

// Wraps up to 2 lines; when the title is too long to fit, it clamps with an
// ellipsis and a tooltip surfaces the full text. Short titles just wrap normally.
function GoalTitle({ title }: { title: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [isClamped, setIsClamped] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setIsClamped(el.scrollHeight > el.clientHeight + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [title])

  const heading = (
    <h3
      ref={ref}
      className="line-clamp-2 font-semibold text-foreground group-hover:text-primary"
    >
      {title}
    </h3>
  )

  if (!isClamped) return heading

  return (
    <Tooltip>
      <TooltipTrigger asChild>{heading}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{title}</TooltipContent>
    </Tooltip>
  )
}

export function GoalCard({ goal, referenceDate }: { goal: GoalSummary; referenceDate: Date }) {
  const status = getGoalStatus(goal, referenceDate)
  const meta = GOAL_STATUS_META[status]
  const descriptionText = htmlToPlainText(goal.description)

  return (
    <Link href={`/goals/${goal.id}`} className="group block">
      <Card className={SC}>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                {goal.tracking.isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <GoalTitle title={goal.title} />
                {descriptionText && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{descriptionText}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold", meta.tone)}>
              {meta.label}
            </Badge>
          </div>

          <TrackingProgress
            tracking={goal.tracking}
            progressOverride={rollupOverridePercent(goal.tracking, goal.rollupProgressPercent)}
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            {goal.dueDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Due {formatDate(goal.dueDate)}
              </span>
            )}
            {goal.milestoneCount > 0 && (
              <span className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5" /> {goal.milestoneCount} milestone{goal.milestoneCount === 1 ? "" : "s"}
              </span>
            )}
            {goal.taskCount > 0 && (
              <span className="flex items-center gap-1">
                <ListTodo className="h-3.5 w-3.5" /> {goal.completedTaskCount}/{goal.taskCount} tasks
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

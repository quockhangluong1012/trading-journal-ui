"use client"

import type { ReactNode } from "react"
import { ArrowDown, ArrowUp, CalendarDays, CheckCircle2, Circle, MoreVertical, Pencil, SquarePen, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TrackingProgress } from "@/components/goals/tracking-progress"
import { htmlToPlainText } from "@/components/ui/safe-html"
import type { TrackingSnapshot } from "@/lib/goals-api"
import { canUpdateManually, formatDate, rollupOverridePercent } from "@/lib/goals-overview"
import { cn } from "@/lib/utils"

interface Props {
  title: string
  description?: string | null
  dueDate?: string | null
  tracking: TrackingSnapshot
  /** Parent rollup (milestones) — surfaced on the bar when manual-tracked. */
  rollupProgressPercent?: number
  /** Nested task rows render slightly smaller / indented. */
  variant?: "milestone" | "task"
  onUpdate: () => void
  /** Edit the item's metadata / tracking config. */
  onEdit?: () => void
  /** Soft-delete the item. */
  onDelete?: () => void
  /** Reorder among siblings. Buttons are hidden when the handler is omitted. */
  onMoveUp?: () => void
  onMoveDown?: () => void
  /** Extra action buttons (e.g. "Add task" on a milestone). */
  actions?: ReactNode
  children?: ReactNode
}

export function GoalItemRow({
  title,
  description,
  dueDate,
  tracking,
  rollupProgressPercent,
  variant = "milestone",
  onUpdate,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  actions,
  children,
}: Props) {
  const hasMenu = Boolean(onEdit || onDelete || onMoveUp || onMoveDown)
  const completed = tracking.isCompleted
  const isTask = variant === "task"
  const descriptionText = htmlToPlainText(description)
  const progressOverride = rollupProgressPercent != null
    ? rollupOverridePercent(tracking, rollupProgressPercent)
    : undefined

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-background/60 p-4",
        isTask && "bg-secondary/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {completed
            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <p className={cn("font-medium text-foreground", isTask && "text-sm", completed && "text-muted-foreground line-through")}>
              {title}
            </p>
            {descriptionText && <p className="mt-0.5 text-xs text-muted-foreground">{descriptionText}</p>}
            {dueDate && (
              <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarDays className="h-3 w-3" /> Due {formatDate(dueDate)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          {canUpdateManually(tracking) && (
            <Button variant="ghost" size="sm" onClick={onUpdate} className="h-8 gap-1.5 px-2.5 text-xs">
              <Pencil className="h-3.5 w-3.5" /> Update
            </Button>
          )}
          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <SquarePen className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                )}
                {onMoveUp && (
                  <DropdownMenuItem onClick={onMoveUp}>
                    <ArrowUp className="mr-2 h-4 w-4" /> Move up
                  </DropdownMenuItem>
                )}
                {onMoveDown && (
                  <DropdownMenuItem onClick={onMoveDown}>
                    <ArrowDown className="mr-2 h-4 w-4" /> Move down
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <TrackingProgress tracking={tracking} className="mt-3" progressOverride={progressOverride} />

      {children && <div className="mt-3 space-y-2 border-l border-border/50 pl-3">{children}</div>}
    </div>
  )
}

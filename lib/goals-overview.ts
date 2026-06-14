import {
  GOAL_METRIC_SOURCE_LABELS,
  GoalActivitySourceType,
  GoalItemType,
  GoalMetricSource,
  METRIC_DIRECTION_LABELS,
  MetricDirection,
  TrackingMode,
} from "./enum/GoalEnums"
import type {
  GoalDetail,
  GoalMilestoneView,
  GoalSummary,
  GoalTaskView,
  ProgressResult,
  ReorderEntry,
  TrackingInput,
  TrackingSnapshot,
  UpdateProgressRequest,
} from "./goals-api"

// ─── Tracking-mode predicates (mirror backend UpdateProgress rules) ─────

/** Metric goals with a `source` are fed automatically from app activity. */
export function isAutoTracked(tracking: TrackingSnapshot): boolean {
  return tracking.mode === TrackingMode.Metric && tracking.source != null
}

/** Whether the user is allowed to record progress manually for this item. */
export function canUpdateManually(tracking: TrackingSnapshot): boolean {
  return !isAutoTracked(tracking)
}

// ─── Progress / status ──────────────────────────────────────────────────

export type GoalStatus = "completed" | "overdue" | "due-soon" | "active"

/**
 * Derives a display status. `referenceDate` is injectable so this stays pure
 * and testable (no hidden `new Date()`).
 */
export function getGoalStatus(
  goal: Pick<GoalSummary, "dueDate" | "tracking">,
  referenceDate: Date,
): GoalStatus {
  if (goal.tracking.isCompleted) return "completed"
  if (!goal.dueDate) return "active"

  const due = new Date(goal.dueDate)
  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntilDue = Math.ceil((due.getTime() - referenceDate.getTime()) / msPerDay)

  if (daysUntilDue < 0) return "overdue"
  if (daysUntilDue <= 7) return "due-soon"
  return "active"
}

export const GOAL_STATUS_META: Record<
  GoalStatus,
  { label: string; tone: string }
> = {
  completed: { label: "Completed", tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
  overdue: { label: "Overdue", tone: "text-red-400 bg-red-500/10 border-red-500/25" },
  "due-soon": { label: "Due soon", tone: "text-amber-400 bg-amber-500/10 border-amber-500/25" },
  active: { label: "Active", tone: "text-blue-400 bg-blue-500/10 border-blue-500/25" },
}

/** Clamp + round a percentage for display. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/**
 * For a parent (goal/milestone), the progress bar should reflect child
 * completion. A Manual parent's own progress is just 0/100 and ignores its
 * tasks, so we surface the server-computed rollup instead. Metric items track
 * their own number, so they keep their own progress (returns `undefined`).
 */
export function rollupOverridePercent(
  tracking: TrackingSnapshot,
  rollupProgressPercent: number,
): number | undefined {
  return tracking.mode === TrackingMode.Manual ? rollupProgressPercent : undefined
}

// ─── Optimistic progress patching ─────────────────────────────────────────
// A progress PATCH returns the updated item's own state (ProgressResult), which
// is enough to patch the detail/list in place instead of refetching the whole
// goal + history. These helpers mirror backend GoalRollup so the rolled-up
// parent bars stay consistent after a child changes.

const round2 = (value: number): number => Math.round(value * 100) / 100

const average = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length

/** Overlays the fields a ProgressResult carries onto an existing snapshot. */
export function patchTrackingSnapshot(
  tracking: TrackingSnapshot,
  result: ProgressResult,
): TrackingSnapshot {
  return {
    ...tracking,
    currentValue: result.currentValue,
    progressPercent: result.progressPercent,
    isCompleted: result.isCompleted,
    completedDate: result.completedDate,
  }
}

/** Mirror of GoalRollup.ForMilestone: average of tasks, own progress if childless. */
export function recomputeMilestoneRollup(milestone: GoalMilestoneView): number {
  return milestone.tasks.length === 0
    ? milestone.tracking.progressPercent
    : round2(average(milestone.tasks.map((task) => task.tracking.progressPercent)))
}

/** Mirror of GoalRollup.ForGoal: each milestone's rollup + loose tasks, own if neither. */
export function recomputeGoalRollup(
  detail: Pick<GoalDetail, "tracking" | "milestones" | "tasks">,
): number {
  const parts = [
    ...detail.milestones.map(recomputeMilestoneRollup),
    ...detail.tasks.map((task) => task.tracking.progressPercent),
  ]
  return parts.length === 0 ? detail.tracking.progressPercent : round2(average(parts))
}

/** Number of completed tasks across loose tasks and every milestone's tasks. */
export function countCompletedTasks(detail: Pick<GoalDetail, "milestones" | "tasks">): number {
  const tasks: GoalTaskView[] = [
    ...detail.tasks,
    ...detail.milestones.flatMap((milestone) => milestone.tasks),
  ]
  return tasks.filter((task) => task.tracking.isCompleted).length
}

/**
 * Returns a new GoalDetail with the targeted item's tracking patched from a
 * ProgressResult and all milestone rollups recomputed. The goal-level rollup is
 * read off the result via {@link recomputeGoalRollup}.
 */
export function applyProgressToDetail(
  detail: GoalDetail,
  target: { itemType: GoalItemType; itemId: number },
  result: ProgressResult,
): GoalDetail {
  const patchTask = (task: GoalTaskView): GoalTaskView =>
    target.itemType === GoalItemType.Task && task.id === target.itemId
      ? { ...task, tracking: patchTrackingSnapshot(task.tracking, result) }
      : task

  const milestones = detail.milestones.map((milestone) => {
    const tasks = milestone.tasks.map(patchTask)
    const tracking =
      target.itemType === GoalItemType.Milestone && milestone.id === target.itemId
        ? patchTrackingSnapshot(milestone.tracking, result)
        : milestone.tracking
    const patched = { ...milestone, tasks, tracking }
    return { ...patched, rollupProgressPercent: recomputeMilestoneRollup(patched) }
  })

  const tasks = detail.tasks.map(patchTask)
  const tracking =
    target.itemType === GoalItemType.Goal && detail.id === target.itemId
      ? patchTrackingSnapshot(detail.tracking, result)
      : detail.tracking

  const next = { ...detail, milestones, tasks, tracking }
  return { ...next, rollupProgressPercent: recomputeGoalRollup(next) }
}

/** Copies the volatile, progress-derived fields from a detail onto its list summary. */
export function applyDetailToSummary(summary: GoalSummary, detail: GoalDetail): GoalSummary {
  return {
    ...summary,
    tracking: detail.tracking,
    rollupProgressPercent: detail.rollupProgressPercent,
    completedTaskCount: countCompletedTasks(detail),
  }
}

// ─── Formatting ─────────────────────────────────────────────────────────

export function formatMetricValue(value: number | null, unit: string | null): string {
  if (value == null) return "—"
  const formatted = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return unit ? `${formatted} ${unit}` : formatted
}

/**
 * A short human label for what a tracking config measures, used on cards.
 * e.g. "Reach at least 100 trades", "Winning trades", or "Manual".
 */
export function describeTracking(tracking: TrackingSnapshot): string {
  if (tracking.mode === TrackingMode.Manual) return "Manual check-off"
  if (tracking.source != null) return GOAL_METRIC_SOURCE_LABELS[tracking.source]
  if (tracking.direction != null && tracking.targetValue != null) {
    return `${METRIC_DIRECTION_LABELS[tracking.direction]} ${formatMetricValue(
      tracking.targetValue,
      tracking.metricUnit,
    )}`
  }
  return tracking.metricName ?? "Metric"
}

/**
 * The in-app route for an auto-tracked activity's originating record, so the
 * activity log can link back to the trade/backtest that advanced the goal.
 * Returns null for source types that have no detail page.
 */
export function goalActivitySourceHref(
  sourceType: GoalActivitySourceType,
  sourceId: number,
): string | null {
  switch (sourceType) {
    case GoalActivitySourceType.TradeHistory:
      return `/trade/${sourceId}`
    case GoalActivitySourceType.BacktestSession:
      return `/backtest/${sourceId}`
    default:
      return null
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// ─── Build / validate payloads ──────────────────────────────────────────

export interface TrackingFormState {
  mode: TrackingMode
  metricName: string
  metricUnit: string
  direction: MetricDirection
  startValue: string
  targetValue: string
  /** "" means a manually-updated metric; otherwise an auto-tracked source. */
  source: string
}

export function emptyTrackingForm(): TrackingFormState {
  return {
    mode: TrackingMode.Manual,
    metricName: "",
    metricUnit: "",
    direction: MetricDirection.AtLeast,
    startValue: "0",
    targetValue: "",
    source: "",
  }
}

/** Rebuilds editable form state from an existing item's tracking snapshot. */
export function trackingFormFromSnapshot(tracking: TrackingSnapshot): TrackingFormState {
  if (tracking.mode === TrackingMode.Manual) return emptyTrackingForm()
  return {
    mode: TrackingMode.Metric,
    metricName: tracking.metricName ?? "",
    metricUnit: tracking.metricUnit ?? "",
    direction: tracking.direction ?? MetricDirection.AtLeast,
    startValue: tracking.startValue != null ? String(tracking.startValue) : "0",
    targetValue: tracking.targetValue != null ? String(tracking.targetValue) : "",
    source: tracking.source != null ? String(tracking.source) : "",
  }
}

/**
 * Moves the item at `fromIndex` to `toIndex` and returns reorder entries with
 * sequential sort orders for the whole sibling list. Returns `[]` when the move
 * is a no-op or out of bounds, so callers can skip the request.
 */
export function reorderEntries<T extends { id: number }>(
  items: T[],
  fromIndex: number,
  toIndex: number,
  itemType: GoalItemType,
): ReorderEntry[] {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return []
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next.map((item, index) => ({ itemType, id: item.id, sortOrder: index }))
}

/** ISO timestamp → `yyyy-MM-dd` for a native date input (empty string if null). */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}

/** Validates a tracking form, returning an error string or null. */
export function validateTrackingForm(form: TrackingFormState): string | null {
  if (form.mode === TrackingMode.Manual) return null
  if (!form.metricName.trim()) return "Metric name is required."
  const start = Number(form.startValue)
  const target = Number(form.targetValue)
  if (form.startValue.trim() === "" || Number.isNaN(start)) return "Start value is required."
  if (form.targetValue.trim() === "" || Number.isNaN(target)) return "Target value is required."
  const movesUp = form.direction === MetricDirection.AtLeast
  if (movesUp && target <= start) return "Target must be greater than the start value."
  if (!movesUp && target >= start) return "Target must be less than the start value."
  return null
}

/** Converts a validated tracking form into the API TrackingInput shape. */
export function buildTrackingInput(form: TrackingFormState): TrackingInput {
  if (form.mode === TrackingMode.Manual) {
    return { mode: TrackingMode.Manual }
  }
  return {
    mode: TrackingMode.Metric,
    metricName: form.metricName.trim(),
    metricUnit: form.metricUnit.trim() || null,
    direction: form.direction,
    startValue: Number(form.startValue),
    targetValue: Number(form.targetValue),
    source: form.source === "" ? null : (Number(form.source) as GoalMetricSource),
  }
}

/**
 * Builds the progress-update payload appropriate to the tracking mode,
 * mirroring backend validation (manual → isCompleted only; metric → value only).
 */
export function buildProgressRequest(
  tracking: TrackingSnapshot,
  input: { isCompleted?: boolean; value?: number; note?: string },
): UpdateProgressRequest {
  const note = input.note?.trim() ? input.note.trim() : null
  if (tracking.mode === TrackingMode.Manual) {
    return { isCompleted: input.isCompleted ?? false, note }
  }
  return { value: input.value, note }
}

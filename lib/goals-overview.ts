import {
  GOAL_METRIC_SOURCE_LABELS,
  GoalMetricSource,
  METRIC_DIRECTION_LABELS,
  MetricDirection,
  TrackingMode,
} from "./enum/GoalEnums"
import type {
  GoalSummary,
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

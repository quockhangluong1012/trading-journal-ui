import { describe, expect, it } from "vitest"
import {
  GoalActivitySourceType,
  GoalItemType,
  GoalMetricSource,
  MetricDirection,
  TrackingMode,
} from "@/lib/enum/GoalEnums"
import type {
  GoalDetail,
  GoalMilestoneView,
  GoalSummary,
  GoalTaskView,
  ProgressResult,
  TrackingSnapshot,
} from "@/lib/goals-api"
import {
  applyDetailToSummary,
  applyProgressToDetail,
  buildProgressRequest,
  buildTrackingInput,
  canUpdateManually,
  clampPercent,
  countCompletedTasks,
  describeTracking,
  emptyTrackingForm,
  formatMetricValue,
  getGoalStatus,
  goalActivitySourceHref,
  isAutoTracked,
  recomputeGoalRollup,
  recomputeMilestoneRollup,
  reorderEntries,
  rollupOverridePercent,
  toDateInputValue,
  trackingFormFromSnapshot,
  validateTrackingForm,
} from "@/lib/goals-overview"

function snapshot(overrides: Partial<TrackingSnapshot> = {}): TrackingSnapshot {
  return {
    mode: TrackingMode.Manual,
    source: null,
    metricName: null,
    metricUnit: null,
    direction: null,
    startValue: null,
    currentValue: null,
    targetValue: null,
    progressPercent: 0,
    isCompleted: false,
    completedDate: null,
    ...overrides,
  }
}

describe("rollupOverridePercent", () => {
  it("surfaces rollup for manual parents and leaves metric items to their own progress", () => {
    const manual = snapshot({ mode: TrackingMode.Manual })
    expect(rollupOverridePercent(manual, 80)).toBe(80)

    const metric = snapshot({ mode: TrackingMode.Metric, progressPercent: 40 })
    expect(rollupOverridePercent(metric, 80)).toBeUndefined()
  })
})

describe("reorderEntries", () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }]

  it("renumbers the whole sibling list after a move", () => {
    const entries = reorderEntries(items, 2, 0, GoalItemType.Task)
    expect(entries).toEqual([
      { itemType: GoalItemType.Task, id: 3, sortOrder: 0 },
      { itemType: GoalItemType.Task, id: 1, sortOrder: 1 },
      { itemType: GoalItemType.Task, id: 2, sortOrder: 2 },
    ])
  })

  it("returns nothing for no-op or out-of-bounds moves", () => {
    expect(reorderEntries(items, 0, 0, GoalItemType.Milestone)).toEqual([])
    expect(reorderEntries(items, 0, -1, GoalItemType.Milestone)).toEqual([])
    expect(reorderEntries(items, 2, 3, GoalItemType.Milestone)).toEqual([])
  })
})

describe("trackingFormFromSnapshot / toDateInputValue", () => {
  it("rebuilds metric form state from a snapshot", () => {
    const form = trackingFormFromSnapshot(snapshot({
      mode: TrackingMode.Metric,
      metricName: "Trades",
      metricUnit: "trades",
      direction: MetricDirection.AtLeast,
      startValue: 0,
      targetValue: 100,
      source: GoalMetricSource.TradeClosedCount,
    }))
    expect(form.mode).toBe(TrackingMode.Metric)
    expect(form.metricName).toBe("Trades")
    expect(form.targetValue).toBe("100")
    expect(form.source).toBe(String(GoalMetricSource.TradeClosedCount))
  })

  it("falls back to an empty form for manual tracking", () => {
    expect(trackingFormFromSnapshot(snapshot({ mode: TrackingMode.Manual })).mode).toBe(TrackingMode.Manual)
  })

  it("formats an ISO timestamp as a date-input value", () => {
    expect(toDateInputValue("2026-06-14T10:30:00.000Z")).toBe("2026-06-14")
    expect(toDateInputValue(null)).toBe("")
    expect(toDateInputValue("not-a-date")).toBe("")
  })
})

describe("auto-tracking predicates", () => {
  it("flags metric goals with a source as auto-tracked", () => {
    const t = snapshot({ mode: TrackingMode.Metric, source: GoalMetricSource.WinningTradeCount })
    expect(isAutoTracked(t)).toBe(true)
    expect(canUpdateManually(t)).toBe(false)
  })

  it("treats sourceless metric goals as manually updatable", () => {
    const t = snapshot({ mode: TrackingMode.Metric, source: null })
    expect(isAutoTracked(t)).toBe(false)
    expect(canUpdateManually(t)).toBe(true)
  })

  it("treats manual goals as manually updatable", () => {
    expect(canUpdateManually(snapshot())).toBe(true)
  })
})

describe("getGoalStatus", () => {
  const ref = new Date("2026-06-12T00:00:00Z")

  it("returns completed regardless of due date", () => {
    expect(getGoalStatus({ dueDate: "2020-01-01", tracking: snapshot({ isCompleted: true }) }, ref)).toBe("completed")
  })

  it("returns overdue for a past due date", () => {
    expect(getGoalStatus({ dueDate: "2026-06-01", tracking: snapshot() }, ref)).toBe("overdue")
  })

  it("returns due-soon within a week", () => {
    expect(getGoalStatus({ dueDate: "2026-06-15", tracking: snapshot() }, ref)).toBe("due-soon")
  })

  it("returns active when far out or undated", () => {
    expect(getGoalStatus({ dueDate: "2026-12-31", tracking: snapshot() }, ref)).toBe("active")
    expect(getGoalStatus({ dueDate: null, tracking: snapshot() }, ref)).toBe("active")
  })
})

describe("formatting", () => {
  it("clamps and rounds percentages", () => {
    expect(clampPercent(50.6)).toBe(51)
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(150)).toBe(100)
    expect(clampPercent(Number.NaN)).toBe(0)
  })

  it("formats metric values with units", () => {
    expect(formatMetricValue(1000, "trades")).toBe("1,000 trades")
    expect(formatMetricValue(12.5, null)).toBe("12.5")
    expect(formatMetricValue(null, "x")).toBe("—")
  })

  it("describes tracking config", () => {
    expect(describeTracking(snapshot())).toBe("Manual check-off")
    expect(
      describeTracking(snapshot({ mode: TrackingMode.Metric, source: GoalMetricSource.TradingPnl })),
    ).toBe("Trading P&L")
    expect(
      describeTracking(
        snapshot({
          mode: TrackingMode.Metric,
          direction: MetricDirection.AtLeast,
          targetValue: 100,
          metricUnit: "trades",
        }),
      ),
    ).toBe("Reach at least 100 trades")
  })
})

describe("goalActivitySourceHref", () => {
  it("links trade history to the trade detail page", () => {
    expect(goalActivitySourceHref(GoalActivitySourceType.TradeHistory, 42)).toBe("/trade/42")
  })

  it("links backtest sessions to the backtest detail page", () => {
    expect(goalActivitySourceHref(GoalActivitySourceType.BacktestSession, 7)).toBe("/backtest/7")
  })

  it("returns null for unknown source types", () => {
    expect(goalActivitySourceHref(999 as GoalActivitySourceType, 1)).toBeNull()
  })
})

describe("validateTrackingForm", () => {
  it("accepts manual mode unconditionally", () => {
    expect(validateTrackingForm(emptyTrackingForm())).toBeNull()
  })

  it("requires a metric name and numeric bounds", () => {
    const form = { ...emptyTrackingForm(), mode: TrackingMode.Metric }
    expect(validateTrackingForm(form)).toBe("Metric name is required.")
  })

  it("enforces direction on the target", () => {
    const up = { ...emptyTrackingForm(), mode: TrackingMode.Metric, metricName: "Wins", startValue: "10", targetValue: "5", direction: MetricDirection.AtLeast }
    expect(validateTrackingForm(up)).toBe("Target must be greater than the start value.")

    const down = { ...up, direction: MetricDirection.AtMost, startValue: "5", targetValue: "10" }
    expect(validateTrackingForm(down)).toBe("Target must be less than the start value.")
  })

  it("passes a well-formed metric form", () => {
    const form = { ...emptyTrackingForm(), mode: TrackingMode.Metric, metricName: "Wins", startValue: "0", targetValue: "50" }
    expect(validateTrackingForm(form)).toBeNull()
  })
})

describe("buildTrackingInput", () => {
  it("collapses manual mode to just the mode", () => {
    expect(buildTrackingInput(emptyTrackingForm())).toEqual({ mode: TrackingMode.Manual })
  })

  it("builds a manual metric (no source)", () => {
    const form = { ...emptyTrackingForm(), mode: TrackingMode.Metric, metricName: "Wins", metricUnit: "", startValue: "0", targetValue: "50", source: "" }
    expect(buildTrackingInput(form)).toEqual({
      mode: TrackingMode.Metric,
      metricName: "Wins",
      metricUnit: null,
      direction: MetricDirection.AtLeast,
      startValue: 0,
      targetValue: 50,
      source: null,
    })
  })

  it("builds an auto-tracked metric with a numeric source", () => {
    const form = { ...emptyTrackingForm(), mode: TrackingMode.Metric, metricName: "Closed", startValue: "0", targetValue: "100", source: String(GoalMetricSource.TradeClosedCount) }
    expect(buildTrackingInput(form).source).toBe(GoalMetricSource.TradeClosedCount)
  })
})

describe("buildProgressRequest", () => {
  it("sends only isCompleted for manual items", () => {
    expect(buildProgressRequest(snapshot(), { isCompleted: true, note: " done " })).toEqual({
      isCompleted: true,
      note: "done",
    })
  })

  it("sends only value for metric items", () => {
    const t = snapshot({ mode: TrackingMode.Metric })
    expect(buildProgressRequest(t, { value: 42, note: "" })).toEqual({ value: 42, note: null })
  })
})

// ─── Optimistic progress patching ─────────────────────────────────────────

function task(id: number, overrides: Partial<TrackingSnapshot> = {}): GoalTaskView {
  return {
    id,
    milestoneId: null,
    title: `Task ${id}`,
    description: null,
    dueDate: null,
    sortOrder: id,
    tracking: snapshot({ mode: TrackingMode.Metric, ...overrides }),
  }
}

function milestone(id: number, tasks: GoalTaskView[], own: Partial<TrackingSnapshot> = {}): GoalMilestoneView {
  return {
    id,
    title: `Milestone ${id}`,
    description: null,
    dueDate: null,
    sortOrder: id,
    tracking: snapshot({ mode: TrackingMode.Metric, ...own }),
    rollupProgressPercent: 0,
    tasks,
  }
}

function detail(overrides: Partial<GoalDetail> = {}): GoalDetail {
  return {
    id: 1,
    title: "Goal",
    description: null,
    startDate: null,
    dueDate: null,
    tracking: snapshot({ mode: TrackingMode.Manual }),
    rollupProgressPercent: 0,
    milestones: [],
    tasks: [],
    progressHistory: [],
    activityHistory: [],
    createdDate: "2026-01-01T00:00:00Z",
    updatedDate: null,
    ...overrides,
  }
}

const result = (overrides: Partial<ProgressResult> = {}): ProgressResult => ({
  currentValue: 5,
  progressPercent: 50,
  isCompleted: false,
  completedDate: null,
  ...overrides,
})

describe("recomputeMilestoneRollup", () => {
  it("averages task progress, rounding to 2 decimals", () => {
    const m = milestone(1, [task(1, { progressPercent: 50 }), task(2, { progressPercent: 25 })])
    expect(recomputeMilestoneRollup(m)).toBe(37.5)
  })

  it("falls back to its own progress when it has no tasks", () => {
    expect(recomputeMilestoneRollup(milestone(1, [], { progressPercent: 60 }))).toBe(60)
  })
})

describe("recomputeGoalRollup", () => {
  it("combines milestone rollups with loose tasks", () => {
    const d = detail({
      milestones: [milestone(1, [task(1, { progressPercent: 100 })])], // rollup 100
      tasks: [task(2, { progressPercent: 0 })], // loose 0
    })
    expect(recomputeGoalRollup(d)).toBe(50)
  })

  it("falls back to the goal's own progress when childless", () => {
    expect(recomputeGoalRollup(detail({ tracking: snapshot({ progressPercent: 73 }) }))).toBe(73)
  })
})

describe("applyProgressToDetail", () => {
  it("patches a task and recomputes the milestone + goal rollups", () => {
    const d = detail({
      milestones: [milestone(1, [task(10, { progressPercent: 0, currentValue: 0 })])],
    })
    const next = applyProgressToDetail(
      d,
      { itemType: GoalItemType.Task, itemId: 10 },
      result({ currentValue: 5, progressPercent: 100, isCompleted: true }),
    )

    const patchedTask = next.milestones[0].tasks[0]
    expect(patchedTask.tracking.progressPercent).toBe(100)
    expect(patchedTask.tracking.isCompleted).toBe(true)
    expect(next.milestones[0].rollupProgressPercent).toBe(100)
    expect(next.rollupProgressPercent).toBe(100)
  })

  it("does not mutate the input detail", () => {
    const d = detail({ tasks: [task(10, { progressPercent: 0 })] })
    applyProgressToDetail(d, { itemType: GoalItemType.Task, itemId: 10 }, result({ progressPercent: 80 }))
    expect(d.tasks[0].tracking.progressPercent).toBe(0)
  })

  it("patches the goal's own tracking when targeting the goal", () => {
    const next = applyProgressToDetail(
      detail(),
      { itemType: GoalItemType.Goal, itemId: 1 },
      result({ progressPercent: 100, isCompleted: true }),
    )
    expect(next.tracking.isCompleted).toBe(true)
    expect(next.rollupProgressPercent).toBe(100)
  })
})

describe("countCompletedTasks", () => {
  it("counts completed loose and milestone tasks", () => {
    const d = detail({
      tasks: [task(1, { isCompleted: true }), task(2, { isCompleted: false })],
      milestones: [milestone(1, [task(3, { isCompleted: true })])],
    })
    expect(countCompletedTasks(d)).toBe(2)
  })
})

describe("applyDetailToSummary", () => {
  it("copies the progress-derived fields onto the summary", () => {
    const summary: GoalSummary = {
      id: 1,
      title: "Goal",
      description: null,
      startDate: null,
      dueDate: null,
      tracking: snapshot(),
      rollupProgressPercent: 0,
      milestoneCount: 1,
      taskCount: 2,
      completedTaskCount: 0,
      createdDate: "2026-01-01T00:00:00Z",
      updatedDate: null,
    }
    const d = detail({
      rollupProgressPercent: 75,
      tasks: [task(1, { isCompleted: true }), task(2, { isCompleted: false })],
    })

    const patched = applyDetailToSummary(summary, d)
    expect(patched.rollupProgressPercent).toBe(75)
    expect(patched.completedTaskCount).toBe(1)
    expect(patched.milestoneCount).toBe(1) // structural fields untouched
  })
})

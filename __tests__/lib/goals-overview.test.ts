import { describe, expect, it } from "vitest"
import {
  GoalMetricSource,
  MetricDirection,
  TrackingMode,
} from "@/lib/enum/GoalEnums"
import type { TrackingSnapshot } from "@/lib/goals-api"
import {
  buildProgressRequest,
  buildTrackingInput,
  canUpdateManually,
  clampPercent,
  describeTracking,
  emptyTrackingForm,
  formatMetricValue,
  getGoalStatus,
  isAutoTracked,
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

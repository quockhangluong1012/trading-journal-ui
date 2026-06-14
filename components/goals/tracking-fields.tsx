"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  GOAL_METRIC_SOURCE_OPTIONS,
  MetricDirection,
  TrackingMode,
} from "@/lib/enum/GoalEnums"
import type { TrackingFormState } from "@/lib/goals-overview"

interface Props {
  value: TrackingFormState
  onChange: (next: TrackingFormState) => void
}

const MODE_OPTIONS = [
  { value: TrackingMode.Manual, label: "Manual check-off", hint: "Mark complete by hand" },
  { value: TrackingMode.Metric, label: "Numeric metric", hint: "Track progress toward a target number" },
]

/** Shared tracking configuration used when creating a goal, milestone, or task. */
export function TrackingFields({ value, onChange }: Props) {
  const set = (patch: Partial<TrackingFormState>) => onChange({ ...value, ...patch })
  const isMetric = value.mode === TrackingMode.Metric

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
      <div className="space-y-2">
        <Label>How is this tracked?</Label>
        <Select
          value={String(value.mode)}
          onValueChange={(v) => set({ mode: Number(v) as TrackingMode })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {MODE_OPTIONS.find((o) => o.value === value.mode)?.hint}
        </p>
      </div>

      {isMetric && (
        <>
          <div className="space-y-2">
            <Label>Progress source</Label>
            <Select value={value.source} onValueChange={(v) => set({ source: v === "manual" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">I&apos;ll update it manually</SelectItem>
                {GOAL_METRIC_SOURCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    Auto · {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {value.source === ""
                ? "You record progress yourself."
                : "Progress updates automatically from matching trading activity recorded after this goal is created — past activity isn't counted. Any other goal tracking the same source advances at the same time."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="metric-name">Metric name *</Label>
              <Input
                id="metric-name"
                placeholder="e.g., Trades closed"
                value={value.metricName}
                onChange={(e) => set({ metricName: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric-unit">Unit</Label>
              <Input
                id="metric-unit"
                placeholder="e.g., trades, $, %"
                value={value.metricUnit}
                onChange={(e) => set({ metricUnit: e.target.value })}
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <Select
              value={String(value.direction)}
              onValueChange={(v) => set({ direction: Number(v) as MetricDirection })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={String(MetricDirection.AtLeast)}>Reach at least the target (count up)</SelectItem>
                <SelectItem value={String(MetricDirection.AtMost)}>Stay at most the target (count down)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-value">Start value *</Label>
              <Input
                id="start-value"
                type="number"
                value={value.startValue}
                onChange={(e) => set({ startValue: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-value">Target value *</Label>
              <Input
                id="target-value"
                type="number"
                value={value.targetValue}
                onChange={(e) => set({ targetValue: e.target.value })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

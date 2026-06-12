"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { TrackingMode } from "@/lib/enum/GoalEnums"
import type { TrackingSnapshot, UpdateProgressRequest } from "@/lib/goals-api"
import { buildProgressRequest, formatMetricValue } from "@/lib/goals-overview"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What is being updated — used for the dialog copy only. */
  itemLabel: string
  title: string
  tracking: TrackingSnapshot
  isMutating: boolean
  onSubmit: (request: UpdateProgressRequest) => Promise<boolean>
}

export function UpdateProgressDialog({
  open,
  onOpenChange,
  itemLabel,
  title,
  tracking,
  isMutating,
  onSubmit,
}: Props) {
  const isManual = tracking.mode === TrackingMode.Manual
  const [completed, setCompleted] = useState(tracking.isCompleted)
  const [value, setValue] = useState(tracking.currentValue != null ? String(tracking.currentValue) : "")
  const [note, setNote] = useState("")

  // Re-seed from the latest snapshot whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setCompleted(tracking.isCompleted)
      setValue(tracking.currentValue != null ? String(tracking.currentValue) : "")
      setNote("")
    }
  }, [open, tracking.isCompleted, tracking.currentValue])

  const handleSubmit = async () => {
    let request: UpdateProgressRequest
    if (isManual) {
      request = buildProgressRequest(tracking, { isCompleted: completed, note })
    } else {
      const numeric = Number(value)
      if (value.trim() === "" || Number.isNaN(numeric)) {
        toast.error("Enter the current metric value.")
        return
      }
      request = buildProgressRequest(tracking, { value: numeric, note })
    }
    const ok = await onSubmit(request)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Update {itemLabel}</DialogTitle>
          <DialogDescription className="line-clamp-2">{title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {isManual ? (
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Mark as completed</p>
                <p className="text-[11px] text-muted-foreground">Toggle when this is done.</p>
              </div>
              <Switch checked={completed} onCheckedChange={setCompleted} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="progress-value">
                Current value
                {tracking.targetValue != null && (
                  <span className="ml-1 text-muted-foreground">
                    (target {formatMetricValue(tracking.targetValue, tracking.metricUnit)})
                  </span>
                )}
              </Label>
              <Input
                id="progress-value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={tracking.metricName ?? "Value"}
              />
              <p className="text-[11px] text-muted-foreground">
                Completion is derived automatically from the target.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="progress-note">Note (optional)</Label>
            <Textarea
              id="progress-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-16"
              placeholder="What changed?"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

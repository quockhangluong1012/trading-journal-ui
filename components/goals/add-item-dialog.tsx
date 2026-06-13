"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TrackingFields } from "@/components/goals/tracking-fields"
import { useGoalsStore } from "@/lib/stores/use-goals-store"
import {
  buildTrackingInput,
  emptyTrackingForm,
  validateTrackingForm,
  type TrackingFormState,
} from "@/lib/goals-overview"

export type AddItemKind = "milestone" | "task"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalId: number
  kind: AddItemKind
  /** When adding a task nested under a milestone. */
  milestoneId?: number | null
  /** Used as the new item's sortOrder (typically the current sibling count). */
  nextSortOrder: number
}

export function AddItemDialog({ open, onOpenChange, goalId, kind, milestoneId, nextSortOrder }: Props) {
  const addMilestone = useGoalsStore((s) => s.addMilestone)
  const addTask = useGoalsStore((s) => s.addTask)
  const isMutating = useGoalsStore((s) => s.isMutating)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [tracking, setTracking] = useState<TrackingFormState>(emptyTrackingForm)

  const reset = () => {
    setTitle("")
    setDescription("")
    setDueDate("")
    setTracking(emptyTrackingForm())
  }

  const label = kind === "milestone" ? "Milestone" : "Task"

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required.")
      return
    }
    const trackingError = validateTrackingForm(tracking)
    if (trackingError) {
      toast.error(trackingError)
      return
    }

    const common = {
      title: title.trim(),
      description: description.trim() || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      sortOrder: nextSortOrder,
      tracking: buildTrackingInput(tracking),
    }

    const ok = kind === "milestone"
      ? await addMilestone(goalId, common)
      : await addTask(goalId, { ...common, milestoneId: milestoneId ?? null })

    if (ok) {
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">New {label}</DialogTitle>
          <DialogDescription>
            {kind === "milestone"
              ? "Break your goal into a checkpoint you can track on its own."
              : "Add a concrete step toward this goal."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="item-title">Title *</Label>
            <Input
              id="item-title"
              placeholder={kind === "milestone" ? "e.g., Reach 50% of target" : "e.g., Review last week's trades"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-description">Description</Label>
            <Textarea
              id="item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
              maxLength={2000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-due">Due date</Label>
            <Input id="item-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <TrackingFields value={tracking} onChange={setTracking} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating ? "Adding..." : `Add ${label}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TrackingFields } from "@/components/goals/tracking-fields"
import { useGoalsStore } from "@/lib/stores/use-goals-store"
import type { GoalDetail } from "@/lib/goals-api"
import {
  buildTrackingInput,
  emptyTrackingForm,
  toDateInputValue,
  trackingFormFromSnapshot,
  validateTrackingForm,
  type TrackingFormState,
} from "@/lib/goals-overview"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, the dialog edits this goal instead of creating a new one. */
  editing?: GoalDetail | null
}

export function CreateGoalDialog({ open, onOpenChange, editing }: Props) {
  const createGoal = useGoalsStore((s) => s.createGoal)
  const updateGoal = useGoalsStore((s) => s.updateGoal)
  const isMutating = useGoalsStore((s) => s.isMutating)
  const isEdit = editing != null

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [tracking, setTracking] = useState<TrackingFormState>(emptyTrackingForm)

  const reset = () => {
    setTitle("")
    setDescription("")
    setStartDate("")
    setDueDate("")
    setTracking(emptyTrackingForm())
  }

  // Seed fields from the goal being edited whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setDescription(editing.description ?? "")
      setStartDate(toDateInputValue(editing.startDate))
      setDueDate(toDateInputValue(editing.dueDate))
      setTracking(trackingFormFromSnapshot(editing.tracking))
    } else {
      reset()
    }
  }, [open, editing])

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required.")
      return
    }
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      toast.error("Due date must be on or after the start date.")
      return
    }
    const trackingError = validateTrackingForm(tracking)
    if (trackingError) {
      toast.error(trackingError)
      return
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      tracking: buildTrackingInput(tracking),
    }

    if (isEdit && editing) {
      const ok = await updateGoal(editing.id, payload)
      if (ok) onOpenChange(false)
      return
    }

    const id = await createGoal(payload)
    if (id != null) {
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isEdit) reset(); onOpenChange(o) }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{isEdit ? "Edit Goal" : "New Goal"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this goal's details. Changing its tracking mode resets recorded progress."
              : "Set a target you want to hit. Track it manually or tie it to a live trading metric."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="goal-title">Title *</Label>
            <Input
              id="goal-title"
              placeholder="e.g., Close 100 trades this quarter"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-description">Description</Label>
            <Textarea
              id="goal-description"
              placeholder="Why does this goal matter? What does success look like?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
              maxLength={2000}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-start">Start date</Label>
              <Input id="goal-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-due">Due date</Label>
              <Input id="goal-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <TrackingFields value={tracking} onChange={setTracking} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating ? "Saving..." : isEdit ? "Save changes" : "Create Goal"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

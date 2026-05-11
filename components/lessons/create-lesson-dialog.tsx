"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/hooks/use-toast"
import {
  createLesson,
  parseLessonTags,
  LessonCategory,
  LessonSeverity,
  LessonCategoryLabels,
  LessonSeverityLabels,
  type CreateLessonRequest,
} from "@/lib/lessons-api"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateLessonDialog({ open, onOpenChange, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState<string>(String(LessonCategory.RiskManagement))
  const [severity, setSeverity] = useState<string>(String(LessonSeverity.Moderate))
  const [keyTakeaway, setKeyTakeaway] = useState("")
  const [actionItems, setActionItems] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [impactScore, setImpactScore] = useState(5)

  const resetForm = () => {
    setTitle("")
    setContent("")
    setCategory(String(LessonCategory.RiskManagement))
    setSeverity(String(LessonSeverity.Moderate))
    setKeyTakeaway("")
    setActionItems("")
    setTagsInput("")
    setImpactScore(5)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Missing fields", description: "Title and content are required.", variant: "destructive" })
      return
    }

    try {
      setIsSubmitting(true)
      const data: CreateLessonRequest = {
        title: title.trim(),
        content: content.trim(),
        category: Number(category),
        severity: Number(severity),
        keyTakeaway: keyTakeaway.trim() || null,
        actionItems: actionItems.trim() || null,
        impactScore,
        linkedTradeIds: null,
        tags: parseLessonTags(tagsInput),
      }

      await createLesson(data)
      toast({ title: "Lesson created", description: "Your lesson has been saved successfully." })
      resetForm()
      onSuccess()
    } catch {
      toast({ title: "Error", description: "Failed to create lesson.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">New Lesson Learned</DialogTitle>
          <DialogDescription>
            Capture what you learned, tag it, and keep it ready for faster review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Title *</Label>
            <Input
              id="lesson-title"
              placeholder="e.g., Never move stop loss after entry"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Category & Severity */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LessonCategoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LessonSeverityLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Key Takeaway */}
          <div className="space-y-2">
            <Label htmlFor="key-takeaway">Key Takeaway</Label>
            <Input
              id="key-takeaway"
              placeholder="One-line summary of what you learned"
              value={keyTakeaway}
              onChange={(e) => setKeyTakeaway(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-tags">Tags</Label>
            <Input
              id="lesson-tags"
              placeholder="e.g., AMD, NQ, London open"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Use comma-separated tags to turn lessons into a searchable knowledge library.
            </p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="lesson-content">Detailed Description *</Label>
            <Textarea
              id="lesson-content"
              placeholder="Describe what happened, why it was wrong, and what you should have done instead..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-30"
            />
          </div>

          {/* Action Items */}
          <div className="space-y-2">
            <Label htmlFor="action-items">Action Items</Label>
            <Textarea
              id="action-items"
              placeholder="What will you do differently next time?"
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              className="min-h-20"
              maxLength={2000}
            />
          </div>

          {/* Impact Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Impact Score</Label>
              <span className="text-sm font-semibold text-primary">{impactScore}/10</span>
            </div>
            <Slider
              value={[impactScore]}
              onValueChange={([v]) => setImpactScore(v)}
              min={1}
              max={10}
              step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Minor impact</span>
              <span>Life-changing lesson</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-linear-to-r from-amber-500 to-orange-600 text-white"
            >
              {isSubmitting ? "Saving..." : "Save Lesson"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

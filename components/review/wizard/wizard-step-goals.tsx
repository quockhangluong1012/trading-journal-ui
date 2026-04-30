"use client"

import { useState } from "react"
import { CirclePlus, Flame, ListTodo, Target, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ACTION_ITEM_PRIORITIES } from "@/lib/wizard-api"
import type { ActionItemRequest, ReviewActionItem } from "@/lib/wizard-api"
import type { UseReviewWizardResult } from "@/hooks/use-review-wizard"

const CATEGORIES = [
  { value: 0, label: "Risk Management" },
  { value: 1, label: "Technical" },
  { value: 2, label: "Psychology" },
  { value: 3, label: "Discipline" },
  { value: 4, label: "Process" },
]

function PendingActionItemCard({ item }: { item: ReviewActionItem }) {
  const priority = ACTION_ITEM_PRIORITIES.find((p) => p.value === item.priority)
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="mt-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5">
        <Flame className="h-3.5 w-3.5 text-amber-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{item.description}</p>
        )}
        <Badge variant="outline" className={`mt-1 text-[10px] ${priority?.color ?? ""}`}>
          {priority?.label ?? "Medium"}
        </Badge>
      </div>
    </div>
  )
}

export function WizardStepGoals({ wizard }: { wizard: UseReviewWizardResult }) {
  const { wizardData, form, updateForm, addActionItem, removeActionItem } = wizard
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newPriority, setNewPriority] = useState(1)
  const [newCategory, setNewCategory] = useState(0)

  const handleAdd = () => {
    if (!newTitle.trim()) return
    addActionItem({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      priority: newPriority,
      status: 0,
      category: newCategory,
    })
    setNewTitle("")
    setNewDesc("")
  }

  return (
    <div className="space-y-6">
      {/* Pending items from previous reviews */}
      {wizardData && wizardData.pendingActionItems.length > 0 && (
        <Card className="border-amber-500/20 bg-card/85">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-amber-400" />
              Open Action Items from Previous Reviews
              <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-400">
                {wizardData.pendingActionItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {wizardData.pendingActionItems.map((item) => (
              <PendingActionItemCard key={item.id} item={item} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Goals & takeaways */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-primary" />
              Goals for Next Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="What specific goals do you want to achieve next period?"
              value={form.goalsForNextPeriod}
              onChange={(e) => updateForm("goalsForNextPeriod", e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/85">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ListTodo className="h-4 w-4 text-emerald-400" />
              Key Takeaways
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="What are the most important lessons from this period?"
              value={form.keyTakeaways}
              onChange={(e) => updateForm("keyTakeaways", e.target.value)}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>
      </div>

      {/* New action items */}
      <Card className="border-border/70 bg-card/85">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CirclePlus className="h-4 w-4 text-primary" />
            Create Action Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing items */}
          {form.actionItems.length > 0 && (
            <div className="space-y-2">
              {form.actionItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                    <div className="mt-1 flex gap-1.5">
                      <Badge variant="outline" className={`text-[10px] ${ACTION_ITEM_PRIORITIES[item.priority]?.color ?? ""}`}>
                        {ACTION_ITEM_PRIORITIES[item.priority]?.label ?? "Medium"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORIES.find((c) => c.value === item.category)?.label ?? "General"}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => removeActionItem(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new */}
          <div className="rounded-2xl border border-dashed border-border/70 p-4 space-y-3">
            <Input
              placeholder="Action item title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <div className="flex items-center gap-3">
              <Select value={String(newPriority)} onValueChange={(v) => setNewPriority(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  {ACTION_ITEM_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(newCategory)} onValueChange={(v) => setNewCategory(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={String(c.value)}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()} className="ml-auto gap-1.5">
                <CirclePlus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall rating */}
      <Card className="border-border/70 bg-card/85">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Overall Period Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => updateForm("overallRating", v)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg font-bold transition-all ${
                  form.overallRating === v
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "border-border/70 bg-background/80 text-muted-foreground hover:border-primary/50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

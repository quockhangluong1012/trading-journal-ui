"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SafeHtml } from "@/components/ui/safe-html"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import {
  getDisciplineRules,
  createDisciplineRule,
  updateDisciplineRule,
  deleteDisciplineRule,
  LessonCategoryLabels,
  LessonCategory,
  type DisciplineRuleDto,
} from "@/lib/lessons-api"

export function DisciplineRulesPanel() {
  const [rules, setRules] = useState<DisciplineRuleDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<DisciplineRuleDto | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string>(String(LessonCategory.SetupDiscipline))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchRules = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await getDisciplineRules()
      setRules(res.data.value)
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void fetchRules() }, [fetchRules])

  const openCreate = () => {
    setEditingRule(null)
    setName("")
    setDescription("")
    setCategory(String(LessonCategory.SetupDiscipline))
    setIsDialogOpen(true)
  }

  const openEdit = (rule: DisciplineRuleDto) => {
    setEditingRule(rule)
    setName(rule.name)
    setDescription(rule.description ?? "")
    setCategory(String(rule.category))
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    try {
      setIsSubmitting(true)
      if (editingRule) {
        await updateDisciplineRule(editingRule.id, {
          id: editingRule.id,
          name: name.trim(),
          description: description.trim() || null,
          category: Number(category),
          isActive: editingRule.isActive,
          sortOrder: editingRule.sortOrder,
        })
        toast({ title: "Rule updated" })
      } else {
        await createDisciplineRule({
          name: name.trim(),
          description: description.trim() || null,
          category: Number(category),
          sortOrder: rules.length,
        })
        toast({ title: "Rule created" })
      }
      setIsDialogOpen(false)
      void fetchRules()
    } catch {
      toast({ title: "Error", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (rule: DisciplineRuleDto) => {
    try {
      await updateDisciplineRule(rule.id, {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        category: rule.category,
        isActive: !rule.isActive,
        sortOrder: rule.sortOrder,
      })
      void fetchRules()
    } catch {
      toast({ title: "Failed to toggle rule", variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteDisciplineRule(id)
      toast({ title: "Rule deleted" })
      void fetchRules()
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" })
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Discipline Rules</CardTitle>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Rule
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Define rules you must follow on every trade. Log your compliance in the &quot;Log&quot; tab.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No rules yet. Create rules like &quot;Always use stop loss&quot; or &quot;Wait for setup confirmation&quot;.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                  rule.isActive
                    ? "border-border/50 bg-background/50"
                    : "border-border/30 bg-muted/20 opacity-60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{rule.name}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {LessonCategoryLabels[rule.category] ?? "Other"}
                    </Badge>
                  </div>
                  {rule.description && (
                    <SafeHtml
                      html={rule.description}
                      className="text-xs text-muted-foreground line-clamp-2 [&>ul]:pl-4 [&>ul]:list-disc [&>ul]:m-0 [&>p]:m-0" 
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={rule.isActive} onCheckedChange={() => handleToggle(rule)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(rule.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "New Discipline Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="e.g., Always use stop loss" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
            </div>
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
              <Label>Description</Label>
              <Textarea placeholder="Describe the rule..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingRule ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

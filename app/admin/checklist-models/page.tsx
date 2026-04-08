"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { attachToken } from "@/lib/api";
import { ChecklistModelDto, ChecklistModelDetailDto, getChecklistModels, getChecklistModelDetail, createChecklistModel, updateChecklistModel, addCriteriaToModel, ChecklistTypeLabels, ChecklistTypeColors } from "@/lib/admin-api";
import { SectionHeader, TableSkeleton, EmptyState } from "../components/shared";

export default function ChecklistModelsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistModelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<ChecklistModelDto | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  // Expanded model detail
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<ChecklistModelDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add criteria
  const [showCriteriaDialog, setShowCriteriaDialog] = useState(false);
  const [criteriaModelId, setCriteriaModelId] = useState<number | null>(null);
  const [criteriaForm, setCriteriaForm] = useState({ name: "", type: "1" });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      attachToken();
      const res = await getChecklistModels();
      if (res.data.isSuccess) setItems(res.data.value);
    } catch {
      toast({ title: "Error", description: "Failed to load models", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailData(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      attachToken();
      const res = await getChecklistModelDetail(id);
      if (res.data.isSuccess) setDetailData(res.data.value);
    } catch {
      toast({ title: "Error", description: "Failed to load model detail", variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: "", description: "" });
    setShowDialog(true);
  };

  const openEdit = (item: ChecklistModelDto) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || "" });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      attachToken();
      if (editItem) {
        await updateChecklistModel({ id: editItem.id, ...form });
        toast({ title: "Updated", description: `"${form.name}" updated.` });
      } else {
        await createChecklistModel(form);
        toast({ title: "Created", description: `"${form.name}" created.` });
      }
      setShowDialog(false);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openAddCriteria = (modelId: number) => {
    setCriteriaModelId(modelId);
    setCriteriaForm({ name: "", type: "1" });
    setShowCriteriaDialog(true);
  };

  const handleAddCriteria = async () => {
    if (!criteriaModelId || !criteriaForm.name.trim()) return;
    setSaving(true);
    try {
      attachToken();
      await addCriteriaToModel(criteriaModelId, { name: criteriaForm.name, type: Number(criteriaForm.type) });
      toast({ title: "Added", description: `Criteria "${criteriaForm.name}" added.` });
      setShowCriteriaDialog(false);
      // Refresh detail
      if (expandedId === criteriaModelId) {
        const res = await getChecklistModelDetail(criteriaModelId);
        if (res.data.isSuccess) setDetailData(res.data.value);
      }
      load();
    } catch {
      toast({ title: "Error", description: "Failed to add criteria", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Checklist Models"
        description="Pre-trade checklist templates with configurable criteria."
        count={items.length}
        onAdd={openCreate}
        searchValue={search}
        onSearchChange={setSearch}
      />

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 && items.length === 0 ? (
        <EmptyState title="No checklist models yet" action={openCreate} />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden transition-all duration-200">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === item.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs tabular-nums">
                    {item.criteriaCount} criteria
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); openAddCriteria(item.id); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {expandedId === item.id && (
                <div className="border-t border-border bg-muted/10 px-4 py-3">
                  {detailLoading ? (
                    <TableSkeleton rows={2} />
                  ) : detailData && detailData.criteria.length > 0 ? (
                    <div className="space-y-1.5">
                      {detailData.criteria.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-md bg-background/50 px-3 py-2 text-sm">
                          <span>{c.name}</span>
                          <Badge variant="outline" className={`text-xs border ${ChecklistTypeColors[c.checkListType] || ""}`}>
                            {ChecklistTypeLabels[c.checkListType] || "Unknown"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No criteria yet. Click + to add one.</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Model Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit" : "New"} Checklist Model</DialogTitle>
            <DialogDescription>{editItem ? "Update model details." : "Create a new checklist template."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input placeholder="e.g. SMC Entry Model" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea placeholder="Optional description…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Criteria Dialog */}
      <Dialog open={showCriteriaDialog} onOpenChange={setShowCriteriaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Criteria</DialogTitle>
            <DialogDescription>Add a new criteria item to this checklist model.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input
                placeholder="e.g. Check trend direction"
                value={criteriaForm.name}
                onChange={(e) => setCriteriaForm({ ...criteriaForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Type</label>
              <Select value={criteriaForm.type} onValueChange={(v) => setCriteriaForm({ ...criteriaForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Market Structure</SelectItem>
                  <SelectItem value="2">Trading Setup</SelectItem>
                  <SelectItem value="3">Risk Management</SelectItem>
                  <SelectItem value="4">Psychology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCriteriaDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCriteria} disabled={saving || !criteriaForm.name.trim()}>
              {saving ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

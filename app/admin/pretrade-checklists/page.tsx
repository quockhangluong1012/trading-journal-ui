"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { attachToken } from "@/lib/api";
import { PretradeChecklistDto, getPretradeChecklists, createPretradeChecklist, updatePretradeChecklist, deletePretradeChecklist, ChecklistTypeLabels, ChecklistTypeColors } from "@/lib/admin-api";
import { SectionHeader, TableSkeleton, EmptyState } from "../components/shared";

export default function PretradeChecklistsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<PretradeChecklistDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<PretradeChecklistDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PretradeChecklistDto | null>(null);
  const [form, setForm] = useState({ name: "", type: "1" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      attachToken();
      const res = await getPretradeChecklists();
      if (res.data.isSuccess) setItems(res.data.value);
    } catch {
      toast({ title: "Error", description: "Failed to load checklists", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: "", type: "1" });
    setShowDialog(true);
  };

  const openEdit = (item: PretradeChecklistDto) => {
    setEditItem(item);
    setForm({ name: item.name, type: item.checkListType.toString() });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      attachToken();
      if (editItem) {
        await updatePretradeChecklist({ id: editItem.id, name: form.name, type: Number(form.type) });
        toast({ title: "Updated", description: `"${form.name}" updated.` });
      } else {
        await createPretradeChecklist({ name: form.name, type: Number(form.type) });
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      attachToken();
      await deletePretradeChecklist(deleteTarget.id);
      toast({ title: "Deleted", description: `"${deleteTarget.name}" removed.` });
      setDeleteTarget(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Pretrade Checklists"
        description="Individual checklist items to verify before entering a trade."
        count={items.length}
        onAdd={openCreate}
        searchValue={search}
        onSearchChange={setSearch}
      />

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 && items.length === 0 ? (
        <EmptyState title="No pretrade checklists yet" action={openCreate} />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-16 text-xs uppercase tracking-wider">ID</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                <TableHead className="w-24 text-right text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell className="text-muted-foreground tabular-nums text-sm">{item.id}</TableCell>
                  <TableCell className="font-medium text-sm">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs border ${ChecklistTypeColors[item.checkListType] || ""}`}>
                      {ChecklistTypeLabels[item.checkListType] || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit" : "New"} Pretrade Checklist</DialogTitle>
            <DialogDescription>{editItem ? "Update checklist details." : "Add a new pre-trade verification item."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input
                placeholder="e.g. Confirm trend alignment"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Type</label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
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
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

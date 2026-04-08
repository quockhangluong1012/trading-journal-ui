"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { attachToken } from "@/lib/api";
import { EmotionTagDto, getEmotionTags, createEmotionTag, deleteEmotionTag, EmotionTypeLabels, EmotionTypeColors } from "@/lib/admin-api";
import { SectionHeader, TableSkeleton, EmptyState } from "../components/shared";

export default function EmotionsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<EmotionTagDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmotionTagDto | null>(null);
  const [form, setForm] = useState({ name: "", emotionType: "1" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      attachToken();
      const res = await getEmotionTags();
      if (res.data.isSuccess) setItems(res.data.value);
    } catch {
      toast({ title: "Error", description: "Failed to load emotion tags", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      attachToken();
      await createEmotionTag({ name: form.name, emotionType: Number(form.emotionType) });
      toast({ title: "Created", description: `Emotion tag "${form.name}" created.` });
      setShowCreateDialog(false);
      setForm({ name: "", emotionType: "1" });
      load();
    } catch {
      toast({ title: "Error", description: "Failed to create emotion tag", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      attachToken();
      await deleteEmotionTag(deleteTarget.id);
      toast({ title: "Deleted", description: `"${deleteTarget.name}" removed.` });
      setDeleteTarget(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete emotion tag", variant: "destructive" });
    }
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Emotion Tags"
        description="Tags to describe your emotional state during trades."
        count={items.length}
        onAdd={() => setShowCreateDialog(true)}
        searchValue={search}
        onSearchChange={setSearch}
      />

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 && items.length === 0 ? (
        <EmptyState title="No emotion tags yet" action={() => setShowCreateDialog(true)} />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-16 text-xs uppercase tracking-wider">ID</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                <TableHead className="w-20 text-right text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell className="text-muted-foreground tabular-nums text-sm">{item.id}</TableCell>
                  <TableCell className="font-medium text-sm">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs border ${EmotionTypeColors[item.emotionType] || ""}`}>
                      {EmotionTypeLabels[item.emotionType] || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Emotion Tag</DialogTitle>
            <DialogDescription>Add a tag to describe emotional states during trades.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input
                placeholder="e.g. Confident, Anxious…"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Type</label>
              <Select value={form.emotionType} onValueChange={(v) => setForm({ ...form, emotionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Positive</SelectItem>
                  <SelectItem value="2">Negative</SelectItem>
                  <SelectItem value="3">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The emotion tag will be permanently removed.</AlertDialogDescription>
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

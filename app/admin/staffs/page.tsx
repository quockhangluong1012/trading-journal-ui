"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { attachToken } from "@/lib/api";
import { StaffDto, getStaffs, createStaff, updateStaff, deleteStaff } from "@/lib/admin-api";
import { SectionHeader, TableSkeleton, EmptyState } from "../components/shared";

export default function StaffsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<StaffDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<StaffDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffDto | null>(null);
  
  const [form, setForm] = useState({ fullName: "", email: "", password: "", isActive: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      attachToken();
      const res = await getStaffs();
      if (res.data.isSuccess) setItems(res.data.value);
    } catch {
      toast({ title: "Error", description: "Failed to load staff", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ fullName: "", email: "", password: "", isActive: true });
    setShowDialog(true);
  };

  const openEdit = (item: StaffDto) => {
    setEditItem(item);
    setForm({ fullName: item.fullName, email: item.email, password: "", isActive: item.isActive });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim() || (!editItem && !form.email.trim())) return;
    setSaving(true);
    try {
      attachToken();
      if (editItem) {
        await updateStaff({ id: editItem.id, fullName: form.fullName, password: form.password, isActive: form.isActive });
        toast({ title: "Updated", description: `"${form.fullName}" updated.` });
      } else {
        await createStaff(form);
        toast({ title: "Created", description: `"${form.fullName}" created.` });
      }
      setShowDialog(false);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to save staff member", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      attachToken();
      await deleteStaff(deleteTarget.id);
      toast({ title: "Deleted", description: `"${deleteTarget.fullName}" removed.` });
      setDeleteTarget(null);
      load();
    } catch {
      toast({ title: "Error", description: "Failed to delete staff member", variant: "destructive" });
    }
  };

  const filtered = items.filter((i) => i.fullName.toLowerCase().includes(search.toLowerCase()) || i.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Staff Management"
        description="Manage administrative users capable of accessing this portal."
        count={items.length}
        onAdd={openCreate}
        searchValue={search}
        onSearchChange={setSearch}
      />

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 && items.length === 0 ? (
        <EmptyState title="No staff members found" action={openCreate} />
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-16 text-xs uppercase tracking-wider">ID</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-24 text-right text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell className="text-muted-foreground tabular-nums text-sm">{item.id}</TableCell>
                  <TableCell className="font-medium text-sm">{item.fullName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.email}</TableCell>
                  <TableCell>
                    {item.isActive ? (
                      <Badge variant="outline" className="text-emerald-400 bg-emerald-400/10 border-emerald-400/20 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 bg-slate-400/10 border-slate-400/20 text-xs">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)}>
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
            <DialogTitle>{editItem ? "Edit" : "New"} Staff Member</DialogTitle>
            <DialogDescription>{editItem ? "Update staff member details." : "Create a new admin user."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name *</label>
              <Input placeholder="e.g. Jane Doe" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email *</label>
              <Input disabled={!!editItem} placeholder="e.g. admin@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password {editItem && "(Leave empty to keep current)"}</label>
              <Input type="password" placeholder="Passphrase" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            {editItem && (
               <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({...form, isActive: e.target.checked})} />
                  <label htmlFor="isActive" className="text-sm font-medium text-foreground">Is Active Account</label>
               </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.fullName.trim()}>
              {saving ? "Saving…" : editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.fullName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This admin will lose all access.</AlertDialogDescription>
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ClipboardCheck, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { attachToken } from "@/lib/api";
import {
  CHECKLIST_TYPE_OPTIONS,
  ChecklistModelDetailDto,
  ChecklistModelDto,
  ChecklistTypeColors,
  ChecklistTypeLabels,
  PretradeChecklistDto,
  createChecklistModel,
  createPretradeChecklist,
  deletePretradeChecklist,
  getChecklistModelDetail,
  getChecklistModels,
  updateChecklistModel,
  updatePretradeChecklist,
} from "@/lib/pretrade-models-api";

type ModelFormState = {
  name: string;
  description: string;
};

type ChecklistFormState = {
  name: string;
  type: string;
  checklistModelId: string;
};

const EMPTY_MODEL_FORM: ModelFormState = {
  name: "",
  description: "",
};

const EMPTY_CHECKLIST_FORM: ChecklistFormState = {
  name: "",
  type: "1",
  checklistModelId: "",
};

export function PretradeModelManager() {
  const { toast } = useToast();
  const detailRequestRef = useRef(0);
  const [models, setModels] = useState<ChecklistModelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedModelId, setExpandedModelId] = useState<number | null>(null);
  const [expandedModelDetail, setExpandedModelDetail] = useState<ChecklistModelDetailDto | null>(null);
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [editingModel, setEditingModel] = useState<ChecklistModelDto | null>(null);
  const [editingChecklist, setEditingChecklist] = useState<PretradeChecklistDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PretradeChecklistDto | null>(null);
  const [modelForm, setModelForm] = useState<ModelFormState>(EMPTY_MODEL_FORM);
  const [checklistForm, setChecklistForm] = useState<ChecklistFormState>(EMPTY_CHECKLIST_FORM);

  const loadModels = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      attachToken();

      const response = await getChecklistModels();

      if (response.data.isSuccess) {
        setModels(response.data.value);
        setExpandedModelId((currentExpandedModelId) => {
          if (currentExpandedModelId !== null && !response.data.value.some((model) => model.id === currentExpandedModelId)) {
            setExpandedModelDetail(null);
            return null;
          }

          return currentExpandedModelId;
        });
      }
    } catch {
      toast({
        title: "Unable to load pre-trade models",
        description: "Refresh the page and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadModelDetail = useCallback(async (modelId: number): Promise<void> => {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;

    try {
      setDetailLoading(true);
      setExpandedModelId(modelId);
      setExpandedModelDetail(null);
      attachToken();

      const response = await getChecklistModelDetail(modelId);

      if (response.data.isSuccess && requestId === detailRequestRef.current) {
        setExpandedModelDetail(response.data.value);
      }
    } catch {
      if (requestId === detailRequestRef.current) {
        toast({
          title: "Unable to load checklist items",
          description: "Try opening the model again.",
          variant: "destructive",
        });
      }
    } finally {
      if (requestId === detailRequestRef.current) {
        setDetailLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const filteredModels = models.filter((model) => {
    const searchableText = `${model.name} ${model.description ?? ""}`.toLowerCase();
    return searchableText.includes(search.trim().toLowerCase());
  });

  const toggleModel = async (modelId: number): Promise<void> => {
    if (expandedModelId === modelId) {
      detailRequestRef.current += 1;
      setDetailLoading(false);
      setExpandedModelId(null);
      setExpandedModelDetail(null);
      return;
    }

    await loadModelDetail(modelId);
  };

  const openCreateModelDialog = (): void => {
    setEditingModel(null);
    setModelForm(EMPTY_MODEL_FORM);
    setShowModelDialog(true);
  };

  const openEditModelDialog = (model: ChecklistModelDto): void => {
    setEditingModel(model);
    setModelForm({
      name: model.name,
      description: model.description ?? "",
    });
    setShowModelDialog(true);
  };

  const openCreateChecklistDialog = (modelId: number): void => {
    setEditingChecklist(null);
    setChecklistForm({
      ...EMPTY_CHECKLIST_FORM,
      checklistModelId: modelId.toString(),
    });
    setShowChecklistDialog(true);
  };

  const openEditChecklistDialog = (checklist: PretradeChecklistDto): void => {
    setEditingChecklist(checklist);
    setChecklistForm({
      name: checklist.name,
      type: checklist.checkListType.toString(),
      checklistModelId: checklist.checklistModelId.toString(),
    });
    setShowChecklistDialog(true);
  };

  const handleSaveModel = async (): Promise<void> => {
    if (!modelForm.name.trim()) {
      return;
    }

    try {
      setSaving(true);
      attachToken();

      if (editingModel) {
        await updateChecklistModel({
          id: editingModel.id,
          name: modelForm.name.trim(),
          description: modelForm.description.trim() || null,
        });

        toast({
          title: "Model updated",
          description: `"${modelForm.name.trim()}" is ready to use in trade entry.`,
        });
      } else {
        await createChecklistModel({
          name: modelForm.name.trim(),
          description: modelForm.description.trim() || null,
        });

        toast({
          title: "Model created",
          description: `"${modelForm.name.trim()}" is now available in your trade form.`,
        });
      }

      setShowModelDialog(false);
      await loadModels();

      if (expandedModelId !== null && editingModel?.id === expandedModelId) {
        await loadModelDetail(expandedModelId);
      }
    } catch {
      toast({
        title: "Unable to save model",
        description: "Check the form and try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChecklist = async (): Promise<void> => {
    if (!checklistForm.name.trim() || !checklistForm.checklistModelId) {
      return;
    }

    const checklistPayload = {
      name: checklistForm.name.trim(),
      type: Number(checklistForm.type),
      checklistModelId: Number(checklistForm.checklistModelId),
    };

    try {
      setSaving(true);
      attachToken();

      if (editingChecklist) {
        await updatePretradeChecklist({
          id: editingChecklist.id,
          ...checklistPayload,
        });

        toast({
          title: "Checklist item updated",
          description: `"${checklistPayload.name}" has been saved.`,
        });
      } else {
        await createPretradeChecklist(checklistPayload);

        toast({
          title: "Checklist item created",
          description: `"${checklistPayload.name}" is ready for your next trade.`,
        });
      }

      setShowChecklistDialog(false);

      const currentExpandedModelId = expandedModelId;
      await loadModels();

      if (currentExpandedModelId !== null) {
        await loadModelDetail(currentExpandedModelId);
      }
    } catch {
      toast({
        title: "Unable to save checklist item",
        description: "Check the model selection and try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChecklist = async (): Promise<void> => {
    if (!deleteTarget) {
      return;
    }

    try {
      setSaving(true);
      attachToken();

      await deletePretradeChecklist(deleteTarget.id);
      setDeleteTarget(null);

      toast({
        title: "Checklist item deleted",
        description: "The item has been removed from your model.",
      });

      const currentExpandedModelId = expandedModelId;
      await loadModels();

      if (currentExpandedModelId !== null) {
        await loadModelDetail(currentExpandedModelId);
      }
    } catch {
      toast({
        title: "Unable to delete checklist item",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="w-fit border-primary/25 bg-primary/5 text-primary">
              Private to your account
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Pre-trade Models</h1>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Build the checklist templates you want to review before entering a trade. Every model and checklist item here is user-specific and feeds directly into the trade entry flow.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:min-w-72 lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your models"
                className="pl-9"
              />
            </div>

            <Button className="gap-2" onClick={openCreateModelDialog}>
              <Plus className="h-4 w-4" />
              New model
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-border bg-card">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : filteredModels.length === 0 ? (
        <Card className="rounded-3xl border border-dashed border-border/80 bg-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {models.length === 0 ? "No pre-trade models yet" : "No models match your search"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {models.length === 0
              ? "Create your first private checklist model so every trade starts with the same decision standard."
              : "Try a different search term or create a new model."}
          </p>
          <div className="mt-6">
            <Button className="gap-2" onClick={openCreateModelDialog}>
              <Plus className="h-4 w-4" />
              Create model
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredModels.map((model) => {
            const isExpanded = expandedModelId === model.id;
            const detail = isExpanded ? expandedModelDetail : null;

            return (
              <Card key={model.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <button
                    type="button"
                    className="flex flex-1 items-start gap-3 text-left"
                    onClick={() => void toggleModel(model.id)}
                  >
                    <div className="mt-1 text-muted-foreground">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground">{model.name}</h2>
                        <Badge variant="secondary" className="tabular-nums">
                          {model.criteriaCount} items
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {model.description || "No description yet. Add context so you can quickly choose the right model before a trade."}
                      </p>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => openCreateChecklistDialog(model.id)}>
                      <Plus className="h-4 w-4" />
                      Add item
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditModelDialog(model)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/15 px-5 py-4">
                    {detailLoading ? (
                      <div className="flex min-h-28 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : detail && detail.criteria.length > 0 ? (
                      <div className="space-y-3">
                        {detail.criteria.map((checklist) => (
                          <div
                            key={checklist.id}
                            className="flex flex-col gap-3 rounded-2xl border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{checklist.name}</p>
                                <Badge
                                  variant="outline"
                                  className={`border ${ChecklistTypeColors[checklist.checkListType] || ""}`}
                                >
                                  {ChecklistTypeLabels[checklist.checkListType] || "Unknown"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Used in your trade-entry checklist whenever this model is selected.
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditChecklistDialog(checklist)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(checklist)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-center">
                        <p className="text-sm font-medium text-foreground">No checklist items yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Add the rules you want to confirm before taking a trade.
                        </p>
                        <Button className="mt-4 gap-2" variant="outline" onClick={() => openCreateChecklistDialog(model.id)}>
                          <Plus className="h-4 w-4" />
                          Add first item
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingModel ? "Edit model" : "Create pre-trade model"}</DialogTitle>
            <DialogDescription>
              {editingModel
                ? "Update the model name and description shown in your trade flow."
                : "Create a private checklist model that you can select before entering a trade."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Model name</label>
              <Input
                value={modelForm.name}
                onChange={(event) => setModelForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Opening range breakout"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={modelForm.description}
                onChange={(event) => setModelForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Capture when this model should be used and what it protects you from."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModelDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveModel()} disabled={saving || !modelForm.name.trim()}>
              {saving ? "Saving..." : editingModel ? "Save changes" : "Create model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingChecklist ? "Edit checklist item" : "Add checklist item"}</DialogTitle>
            <DialogDescription>
              Checklist items stay attached to one of your models and appear in the trade-entry checklist.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Item name</label>
              <Input
                value={checklistForm.name}
                onChange={(event) => setChecklistForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Session bias is aligned with higher-timeframe trend"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <Select
                  value={checklistForm.type}
                  onValueChange={(value) => setChecklistForm((current) => ({ ...current, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHECKLIST_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Model</label>
                <Select
                  value={checklistForm.checklistModelId}
                  onValueChange={(value) => setChecklistForm((current) => ({ ...current, checklistModelId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id.toString()}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChecklistDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveChecklist()}
              disabled={saving || !checklistForm.name.trim() || !checklistForm.checklistModelId}
            >
              {saving ? "Saving..." : editingChecklist ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete checklist item?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" will be removed from ${deleteTarget.checklistModelName}. If past trades already reference it, deletion will be blocked to preserve that history.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDeleteChecklist()}
            >
              Delete item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
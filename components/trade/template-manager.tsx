"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Copy,
  Edit3,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { TechnicalAnalysisTagApi, TradingZoneApi } from "@/components/create-trade-page"
import { api, type ApiResponse } from "@/lib/api"
import { PositionType } from "@/lib/enum/PositionType"
import { getTradingSetups, type TradingSetupSummaryDto } from "@/lib/setup-api"
import { cn } from "@/lib/utils"
import {
  type TradeTemplateDto,
  type CreateTemplateRequest,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/template-api"

// ─── Template Form ─────────────────────────────────────────────────────

interface TemplateFormData {
  name: string
  description: string
  asset: string
  position: string
  tradingZoneId: string
  tradingSetupId: string
  defaultTechnicalAnalysisTagIds: string[]
  defaultConfidenceLevel: string
  defaultNotes: string
  isFavorite: boolean
}

function createEmptyForm(): TemplateFormData {
  return {
    name: "",
    description: "",
    asset: "",
    position: "",
    tradingZoneId: "",
    tradingSetupId: "",
    defaultTechnicalAnalysisTagIds: [],
    defaultConfidenceLevel: "",
    defaultNotes: "",
    isFavorite: false,
  }
}

function fromDto(dto: TradeTemplateDto): TemplateFormData {
  return {
    name: dto.name,
    description: dto.description ?? "",
    asset: dto.asset ?? "",
    position: dto.position != null ? String(dto.position) : "",
    tradingZoneId: dto.tradingZoneId != null ? String(dto.tradingZoneId) : "",
    tradingSetupId: dto.tradingSetupId != null ? String(dto.tradingSetupId) : "",
    defaultTechnicalAnalysisTagIds: dto.defaultTechnicalAnalysisTagIds?.map(String) ?? [],
    defaultConfidenceLevel: dto.defaultConfidenceLevel != null ? String(dto.defaultConfidenceLevel) : "",
    defaultNotes: dto.defaultNotes ?? "",
    isFavorite: dto.isFavorite,
  }
}

function toRequest(form: TemplateFormData): CreateTemplateRequest {
  const parseInt = (v: string) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? n : null }
  const technicalAnalysisTagIds = form.defaultTechnicalAnalysisTagIds.reduce<number[]>((ids, value) => {
    const parsed = Number.parseInt(value, 10)

    if (Number.isFinite(parsed)) {
      ids.push(parsed)
    }

    return ids
  }, [])

  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    asset: form.asset.trim().toUpperCase() || null,
    position: parseInt(form.position),
    tradingZoneId: parseInt(form.tradingZoneId),
    tradingSessionId: null,
    tradingSetupId: parseInt(form.tradingSetupId),
    defaultStopLoss: null,
    defaultTargetTier1: null,
    defaultTargetTier2: null,
    defaultTargetTier3: null,
    defaultConfidenceLevel: parseInt(form.defaultConfidenceLevel),
    defaultNotes: form.defaultNotes.trim() || null,
    defaultChecklistIds: null,
    defaultEmotionTagIds: null,
    defaultTechnicalAnalysisTagIds: technicalAnalysisTagIds.length > 0 ? technicalAnalysisTagIds : null,
    isFavorite: form.isFavorite,
  }
}

const confidenceLevels = [
  { value: "1", label: "Very Low" },
  { value: "2", label: "Low" },
  { value: "3", label: "Neutral" },
  { value: "4", label: "High" },
  { value: "5", label: "Very High" },
]

// ─── Template Form Dialog ──────────────────────────────────────────────

function TemplateFormDialog({
  open,
  onOpenChange,
  editingTemplate,
  prefillTemplate,
  zones,
  setupOptions,
  technicalAnalysisTags,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingTemplate: TradeTemplateDto | null
  prefillTemplate: TradeTemplateDto | null
  zones: TradingZoneApi[]
  setupOptions: TradingSetupSummaryDto[]
  technicalAnalysisTags: TechnicalAnalysisTagApi[]
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<TemplateFormData>(() => createEmptyForm())
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        editingTemplate
          ? fromDto(editingTemplate)
          : prefillTemplate
            ? fromDto(prefillTemplate)
            : createEmptyForm(),
      )
    }
  }, [open, editingTemplate, prefillTemplate])

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Name required", description: "Give your template a memorable name." })
      return
    }
    setIsSaving(true)
    try {
      const req = toRequest(form)
      if (editingTemplate) {
        await updateTemplate({ ...req, id: editingTemplate.id })
        toast({ title: "Template updated", description: `"${form.name}" has been saved.` })
      } else {
        await createTemplate(req)
        toast({ title: "Template created", description: `"${form.name}" is ready to use.` })
      }
      onSaved()
      onOpenChange(false)
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not save the template. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  const patch = <K extends keyof TemplateFormData>(field: K, value: TemplateFormData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleTechnicalAnalysisTag = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      defaultTechnicalAnalysisTagIds: prev.defaultTechnicalAnalysisTagIds.includes(tagId)
        ? prev.defaultTechnicalAnalysisTagIds.filter((value) => value !== tagId)
        : [...prev.defaultTechnicalAnalysisTagIds, tagId],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {editingTemplate ? "Edit Template" : "New Template"}
          </DialogTitle>
          <DialogDescription>
            Pre-fill common trade fields so you can enter trades faster during live sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          {/* Name & Description */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder='e.g. "EURUSD London OB Long"'
                value={form.name}
                onChange={(e) => patch("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Input
                id="template-description"
                placeholder="When to use this template"
                value={form.description}
                onChange={(e) => patch("description", e.target.value)}
              />
            </div>
          </div>

          {/* Asset & Direction */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="template-asset">Asset</Label>
              <Input
                id="template-asset"
                placeholder="EURUSD, BTCUSD..."
                value={form.asset}
                onChange={(e) => patch("asset", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-position">Direction</Label>
              <Select value={form.position} onValueChange={(v) => patch("position", v)}>
                <SelectTrigger id="template-position">
                  <SelectValue placeholder="Any direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Long</SelectItem>
                  <SelectItem value="1">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-zone">Trading Zone</Label>
              <Select value={form.tradingZoneId} onValueChange={(v) => patch("tradingZoneId", v)}>
                <SelectTrigger id="template-zone">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-setup">Linked Setup</Label>
              <Select value={form.tradingSetupId} onValueChange={(value) => patch("tradingSetupId", value)}>
                <SelectTrigger id="template-setup">
                  <SelectValue placeholder="Select a setup" />
                </SelectTrigger>
                <SelectContent>
                  {setupOptions.map((setup) => (
                    <SelectItem key={setup.id} value={String(setup.id)}>{setup.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-confidence">Confidence Level</Label>
              <Select value={form.defaultConfidenceLevel} onValueChange={(v) => patch("defaultConfidenceLevel", v)}>
                <SelectTrigger id="template-confidence">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {confidenceLevels.map((cl) => (
                    <SelectItem key={cl.value} value={cl.value}>{cl.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <fieldset className="space-y-3">
            <div>
              <legend className="text-sm font-medium text-foreground">Technical Analysis Tags</legend>
              <p id="template-technical-tags-description" className="mt-1 text-xs text-muted-foreground">
                Pick the structural confirmations that make this template valid.
              </p>
            </div>

            {technicalAnalysisTags.length > 0 ? (
              <div className="flex flex-wrap gap-2" aria-describedby="template-technical-tags-description">
                {technicalAnalysisTags.map((tag) => {
                  const isSelected = form.defaultTechnicalAnalysisTagIds.includes(String(tag.id))

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-label={`${isSelected ? "Remove" : "Add"} ${tag.name} technical analysis tag`}
                      aria-pressed={isSelected}
                      onClick={() => toggleTechnicalAnalysisTag(String(tag.id))}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)]",
                        isSelected
                          ? "border-primary/50 bg-primary/20 text-primary ring-2 ring-primary/30 shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                          : "border-white/10 bg-background/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
                      )}
                      title={tag.description || undefined}
                    >
                      {tag.name}
                      {tag.shortName ? ` (${tag.shortName})` : ""}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                No technical analysis tags available yet.
              </div>
            )}
          </fieldset>

          <div className="flex items-end">
            <Button
              type="button"
              variant={form.isFavorite ? "default" : "outline"}
              className="w-full gap-2 sm:w-auto"
              onClick={() => patch("isFavorite", !form.isFavorite)}
            >
              <Star className={cn("h-4 w-4", form.isFavorite && "fill-current")} />
              {form.isFavorite ? "Favorited" : "Mark as Favorite"}
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="template-notes">Default Notes</Label>
            <Textarea
              id="template-notes"
              placeholder="Pre-filled notes when using this template..."
              className="min-h-20"
              value={form.defaultNotes}
              onChange={(e) => patch("defaultNotes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingTemplate ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Template Card ─────────────────────────────────────────────────────

function TemplateCard({
  template,
  setupName,
  technicalAnalysisTagCount,
  onEdit,
  onDelete,
  onDuplicate,
  onUse,
}: {
  template: TradeTemplateDto
  setupName: string | null
  technicalAnalysisTagCount: number
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onUse: () => void
}) {
  const positionLabel = template.position === PositionType.Long ? "Long" : template.position === PositionType.Short ? "Short" : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        {/* Favorite indicator */}
        {template.isFavorite && (
          <div className="absolute right-3 top-3">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base font-semibold">{template.name}</CardTitle>
              {template.description && (
                <CardDescription className="mt-1 line-clamp-2 text-xs">
                  {template.description}
                </CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onUse} className="gap-2">
                  <Zap className="h-4 w-4" /> Use Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit} className="gap-2">
                  <Edit3 className="h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate} className="gap-2">
                  <Copy className="h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5">
            {template.asset && (
              <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-xs font-medium text-primary">
                {template.asset}
              </Badge>
            )}
            {positionLabel && (
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full text-xs font-medium",
                  template.position === PositionType.Long
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
                    : "border-red-500/20 bg-red-500/5 text-red-500",
                )}
              >
                {template.position === PositionType.Long ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {positionLabel}
              </Badge>
            )}
            {template.tradingZoneName && (
              <Badge variant="secondary" className="rounded-full text-xs">
                {template.tradingZoneName}
              </Badge>
            )}
            {setupName && (
              <Badge variant="outline" className="rounded-full border-sky-500/20 bg-sky-500/5 text-xs font-medium text-sky-500">
                {setupName}
              </Badge>
            )}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/30 bg-muted/30 p-2.5 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Setup</p>
              <p
                className={cn("truncate text-sm font-semibold", !setupName && "text-muted-foreground")}
                title={setupName ?? undefined}
              >
                {setupName ?? "None"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tags</p>
              <p className="text-sm font-semibold text-foreground">{technicalAnalysisTagCount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Uses</p>
              <p className="text-sm font-semibold text-primary">{template.usageCount}</p>
            </div>
          </div>

          {/* Use button */}
          <Button
            onClick={onUse}
            className="w-full gap-2 rounded-xl"
            size="sm"
          >
            <Zap className="h-3.5 w-3.5" />
            Quick Trade
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────

export function TemplateManager({ onUseTemplate }: { onUseTemplate?: (template: TradeTemplateDto) => void }) {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<TradeTemplateDto[]>([])
  const [zones, setZones] = useState<TradingZoneApi[]>([])
  const [setupOptions, setSetupOptions] = useState<TradingSetupSummaryDto[]>([])
  const [technicalAnalysisTags, setTechnicalAnalysisTags] = useState<TechnicalAnalysisTagApi[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TradeTemplateDto | null>(null)
  const [prefillTemplate, setPrefillTemplate] = useState<TradeTemplateDto | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<TradeTemplateDto | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [tplRes, zoneRes, setupRes, technicalTagRes] = await Promise.allSettled([
        getTemplates(),
        api.get<ApiResponse<TradingZoneApi[]>>("/v1/trading-zones"),
        getTradingSetups(),
        api.get<ApiResponse<TechnicalAnalysisTagApi[]>>("/v1/technical-analysis"),
      ])
      const failedResources: string[] = []

      if (tplRes.status === "fulfilled" && tplRes.value.data.isSuccess) {
        setTemplates(tplRes.value.data.value)
      } else {
        failedResources.push("templates")
      }

      if (zoneRes.status === "fulfilled" && zoneRes.value.data.isSuccess) {
        setZones(zoneRes.value.data.value)
      } else {
        failedResources.push("trading zones")
      }

      if (setupRes.status === "fulfilled" && setupRes.value.data.isSuccess) {
        setSetupOptions(setupRes.value.data.value)
      } else {
        failedResources.push("setups")
      }

      if (technicalTagRes.status === "fulfilled" && technicalTagRes.value.data.isSuccess) {
        setTechnicalAnalysisTags(technicalTagRes.value.data.value)
      } else {
        failedResources.push("technical analysis tags")
      }

      if (failedResources.length > 0) {
        toast({
          variant: "destructive",
          title: "Some template data failed to load",
          description: `Could not load ${failedResources.join(", ")}.`,
        })
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to load templates." })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  const filtered = templates.filter((t) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      t.name.toLowerCase().includes(q) ||
      t.asset?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    )
  })

  const handleEdit = (tpl: TradeTemplateDto) => {
    setPrefillTemplate(null)
    setEditingTemplate(tpl)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setPrefillTemplate(null)
    setDialogOpen(true)
  }

  const handleDuplicate = (tpl: TradeTemplateDto) => {
    setEditingTemplate(null)
    setPrefillTemplate({
      ...tpl,
      name: `${tpl.name} (Copy)`,
    })
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setDialogOpen(nextOpen)

    if (!nextOpen) {
      setEditingTemplate(null)
      setPrefillTemplate(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      await deleteTemplate(deleteConfirm.id)
      toast({ title: "Deleted", description: `"${deleteConfirm.name}" has been removed.` })
      setDeleteConfirm(null)
      void load()
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not delete the template." })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUse = (tpl: TradeTemplateDto) => {
    onUseTemplate?.(tpl)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="template-search"
            placeholder="Search templates..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={handleCreate} className="gap-2 rounded-full shadow-sm shadow-primary/25">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50">
              <CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="mt-2 h-3 w-60" /></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-12 rounded-full" /></div>
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-8 rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-muted/20 py-16 text-center backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {searchQuery ? "No templates found" : "No templates yet"}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {searchQuery
              ? "Try a different search term."
              : "Create your first template to speed up trade entry during fast-moving sessions."}
          </p>
          {!searchQuery && (
            <Button onClick={handleCreate} className="mt-6 gap-2 rounded-full">
              <Plus className="h-4 w-4" /> Create Template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((tpl) => {
              const setupName = tpl.tradingSetupId != null
                ? setupOptions.find((setup) => setup.id === tpl.tradingSetupId)?.name ?? null
                : null

              return (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  setupName={setupName}
                  technicalAnalysisTagCount={tpl.defaultTechnicalAnalysisTagIds?.length ?? 0}
                  onEdit={() => handleEdit(tpl)}
                  onDelete={() => setDeleteConfirm(tpl)}
                  onDuplicate={() => handleDuplicate(tpl)}
                  onUse={() => handleUse(tpl)}
                />
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Form dialog */}
      <TemplateFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        editingTemplate={editingTemplate}
        prefillTemplate={prefillTemplate}
        zones={zones}
        setupOptions={setupOptions}
        technicalAnalysisTags={technicalAnalysisTags}
        onSaved={() => void load()}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-2">
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Copy,
  Edit3,
  FileText,
  Heart,
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
import { formatTradePrice, TRADE_PRICE_INPUT_STEP } from "@/lib/trade-price-format"
import { cn } from "@/lib/utils"
import {
  type TradeTemplateDto,
  type CreateTemplateRequest,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/template-api"
import { PositionType } from "@/lib/enum/PositionType"
import { api, ApiResponse } from "@/lib/api"
import { TradingZoneApi } from "@/components/create-trade-page"

// ─── Template Form ─────────────────────────────────────────────────────

interface TemplateFormData {
  name: string
  description: string
  asset: string
  position: string
  tradingZoneId: string
  defaultStopLoss: string
  defaultTargetTier1: string
  defaultTargetTier2: string
  defaultTargetTier3: string
  defaultConfidenceLevel: string
  defaultNotes: string
  isFavorite: boolean
}

const emptyForm: TemplateFormData = {
  name: "",
  description: "",
  asset: "",
  position: "",
  tradingZoneId: "",
  defaultStopLoss: "",
  defaultTargetTier1: "",
  defaultTargetTier2: "",
  defaultTargetTier3: "",
  defaultConfidenceLevel: "",
  defaultNotes: "",
  isFavorite: false,
}

function fromDto(dto: TradeTemplateDto): TemplateFormData {
  return {
    name: dto.name,
    description: dto.description ?? "",
    asset: dto.asset ?? "",
    position: dto.position != null ? String(dto.position) : "",
    tradingZoneId: dto.tradingZoneId != null ? String(dto.tradingZoneId) : "",
    defaultStopLoss: dto.defaultStopLoss != null ? String(dto.defaultStopLoss) : "",
    defaultTargetTier1: dto.defaultTargetTier1 != null ? String(dto.defaultTargetTier1) : "",
    defaultTargetTier2: dto.defaultTargetTier2 != null ? String(dto.defaultTargetTier2) : "",
    defaultTargetTier3: dto.defaultTargetTier3 != null ? String(dto.defaultTargetTier3) : "",
    defaultConfidenceLevel: dto.defaultConfidenceLevel != null ? String(dto.defaultConfidenceLevel) : "",
    defaultNotes: dto.defaultNotes ?? "",
    isFavorite: dto.isFavorite,
  }
}

function toRequest(form: TemplateFormData): CreateTemplateRequest {
  const parseNum = (v: string) => { const n = Number.parseFloat(v); return Number.isFinite(n) ? n : null }
  const parseInt = (v: string) => { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? n : null }
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    asset: form.asset.trim().toUpperCase() || null,
    position: parseInt(form.position),
    tradingZoneId: parseInt(form.tradingZoneId),
    tradingSessionId: null,
    tradingSetupId: null,
    defaultStopLoss: parseNum(form.defaultStopLoss),
    defaultTargetTier1: parseNum(form.defaultTargetTier1),
    defaultTargetTier2: parseNum(form.defaultTargetTier2),
    defaultTargetTier3: parseNum(form.defaultTargetTier3),
    defaultConfidenceLevel: parseInt(form.defaultConfidenceLevel),
    defaultNotes: form.defaultNotes.trim() || null,
    defaultChecklistIds: null,
    defaultEmotionTagIds: null,
    defaultTechnicalAnalysisTagIds: null,
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
  zones,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingTemplate: TradeTemplateDto | null
  zones: TradingZoneApi[]
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<TemplateFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editingTemplate ? fromDto(editingTemplate) : emptyForm)
    }
  }, [open, editingTemplate])

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

  const patch = (field: keyof TemplateFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

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
              <Label>Template Name *</Label>
              <Input
                id="template-name"
                placeholder='e.g. "EURUSD London OB Long"'
                value={form.name}
                onChange={(e) => patch("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
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
              <Label>Asset</Label>
              <Input
                id="template-asset"
                placeholder="EURUSD, BTCUSD..."
                value={form.asset}
                onChange={(e) => patch("asset", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
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
              <Label>Trading Zone</Label>
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

          {/* Targets & SL */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Stop Loss</Label>
              <Input
                id="template-sl"
                type="number"
                step={TRADE_PRICE_INPUT_STEP}
                placeholder="0.00000"
                value={form.defaultStopLoss}
                onChange={(e) => patch("defaultStopLoss", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Target T1</Label>
              <Input
                id="template-t1"
                type="number"
                step={TRADE_PRICE_INPUT_STEP}
                placeholder="0.00000"
                value={form.defaultTargetTier1}
                onChange={(e) => patch("defaultTargetTier1", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Target T2</Label>
              <Input
                id="template-t2"
                type="number"
                step={TRADE_PRICE_INPUT_STEP}
                placeholder="0.00000"
                value={form.defaultTargetTier2}
                onChange={(e) => patch("defaultTargetTier2", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Target T3</Label>
              <Input
                id="template-t3"
                type="number"
                step={TRADE_PRICE_INPUT_STEP}
                placeholder="0.00000"
                value={form.defaultTargetTier3}
                onChange={(e) => patch("defaultTargetTier3", e.target.value)}
              />
            </div>
          </div>

          {/* Confidence & Favorite */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Confidence Level</Label>
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
            <div className="flex items-end">
              <Button
                type="button"
                variant={form.isFavorite ? "default" : "outline"}
                className="w-full gap-2"
                onClick={() => patch("isFavorite", !form.isFavorite)}
              >
                <Star className={cn("h-4 w-4", form.isFavorite && "fill-current")} />
                {form.isFavorite ? "Favorited" : "Mark as Favorite"}
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Default Notes</Label>
            <Textarea
              id="template-notes"
              placeholder="Pre-filled notes when using this template..."
              className="min-h-[80px]"
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
  onEdit,
  onDelete,
  onDuplicate,
  onUse,
}: {
  template: TradeTemplateDto
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
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/30 bg-muted/30 p-2.5 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">SL</p>
              <p className="text-sm font-semibold text-foreground">
                {formatTradePrice(template.defaultStopLoss)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">T1</p>
              <p className="text-sm font-semibold text-foreground">
                {formatTradePrice(template.defaultTargetTier1)}
              </p>
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
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TradeTemplateDto | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<TradeTemplateDto | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [tplRes, zoneRes] = await Promise.allSettled([
        getTemplates(),
        api.get<ApiResponse<TradingZoneApi[]>>("/v1/trading-zones"),
      ])
      if (tplRes.status === "fulfilled" && tplRes.value.data.isSuccess) {
        setTemplates(tplRes.value.data.value)
      }
      if (zoneRes.status === "fulfilled" && zoneRes.value.data.isSuccess) {
        setZones(zoneRes.value.data.value)
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
    setEditingTemplate(tpl)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setDialogOpen(true)
  }

  const handleDuplicate = (tpl: TradeTemplateDto) => {
    const dup = { ...tpl, id: 0, name: `${tpl.name} (Copy)` } as TradeTemplateDto
    setEditingTemplate(null)
    setDialogOpen(true)
    // Pre-fill form with duplicate data after dialog opens
    setTimeout(() => {
      setEditingTemplate(dup)
    }, 50)
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
            {filtered.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onEdit={() => handleEdit(tpl)}
                onDelete={() => setDeleteConfirm(tpl)}
                onDuplicate={() => handleDuplicate(tpl)}
                onUse={() => handleUse(tpl)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form dialog */}
      <TemplateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingTemplate={editingTemplate}
        zones={zones}
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

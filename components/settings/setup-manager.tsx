"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react"
import {
  ArrowLeft,
  Eye,
  GitBranch,
  GitBranchPlus,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { attachToken } from "@/lib/api"
import {
  createTradingSetup,
  deleteTradingSetup,
  getTradingSetupDetail,
  getTradingSetups,
  updateTradingSetup,
  type TradingSetupSummaryDto,
} from "@/lib/setup-api"
import {
  countActionableSetupSteps,
  createDefaultSetupDiagram,
  createSetupDiagramNode,
  fromFlowState,
  toApiDiagram,
  toFlowEdges,
  toFlowNodes,
  validateSetupDiagram,
  type SetupDiagramEdge,
  type SetupDiagramNode,
  type SetupFlowEdge,
  type SetupFlowNode,
  type SetupNodeKind,
} from "@/lib/setup-flow"
import { getVisibleTradingSetups } from "@/lib/setup-library"
import { cn } from "@/lib/utils"

import { SetupFlowNodeComponent } from "./setup-flow-node"

const nodeTypes = {
  setup: SetupFlowNodeComponent,
}

const NODE_KIND_OPTIONS: Array<{
  kind: SetupNodeKind
  label: string
}> = [
  { kind: "step", label: "Add step" },
  { kind: "decision", label: "Add decision" },
  { kind: "end", label: "Add end" },
]

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

const NODE_GRID_COLUMNS = 3
const NODE_GRID_START_X = 140
const NODE_GRID_START_Y = 80
const NODE_GRID_GAP_X = 280
const NODE_GRID_GAP_Y = 170

type SetupManagerScreen = "library" | "workspace"
type SetupWorkspaceMode = "create" | "edit" | "view"
type PendingDeleteSetup = Pick<TradingSetupSummaryDto, "id" | "name">

function isSetupNodeKind(value: unknown): value is SetupNodeKind {
  return value === "start" || value === "step" || value === "decision" || value === "end"
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isValidSetupNode(node: unknown): node is SetupDiagramNode {
  if (typeof node !== "object" || node === null) {
    return false
  }

  const candidate = node as Partial<SetupDiagramNode>

  return typeof candidate.id === "string"
    && candidate.id.trim().length > 0
    && isSetupNodeKind(candidate.kind)
    && typeof candidate.title === "string"
    && candidate.title.trim().length > 0
    && (candidate.notes === null || typeof candidate.notes === "string")
    && typeof candidate.position === "object"
    && candidate.position !== null
    && isFiniteCoordinate(candidate.position.x)
    && isFiniteCoordinate(candidate.position.y)
}

function isValidSetupEdge(edge: unknown): edge is SetupDiagramEdge {
  if (typeof edge !== "object" || edge === null) {
    return false
  }

  const candidate = edge as Partial<SetupDiagramEdge>

  return typeof candidate.id === "string"
    && candidate.id.trim().length > 0
    && typeof candidate.source === "string"
    && candidate.source.trim().length > 0
    && typeof candidate.target === "string"
    && candidate.target.trim().length > 0
    && (candidate.label === null || typeof candidate.label === "string")
}

function getNextSetupNodePosition(nodes: SetupFlowNode[]) {
  const occupiedSlots = new Set(
    nodes.map((node) => {
      const columnIndex = Math.max(0, Math.round((node.position.x - NODE_GRID_START_X) / NODE_GRID_GAP_X))
      const rowIndex = Math.max(0, Math.round((node.position.y - NODE_GRID_START_Y) / NODE_GRID_GAP_Y))

      return `${columnIndex},${rowIndex}`
    }),
  )

  let rowIndex = 0
  let columnIndex = 0

  while (occupiedSlots.has(`${columnIndex},${rowIndex}`)) {
    columnIndex += 1

    if (columnIndex >= NODE_GRID_COLUMNS) {
      columnIndex = 0
      rowIndex += 1
    }
  }

  return {
    x: NODE_GRID_START_X + columnIndex * NODE_GRID_GAP_X,
    y: NODE_GRID_START_Y + rowIndex * NODE_GRID_GAP_Y,
  }
}

function buildDraftFlowState() {
  const diagram = createDefaultSetupDiagram()

  return {
    diagram,
    nodes: toFlowNodes(diagram.nodes),
    edges: toFlowEdges(diagram.edges),
  }
}

function getNodeMinimapColor(node: SetupFlowNode) {
  switch (node.data.kind) {
    case "start":
      return "#059669"
    case "decision":
      return "#d97706"
    case "end":
      return "#7c3aed"
    default:
      return "#2563eb"
  }
}

function getErrorDescription(error: unknown, fallbackMessage: string) {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return fallbackMessage
  }

  const response = (error as {
    response?: {
      data?: {
        description?: string
        message?: string
        errors?: Array<{
          description?: string
        }>
      }
    }
  }).response

  return response?.data?.errors?.[0]?.description
    ?? response?.data?.description
    ?? response?.data?.message
    ?? fallbackMessage
}

export function SetupManager() {
  const { toast } = useToast()
  const [screen, setScreen] = useState<SetupManagerScreen>("library")
  const [mode, setMode] = useState<SetupWorkspaceMode>("create")
  const [isWorkspacePanelOpen, setIsWorkspacePanelOpen] = useState(false)
  const [initialDraftState] = useState(() => buildDraftFlowState())
  const [nodes, setNodes, onNodesStateChange] = useNodesState<SetupFlowNode>(initialDraftState.nodes)
  const [edges, setEdges, onEdgesStateChange] = useEdgesState<SetupFlowEdge>(initialDraftState.edges)
  const [setups, setSetups] = useState<TradingSetupSummaryDto[]>([])
  const [selectedSetupId, setSelectedSetupId] = useState<number | null>(null)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(initialDraftState.diagram.nodes[1]?.id ?? initialDraftState.diagram.nodes[0]?.id ?? null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [pendingDeleteSetup, setPendingDeleteSetup] = useState<PendingDeleteSetup | null>(null)

  const visibleSetups = useMemo(() => getVisibleTradingSetups(setups, search), [search, setups])

  const activeNode = useMemo(
    () => nodes.find((node) => node.id === activeNodeId) ?? null,
    [activeNodeId, nodes],
  )

  const currentDiagram = useMemo(() => fromFlowState(nodes, edges), [edges, nodes])
  const selectedSetupSummary = useMemo(
    () => setups.find((setup) => setup.id === selectedSetupId) ?? null,
    [selectedSetupId, setups],
  )
  const hasSavedSetup = selectedSetupId !== null
  const hasSavedSetups = setups.length > 0
  const isEditable = mode !== "view"
  const canResumeWorkspace = selectedSetupId !== null || isDirty
  const stepCount = useMemo(() => countActionableSetupSteps(currentDiagram.nodes), [currentDiagram.nodes])
  const workspaceTitle = name.trim() || selectedSetupSummary?.name || (hasSavedSetup ? "Untitled setup" : "New setup draft")
  const workspaceDescription = description.trim() || (mode === "view"
    ? "Review the sequence, inspect individual nodes, and switch into edit mode when the setup needs a change."
    : "Open the workspace panel to refine the overview, add new nodes, and tune the guidance behind each step.")

  const resetToDraft = useCallback(() => {
    const nextDraft = buildDraftFlowState()

    setSelectedSetupId(null)
    setName("")
    setDescription("")
    setNodes(nextDraft.nodes)
    setEdges(nextDraft.edges)
    setActiveNodeId(nextDraft.diagram.nodes[1]?.id ?? nextDraft.diagram.nodes[0]?.id ?? null)
    setIsDirty(false)
  }, [setEdges, setNodes])

  const confirmDiscardChanges = useCallback((nextAction: string) => {
    if (!isDirty || !isEditable || typeof window === "undefined") {
      return true
    }

    return window.confirm(`You have unsaved changes. ${nextAction}?`)
  }, [isDirty, isEditable])

  const applySetupDetail = useCallback((setupId: number, detail: {
    name: string
    description: string | null
    nodes: SetupDiagramNode[]
    edges: SetupDiagramEdge[]
  }) => {
    setSelectedSetupId(setupId)
    setName(detail.name)
    setDescription(detail.description ?? "")
    setNodes(toFlowNodes(detail.nodes))
    setEdges(toFlowEdges(detail.edges))
    setActiveNodeId(detail.nodes[0]?.id ?? null)
    setIsDirty(false)
  }, [setEdges, setNodes])

  const loadSetups = useCallback(async () => {
    try {
      setLoading(true)
      attachToken()

      const response = await getTradingSetups()

      if (!response.data.isSuccess) {
        return [] as TradingSetupSummaryDto[]
      }

      const nextSetups = response.data.value
      setSetups(nextSetups)
      return nextSetups
    } catch {
      toast({
        title: "Unable to load setups",
        description: "Refresh the page and try again.",
        variant: "destructive",
      })
      return [] as TradingSetupSummaryDto[]
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadSetupDetail = useCallback(async (setupId: number) => {
    try {
      setDetailLoading(true)
      attachToken()

      const response = await getTradingSetupDetail(setupId)

      if (response.data.isSuccess) {
        const detail = response.data.value
        const hasValidShape = typeof detail?.name === "string"
          && detail.name.trim().length > 0
          && (detail.description === null || typeof detail.description === "string")
          && Array.isArray(detail.nodes)
          && detail.nodes.every(isValidSetupNode)
          && Array.isArray(detail.edges)
          && detail.edges.every(isValidSetupEdge)

        if (!hasValidShape) {
          toast({
            title: "Unable to open setup",
            description: "This setup contains invalid data. Refresh the library and try another setup.",
            variant: "destructive",
          })
          return false
        }

        const validationIssues = validateSetupDiagram({
          nodes: detail.nodes,
          edges: detail.edges,
        })

        if (validationIssues[0]) {
          toast({
            title: "Unable to open setup",
            description: validationIssues[0].message,
            variant: "destructive",
          })
          return false
        }

        applySetupDetail(setupId, detail)
        return true
      }

      return false
    } catch (error) {
      toast({
        title: "Unable to load setup",
        description: getErrorDescription(error, "Try opening it again in a moment."),
        variant: "destructive",
      })
      return false
    } finally {
      setDetailLoading(false)
    }
  }, [applySetupDetail, toast])

  const openSetup = useCallback(async (setupId: number, nextMode: Exclude<SetupWorkspaceMode, "create">) => {
    if (!confirmDiscardChanges("Open a different setup without saving")) {
      return
    }

    const didLoad = await loadSetupDetail(setupId)

    if (!didLoad) {
      return
    }

    setMode(nextMode)
    setScreen("workspace")
    setIsWorkspacePanelOpen(nextMode === "edit")
  }, [confirmDiscardChanges, loadSetupDetail])

  const startDraft = useCallback(() => {
    if (!confirmDiscardChanges("Start a new draft without saving")) {
      return
    }

    resetToDraft()
    setMode("create")
    setScreen("workspace")
    setIsWorkspacePanelOpen(true)
  }, [confirmDiscardChanges, resetToDraft])

  const resumeWorkspace = useCallback(() => {
    setScreen("workspace")
    setIsWorkspacePanelOpen(isEditable)
  }, [isEditable])

  const returnToLibrary = useCallback(() => {
    if (!confirmDiscardChanges("Return to the setup library without saving")) {
      return
    }

    setScreen("library")
    setIsWorkspacePanelOpen(false)
  }, [confirmDiscardChanges])

  const handleStartEditing = useCallback(() => {
    setMode(hasSavedSetup ? "edit" : "create")
    setIsWorkspacePanelOpen(true)
  }, [hasSavedSetup])

  const requestDeleteSetup = useCallback((setup: PendingDeleteSetup) => {
    setPendingDeleteSetup(setup)
    setShowDeleteDialog(true)
  }, [])

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (saving) {
      return
    }

    setShowDeleteDialog(open)

    if (!open) {
      setPendingDeleteSetup(null)
    }
  }, [saving])

  useEffect(() => {
    void loadSetups()
  }, [loadSetups])

  useEffect(() => {
    if (typeof window === "undefined" || !isDirty || !isEditable) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isDirty, isEditable])

  const markDirty = useCallback(() => {
    setIsDirty(true)
  }, [])

  const handleNodesChange = useCallback<OnNodesChange<SetupFlowNode>>((changes) => {
    const nextChanges = isEditable
      ? changes
      : changes.filter((change) => change.type === "select")

    if (nextChanges.length === 0) {
      return
    }

    if (isEditable && nextChanges.some((change) => change.type !== "select")) {
      markDirty()
    }

    onNodesStateChange(nextChanges)
  }, [isEditable, markDirty, onNodesStateChange])

  const handleEdgesChange = useCallback<OnEdgesChange<SetupFlowEdge>>((changes) => {
    if (!isEditable) {
      return
    }

    if (changes.some((change) => change.type !== "select")) {
      markDirty()
    }

    onEdgesStateChange(changes)
  }, [isEditable, markDirty, onEdgesStateChange])

  const handleConnect = useCallback((connection: Connection) => {
    if (!isEditable) {
      return
    }

    markDirty()
    setEdges((currentEdges) => addEdge({ ...connection, type: "smoothstep" }, currentEdges))
  }, [isEditable, markDirty, setEdges])

  const handleAddNode = useCallback((kind: SetupNodeKind) => {
    if (!isEditable) {
      return
    }

    const diagramNode = createSetupDiagramNode(kind, {
      position: getNextSetupNodePosition(nodes),
    })

    markDirty()
    setNodes((currentNodes) => [...currentNodes, ...toFlowNodes([diagramNode])])
    setActiveNodeId(diagramNode.id)
    setIsWorkspacePanelOpen(true)
  }, [isEditable, markDirty, nodes, setNodes])

  const handleUpdateActiveNode = useCallback((field: "title" | "notes", value: string) => {
    if (!isEditable || !activeNodeId) {
      return
    }

    markDirty()
    setNodes((currentNodes) => currentNodes.map((node) => {
      if (node.id !== activeNodeId) {
        return node
      }

      return {
        ...node,
        data: {
          ...node.data,
          [field]: field === "notes" ? (value || null) : value,
        },
      }
    }))
  }, [activeNodeId, isEditable, markDirty, setNodes])

  const handleDeleteActiveNode = useCallback(() => {
    if (!isEditable || !activeNodeId) {
      return
    }

    markDirty()
    let nextActiveNodeId: string | null = null

    setNodes((currentNodes) => {
      const updatedNodes = currentNodes.filter((node) => node.id !== activeNodeId)
      nextActiveNodeId = updatedNodes[0]?.id ?? null
      return updatedNodes
    })
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== activeNodeId && edge.target !== activeNodeId))
    setActiveNodeId(nextActiveNodeId)
  }, [activeNodeId, isEditable, markDirty, setEdges, setNodes])

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      toast({
        title: "Setup name is required",
        description: "Give the flow chart a name before saving it.",
        variant: "destructive",
      })
      return
    }

    const validationIssues = validateSetupDiagram(currentDiagram)

    if (currentDiagram.nodes.length === 0) {
      toast({
        title: "Add at least one node",
        description: "Your setup needs at least one step before it can be saved.",
        variant: "destructive",
      })
      return
    }

    if (validationIssues[0]) {
      toast({
        title: "Invalid flow chart",
        description: validationIssues[0].message,
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      attachToken()

      const payload = {
        name: trimmedName,
        description: description.trim() || null,
        ...toApiDiagram(currentDiagram),
      }

      if (selectedSetupId) {
        await updateTradingSetup(selectedSetupId, payload)
        await loadSetups()
        await loadSetupDetail(selectedSetupId)
        setMode("edit")
        setScreen("workspace")

        toast({
          title: "Setup updated",
          description: `Saved changes to ${trimmedName}.`,
        })

        return
      }

      const response = await createTradingSetup(payload)

      if (response.data.isSuccess) {
        await loadSetups()
        await loadSetupDetail(response.data.value)
        setMode("edit")
        setScreen("workspace")

        toast({
          title: "Setup created",
          description: `${trimmedName} is ready to use.`,
        })
      }
    } catch (error) {
      toast({
        title: "Unable to save setup",
        description: getErrorDescription(error, "Review the flow chart and try again."),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [currentDiagram, description, loadSetupDetail, loadSetups, name, selectedSetupId, toast])

  const handleDeleteSetup = useCallback(async () => {
    if (!pendingDeleteSetup) {
      return
    }

    const deletedSetupId = pendingDeleteSetup.id
    const deletedSetupName = pendingDeleteSetup.name
    const isDeletingSelectedSetup = deletedSetupId === selectedSetupId

    try {
      setSaving(true)
      attachToken()

      const response = await deleteTradingSetup(deletedSetupId)

      if (!response.data.isSuccess) {
        toast({
          title: "Unable to delete setup",
          description: "Try again in a moment.",
          variant: "destructive",
        })
        return
      }

      setShowDeleteDialog(false)
      setPendingDeleteSetup(null)
      setSetups((currentSetups) => currentSetups.filter((setup) => setup.id !== deletedSetupId))

      if (isDeletingSelectedSetup) {
        resetToDraft()
        setMode("create")
        setScreen("library")
        setIsWorkspacePanelOpen(false)
      }

      toast({
        title: "Setup deleted",
        description: `${deletedSetupName} has been removed from your account.`,
      })
    } catch (error) {
      toast({
        title: "Unable to delete setup",
        description: getErrorDescription(error, "Try again in a moment."),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [pendingDeleteSetup, resetToDraft, selectedSetupId, toast])

  const pageContent = screen === "library" ? (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-4xl border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-6 py-7 shadow-sm dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] sm:px-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
                Setup library
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background/80 text-muted-foreground">
                {setups.length} saved
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background/80 text-muted-foreground">
                Newest first
              </Badge>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Review the flow before you touch the chart
              </h1>
              <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Start from your library, open any setup in read-only mode, jump straight into editing, or spin up a fresh draft when the playbook changes.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {canResumeWorkspace ? (
              <Button variant="outline" className="gap-2" onClick={resumeWorkspace}>
                <Eye className="h-4 w-4" />
                {selectedSetupId !== null ? (mode === "view" ? "Resume selected setup" : "Resume editing") : "Resume draft"}
              </Button>
            ) : null}
            <Button className="gap-2" onClick={startDraft}>
              <Plus className="h-4 w-4" />
              New setup
            </Button>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Saved flowcharts</CardTitle>
              <CardDescription>
                Search your setups, then choose whether you want to view or edit before entering the workspace.
              </CardDescription>
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search setups"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              {loading
                ? "Loading your setups..."
                : `${visibleSetups.length} of ${setups.length} setup${setups.length === 1 ? "" : "s"}`}
            </p>
            {hasSavedSetups ? <p>Sorted by last updated</p> : null}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your setups...
            </div>
          ) : !hasSavedSetups ? (
            <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-5 py-8 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No saved setups yet.</p>
              <p className="mt-2 max-w-2xl leading-relaxed">
                Create the first flowchart for your opening plan, then come back here to review it in read-only mode before the session starts.
              </p>
              <Button className="mt-4 gap-2" onClick={startDraft}>
                <Plus className="h-4 w-4" />
                Create your first setup
              </Button>
            </div>
          ) : visibleSetups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-5 py-8 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No setups match that search.</p>
              <p className="mt-2 max-w-2xl leading-relaxed">
                Try a different keyword or clear the filter to browse your most recently updated setups first.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {visibleSetups.map((setup) => {
                const isSelected = setup.id === selectedSetupId

                return (
                  <article
                    key={setup.id}
                    className={cn(
                      "flex h-full flex-col justify-between rounded-[1.75rem] border px-5 py-5 shadow-sm transition-colors",
                      isSelected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/70 bg-card hover:border-primary/25 hover:bg-muted/20",
                    )}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <h2 className="text-base font-semibold tracking-tight text-foreground">
                            {setup.name}
                          </h2>
                          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                            {setup.description?.trim() || "No description yet. Open the setup to add the context and execution notes."}
                          </p>
                        </div>

                        <Badge variant="outline" className="shrink-0 border-border/80 bg-muted/40 text-muted-foreground">
                          {setup.stepCount} steps
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                        <span>Updated {DATE_FORMATTER.format(new Date(setup.lastUpdatedAt))}</span>
                        {isSelected ? <span>Currently loaded</span> : null}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        disabled={detailLoading || saving}
                        onClick={() => void openSetup(setup.id, "view")}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        type="button"
                        className="gap-2"
                        disabled={detailLoading || saving}
                        onClick={() => void openSetup(setup.id, "edit")}
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={detailLoading || saving}
                        onClick={() => requestDeleteSetup({ id: setup.id, name: setup.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  ) : (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-4xl border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.08),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-6 py-6 shadow-sm dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.12),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] sm:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
                {mode === "view" ? "View mode" : hasSavedSetup ? "Edit mode" : "Create mode"}
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background/80 text-muted-foreground">
                {stepCount} actionable steps
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background/80 text-muted-foreground">
                {hasSavedSetup && selectedSetupSummary
                  ? `Updated ${DATE_FORMATTER.format(new Date(selectedSetupSummary.lastUpdatedAt))}`
                  : "Draft not saved yet"}
              </Badge>
              {isDirty ? (
                <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  Unsaved changes
                </Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <Button variant="ghost" className="-ml-3 gap-2 text-muted-foreground hover:text-foreground" onClick={returnToLibrary}>
                <ArrowLeft className="h-4 w-4" />
                Back to setups
              </Button>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {workspaceTitle}
              </h1>
              <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {workspaceDescription}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsWorkspacePanelOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              {mode === "view" ? "Open details" : "Open editor panel"}
            </Button>
            {hasSavedSetup && mode === "view" ? (
              <Button className="gap-2" onClick={handleStartEditing}>
                <PencilLine className="h-4 w-4" />
                Edit setup
              </Button>
            ) : null}
            {hasSavedSetup ? (
              <Button
                variant="outline"
                className="gap-2"
                disabled={saving}
                onClick={() => {
                  if (selectedSetupId === null) {
                    return
                  }

                  requestDeleteSetup({
                    id: selectedSetupId,
                    name: selectedSetupSummary?.name ?? workspaceTitle,
                  })
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : null}
            {isEditable ? (
              <Button className="gap-2" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save setup
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4 text-primary" />
                Flow workspace
              </CardTitle>
              <CardDescription>
                {mode === "view"
                  ? "Pan, zoom, and inspect the setup without changing it."
                  : "Drag nodes, connect the path, and use the panel to update the checklist logic."}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {detailLoading ? (
                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing
                </Badge>
              ) : null}
              <Badge variant="outline" className="border-border/70 bg-background/80 text-muted-foreground">
                {activeNode ? `${activeNode.data.kind}: ${activeNode.data.title}` : "No node selected"}
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background/80 text-muted-foreground">
                {mode === "view" ? "Read only" : "Interactive editor"}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className={cn(
            "h-[72vh] min-h-140 w-full bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.18),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))]",
            mode === "view" && "[&_.react-flow__handle]:hidden",
          )}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={handleConnect}
              onNodeClick={(_, node) => {
                setActiveNodeId(node.id)
                setIsWorkspacePanelOpen(true)
              }}
              onPaneClick={() => setActiveNodeId(null)}
              fitView
              fitViewOptions={{ padding: 0.16 }}
              snapToGrid={isEditable}
              snapGrid={[20, 20]}
              minZoom={0.4}
              maxZoom={1.5}
              defaultEdgeOptions={{ type: "smoothstep" }}
              nodesDraggable={isEditable}
              nodesConnectable={isEditable}
              elementsSelectable
            >
              <Controls position="top-right" />
              <MiniMap nodeColor={getNodeMinimapColor} pannable zoomable />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isWorkspacePanelOpen} onOpenChange={setIsWorkspacePanelOpen}>
        <SheetContent className="gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-5">
            <div className="space-y-2 pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
                  {mode === "view" ? "Setup details" : "Setup controls"}
                </Badge>
                {activeNode ? (
                  <Badge variant="outline" className="border-border/70 bg-background/80 text-muted-foreground">
                    Selected node
                  </Badge>
                ) : null}
              </div>
              <SheetTitle className="text-xl tracking-tight">{workspaceTitle}</SheetTitle>
              <SheetDescription>
                {mode === "view"
                  ? "Review the setup context and inspect any selected node without changing the flowchart."
                  : "Adjust the setup overview, add new nodes, and fine-tune the guidance tied to the selected step."}
              </SheetDescription>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <section className="space-y-4">
              {mode === "view" ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Setup name</p>
                    <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-foreground">
                      {workspaceTitle}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Overview</p>
                    <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                      {description.trim() || "No overview saved yet for this setup."}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="setup-name" className="text-sm font-medium text-foreground">Setup name</label>
                    <Input
                      id="setup-name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value)
                        markDirty()
                      }}
                      placeholder="Example: London open continuation"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="setup-description" className="text-sm font-medium text-foreground">Setup overview</label>
                    <Textarea
                      id="setup-description"
                      value={description}
                      onChange={(event) => {
                        setDescription(event.target.value)
                        markDirty()
                      }}
                      placeholder="Describe the context, timing, and overall idea behind this setup."
                      rows={4}
                    />
                  </div>
                </>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Actionable steps</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{stepCount}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Checklist items excluding the start and end states.
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {hasSavedSetup ? "Last updated" : "Draft status"}
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {hasSavedSetup && selectedSetupSummary
                    ? DATE_FORMATTER.format(new Date(selectedSetupSummary.lastUpdatedAt))
                    : "Not saved yet"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {mode === "view"
                    ? "Switch to edit mode when you are ready to change the flow."
                    : "Save before leaving to keep the latest layout and node guidance."}
                </p>
              </div>
            </section>

            {isEditable ? (
              <section className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Node toolbox</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add the checkpoints that shape your decision-making path without giving up canvas space.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {NODE_KIND_OPTIONS.map((option) => (
                    <Button
                      key={option.kind}
                      type="button"
                      variant="outline"
                      className="justify-start gap-2"
                      onClick={() => handleAddNode(option.kind)}
                    >
                      <GitBranchPlus className="h-4 w-4" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-4 rounded-2xl border border-border/70 bg-background p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Selected node</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {activeNode
                    ? mode === "view"
                      ? "Review the current step and its guidance without editing the flowchart."
                      : "Update the selected step without shrinking the canvas."
                    : "Select a node in the canvas to inspect it here."}
                </p>
              </div>

              {activeNode ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Node type</p>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                      {activeNode.data.kind}
                    </Badge>
                  </div>

                  {mode === "view" ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Title</p>
                        <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-foreground">
                          {activeNode.data.title}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Guidance</p>
                        <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                          {activeNode.data.notes?.trim() || "No guidance yet. Add the reminders you want to see here when you switch into edit mode."}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label htmlFor="active-node-title" className="text-sm font-medium text-foreground">Title</label>
                        <Input
                          id="active-node-title"
                          value={activeNode.data.title}
                          onChange={(event) => handleUpdateActiveNode("title", event.target.value)}
                          placeholder="Node title"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="active-node-notes" className="text-sm font-medium text-foreground">Guidance</label>
                        <Textarea
                          id="active-node-notes"
                          value={activeNode.data.notes ?? ""}
                          onChange={(event) => handleUpdateActiveNode("notes", event.target.value)}
                          placeholder="Add the reminder, checkpoint, or rule tied to this step."
                          rows={6}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={handleDeleteActiveNode}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove selected node
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                  Click any node in the canvas to inspect its title and guidance from here.
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )

  return (
    <>
      {pageContent}

      <AlertDialog open={showDeleteDialog} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this setup?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the current flow chart and its saved steps from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteSetup()
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete setup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
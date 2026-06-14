"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, ListTodo, MoreVertical, Pencil, Plus, RefreshCcw, SquarePen, Target, Trash2 } from "lucide-react"
import { AppPageShell } from "@/components/app-page-shell"
import { AppShellLoader } from "@/components/app-shell-loader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { TrackingProgress } from "@/components/goals/tracking-progress"
import { GoalItemRow } from "@/components/goals/goal-item-row"
import { GoalHistory } from "@/components/goals/goal-history"
import { AddItemDialog, type AddItemKind, type EditItemTarget } from "@/components/goals/add-item-dialog"
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog"
import { UpdateProgressDialog } from "@/components/goals/update-progress-dialog"
import { SafeHtml } from "@/components/ui/safe-html"
import { useAuth } from "@/lib/auth-context"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { useGoalsStore } from "@/lib/stores/use-goals-store"
import { GoalItemType } from "@/lib/enum/GoalEnums"
import type { GoalMilestoneView, GoalTaskView, TrackingSnapshot, UpdateProgressRequest } from "@/lib/goals-api"
import {
  GOAL_STATUS_META,
  canUpdateManually,
  formatDate,
  getGoalStatus,
  reorderEntries,
  rollupOverridePercent,
} from "@/lib/goals-overview"
import { cn } from "@/lib/utils"

const SC = "rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm"

type UpdateTarget =
  | { kind: "goal"; title: string; tracking: TrackingSnapshot }
  | { kind: "milestone"; id: number; title: string; tracking: TrackingSnapshot }
  | { kind: "task"; id: number; title: string; tracking: TrackingSnapshot }

type AddTarget = { kind: AddItemKind; milestoneId: number | null; nextSortOrder: number }
type EditTarget = { kind: AddItemKind; milestoneId: number | null; item: EditItemTarget }
type DeleteTarget = { kind: "goal" | "milestone" | "task"; id: number; title: string }

const toEditTarget = (item: GoalMilestoneView | GoalTaskView): EditItemTarget => ({
  id: item.id,
  title: item.title,
  description: item.description,
  dueDate: item.dueDate,
  tracking: item.tracking,
})

export default function GoalDetailPage() {
  const params = useParams()
  const goalId = Number(params.id)
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: isAuthLoading } = useAuth()

  const detail = useGoalsStore((s) => s.detail)
  const detailError = useGoalsStore((s) => s.detailError)
  const isLoadingDetail = useGoalsStore((s) => s.isLoadingDetail)
  const isMutating = useGoalsStore((s) => s.isMutating)
  const loadDetail = useGoalsStore((s) => s.loadDetail)
  const clearDetail = useGoalsStore((s) => s.clearDetail)
  const updateGoalProgress = useGoalsStore((s) => s.updateGoalProgress)
  const updateMilestoneProgress = useGoalsStore((s) => s.updateMilestoneProgress)
  const updateTaskProgress = useGoalsStore((s) => s.updateTaskProgress)
  const removeGoal = useGoalsStore((s) => s.removeGoal)
  const removeMilestone = useGoalsStore((s) => s.removeMilestone)
  const removeTask = useGoalsStore((s) => s.removeTask)
  const reorderItems = useGoalsStore((s) => s.reorderItems)

  const [updateTarget, setUpdateTarget] = useState<UpdateTarget | null>(null)
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [editGoalOpen, setEditGoalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  useEffect(() => {
    if (!isAuthLoading && !user) router.replace(buildRedirectWithNext("/login", pathname))
  }, [user, isAuthLoading, pathname, router])

  useEffect(() => {
    if (!isAuthLoading && user && Number.isFinite(goalId)) void loadDetail(goalId)
    return () => clearDetail()
  }, [isAuthLoading, user, goalId, loadDetail, clearDetail])

  const referenceDate = useMemo(() => new Date(), [detail])

  const moveMilestone = (index: number, direction: -1 | 1) => {
    if (!detail) return
    const entries = reorderEntries(detail.milestones, index, index + direction, GoalItemType.Milestone)
    if (entries.length) void reorderItems(goalId, { items: entries })
  }

  const moveTask = (siblings: GoalTaskView[], index: number, direction: -1 | 1) => {
    const entries = reorderEntries(siblings, index, index + direction, GoalItemType.Task)
    if (entries.length) void reorderItems(goalId, { items: entries })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    let ok = false
    if (deleteTarget.kind === "goal") ok = await removeGoal(goalId)
    else if (deleteTarget.kind === "milestone") ok = await removeMilestone(goalId, deleteTarget.id)
    else ok = await removeTask(goalId, deleteTarget.id)
    setDeleteTarget(null)
    if (ok && deleteTarget.kind === "goal") router.push("/goals")
  }

  if (isAuthLoading) return <AppShellLoader title="Loading goal" description="Fetching goal details." />
  if (!user) return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />
  if (isLoadingDetail && !detail) {
    return (
      <AppPageShell>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppPageShell>
    )
  }
  if (!detail) {
    // A transient failure is retryable; a genuine 404 is not.
    const isNetworkError = detailError === "error"
    return (
      <AppPageShell contentClassName="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/goals")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to goals
        </Button>
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-muted-foreground">
            {isNetworkError ? "Couldn't load this goal. Check your connection and try again." : "Goal not found."}
          </p>
          {isNetworkError && (
            <Button variant="outline" onClick={() => void loadDetail(goalId)} disabled={isLoadingDetail} className="gap-2">
              <RefreshCcw className={cn("h-4 w-4", isLoadingDetail && "animate-spin")} /> Retry
            </Button>
          )}
        </div>
      </AppPageShell>
    )
  }

  const status = getGoalStatus(detail, referenceDate)
  const meta = GOAL_STATUS_META[status]
  const totalTasks = detail.tasks.length + detail.milestones.reduce((n, m) => n + m.tasks.length, 0)

  const submitUpdate = async (request: UpdateProgressRequest): Promise<boolean> => {
    if (!updateTarget) return false
    if (updateTarget.kind === "goal") return updateGoalProgress(goalId, request)
    if (updateTarget.kind === "milestone") return updateMilestoneProgress(goalId, updateTarget.id, request)
    return updateTaskProgress(goalId, updateTarget.id, request)
  }

  return (
    <AppPageShell contentClassName="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/goals")} className="-ml-2 w-fit gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to goals
      </Button>

      {/* Goal header */}
      <Card className={SC}>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Target className="h-6 w-6" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{detail.title}</h1>
                  <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold", meta.tone)}>
                    {meta.label}
                  </Badge>
                </div>
                {detail.description && (
                  <SafeHtml
                    html={detail.description}
                    className="prose prose-sm dark:prose-invert max-w-2xl text-muted-foreground"
                  />
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {detail.startDate && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Start {formatDate(detail.startDate)}</span>}
                  {detail.dueDate && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Due {formatDate(detail.dueDate)}</span>}
                  <span className="flex items-center gap-1"><ListTodo className="h-3.5 w-3.5" /> {totalTasks} task{totalTasks === 1 ? "" : "s"}</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {canUpdateManually(detail.tracking) && (
                <Button size="sm" onClick={() => setUpdateTarget({ kind: "goal", title: detail.title, tracking: detail.tracking })} className="gap-2">
                  <Pencil className="h-4 w-4" /> Update
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Goal actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditGoalOpen(true)}>
                    <SquarePen className="mr-2 h-4 w-4" /> Edit goal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget({ kind: "goal", id: detail.id, title: detail.title })}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete goal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <TrackingProgress
            tracking={detail.tracking}
            progressOverride={rollupOverridePercent(detail.tracking, detail.rollupProgressPercent)}
          />
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card className={SC}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Milestones</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => setAddTarget({ kind: "milestone", milestoneId: null, nextSortOrder: detail.milestones.length })}
          >
            <Plus className="h-4 w-4" /> Milestone
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.milestones.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No milestones. Break the goal into checkpoints.</p>
          ) : (
            detail.milestones.map((m, mIndex) => (
              <GoalItemRow
                key={m.id}
                title={m.title}
                description={m.description}
                dueDate={m.dueDate}
                tracking={m.tracking}
                rollupProgressPercent={m.rollupProgressPercent}
                variant="milestone"
                onUpdate={() => setUpdateTarget({ kind: "milestone", id: m.id, title: m.title, tracking: m.tracking })}
                onEdit={() => setEditTarget({ kind: "milestone", milestoneId: null, item: toEditTarget(m) })}
                onDelete={() => setDeleteTarget({ kind: "milestone", id: m.id, title: m.title })}
                onMoveUp={mIndex > 0 ? () => moveMilestone(mIndex, -1) : undefined}
                onMoveDown={mIndex < detail.milestones.length - 1 ? () => moveMilestone(mIndex, 1) : undefined}
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2.5 text-xs"
                    onClick={() => setAddTarget({ kind: "task", milestoneId: m.id, nextSortOrder: m.tasks.length })}
                  >
                    <Plus className="h-3.5 w-3.5" /> Task
                  </Button>
                }
              >
                {m.tasks.map((t, tIndex) => (
                  <GoalItemRow
                    key={t.id}
                    title={t.title}
                    description={t.description}
                    dueDate={t.dueDate}
                    tracking={t.tracking}
                    variant="task"
                    onUpdate={() => setUpdateTarget({ kind: "task", id: t.id, title: t.title, tracking: t.tracking })}
                    onEdit={() => setEditTarget({ kind: "task", milestoneId: m.id, item: toEditTarget(t) })}
                    onDelete={() => setDeleteTarget({ kind: "task", id: t.id, title: t.title })}
                    onMoveUp={tIndex > 0 ? () => moveTask(m.tasks, tIndex, -1) : undefined}
                    onMoveDown={tIndex < m.tasks.length - 1 ? () => moveTask(m.tasks, tIndex, 1) : undefined}
                  />
                ))}
              </GoalItemRow>
            ))
          )}
        </CardContent>
      </Card>

      {/* Standalone tasks */}
      <Card className={SC}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Tasks</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => setAddTarget({ kind: "task", milestoneId: null, nextSortOrder: detail.tasks.length })}
          >
            <Plus className="h-4 w-4" /> Task
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.tasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No standalone tasks.</p>
          ) : (
            detail.tasks.map((t, tIndex) => (
              <GoalItemRow
                key={t.id}
                title={t.title}
                description={t.description}
                dueDate={t.dueDate}
                tracking={t.tracking}
                variant="task"
                onUpdate={() => setUpdateTarget({ kind: "task", id: t.id, title: t.title, tracking: t.tracking })}
                onEdit={() => setEditTarget({ kind: "task", milestoneId: null, item: toEditTarget(t) })}
                onDelete={() => setDeleteTarget({ kind: "task", id: t.id, title: t.title })}
                onMoveUp={tIndex > 0 ? () => moveTask(detail.tasks, tIndex, -1) : undefined}
                onMoveDown={tIndex < detail.tasks.length - 1 ? () => moveTask(detail.tasks, tIndex, 1) : undefined}
              />
            ))
          )}
        </CardContent>
      </Card>

      <GoalHistory goalId={goalId} progress={detail.progressHistory} activity={detail.activityHistory} />

      {updateTarget && (
        <UpdateProgressDialog
          open
          onOpenChange={(o) => { if (!o) setUpdateTarget(null) }}
          itemLabel={updateTarget.kind}
          title={updateTarget.title}
          tracking={updateTarget.tracking}
          isMutating={isMutating}
          onSubmit={submitUpdate}
        />
      )}

      {addTarget && (
        <AddItemDialog
          open
          onOpenChange={(o) => { if (!o) setAddTarget(null) }}
          goalId={goalId}
          kind={addTarget.kind}
          milestoneId={addTarget.milestoneId}
          nextSortOrder={addTarget.nextSortOrder}
        />
      )}

      {editTarget && (
        <AddItemDialog
          open
          onOpenChange={(o) => { if (!o) setEditTarget(null) }}
          goalId={goalId}
          kind={editTarget.kind}
          milestoneId={editTarget.milestoneId}
          nextSortOrder={0}
          editing={editTarget.item}
        />
      )}

      <CreateGoalDialog
        open={editGoalOpen}
        onOpenChange={setEditGoalOpen}
        editing={editGoalOpen ? detail : null}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be removed
              {deleteTarget?.kind === "goal" && " along with its milestones and tasks"}
              {deleteTarget?.kind === "milestone" && " along with its tasks"}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDelete() }}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isMutating}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppPageShell>
  )
}

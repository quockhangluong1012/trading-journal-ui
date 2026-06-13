"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Plus, RefreshCcw, Target } from "lucide-react"
import { AppPageIntro } from "@/components/app-page-intro"
import { AppPageShell } from "@/components/app-page-shell"
import { AppShellLoader } from "@/components/app-shell-loader"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { GoalCard } from "@/components/goals/goal-card"
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog"
import { useAuth } from "@/lib/auth-context"
import { buildRedirectWithNext } from "@/lib/auth-redirect"
import { useGoalsStore } from "@/lib/stores/use-goals-store"
import { clampPercent } from "@/lib/goals-overview"

export default function GoalsPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const goals = useGoalsStore((s) => s.goals)
  const isLoadingList = useGoalsStore((s) => s.isLoadingList)
  const includeCompleted = useGoalsStore((s) => s.includeCompleted)
  const loadGoals = useGoalsStore((s) => s.loadGoals)

  const [createOpen, setCreateOpen] = useState(false)
  // Stable "now" so card statuses don't recompute on every render.
  const referenceDate = useMemo(() => new Date(), [goals])

  useEffect(() => {
    if (!isAuthLoading && !user) router.replace(buildRedirectWithNext("/login", pathname))
  }, [user, isAuthLoading, pathname, router])

  useEffect(() => {
    if (!isAuthLoading && user) void loadGoals()
  }, [isAuthLoading, user, loadGoals])

  if (isAuthLoading) return <AppShellLoader title="Loading goals" description="Fetching your targets." />
  if (!user) return <AppShellLoader title="Redirecting to sign in" description="Taking you to login." />

  const activeCount = goals.filter((g) => !g.tracking.isCompleted).length
  const completedCount = goals.filter((g) => g.tracking.isCompleted).length
  const avgProgress = goals.length
    ? clampPercent(goals.reduce((sum, g) => sum + g.tracking.progressPercent, 0) / goals.length)
    : 0

  return (
    <AppPageShell contentClassName="space-y-6">
      <AppPageIntro
        badge="Goal tracker"
        icon={<Target className="h-6 w-6" />}
        title="Goals"
        description="Set targets, break them into milestones and tasks, and track progress manually or from live trading metrics."
        stats={[
          { label: "Active", value: activeCount },
          { label: "Completed", value: completedCount },
          { label: "Avg progress", value: `${avgProgress}%` },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void loadGoals()} disabled={isLoadingList} className="gap-2 rounded-full">
              <RefreshCcw className={`h-4 w-4 ${isLoadingList ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 rounded-full">
              <Plus className="h-4 w-4" /> New Goal
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-2">
        <Switch
          id="include-completed"
          checked={includeCompleted}
          onCheckedChange={(checked) => void loadGoals(checked)}
        />
        <Label htmlFor="include-completed" className="text-sm text-muted-foreground">Show completed goals</Label>
      </div>

      {isLoadingList && goals.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : goals.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed border-border/70 bg-card/40 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Target className="h-6 w-6" /></EmptyMedia>
            <EmptyTitle>No goals yet</EmptyTitle>
            <EmptyDescription>
              Create your first goal to start tracking progress toward what matters.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> New Goal</Button>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} referenceDate={referenceDate} />
          ))}
        </div>
      )}

      <CreateGoalDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppPageShell>
  )
}

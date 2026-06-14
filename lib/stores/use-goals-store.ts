import { create } from "zustand"
import { toast } from "sonner"
import { attachToken } from "@/lib/api"
import { GoalItemType } from "@/lib/enum/GoalEnums"
import { applyDetailToSummary, applyProgressToDetail } from "@/lib/goals-overview"
import {
  addMilestone,
  addTask,
  createGoal,
  deleteGoal,
  deleteMilestone,
  deleteTask,
  fetchGoalDetail,
  fetchGoals,
  fetchGoalStats,
  reorderItems,
  updateGoal,
  updateGoalProgress,
  updateMilestone,
  updateMilestoneProgress,
  updateTask,
  updateTaskProgress,
  type AddMilestoneRequest,
  type AddTaskRequest,
  type CreateGoalRequest,
  type GoalDetail,
  type GoalStats,
  type GoalSummary,
  type ProgressResult,
  type ReorderRequest,
  type UpdateGoalRequest,
  type UpdateMilestoneRequest,
  type UpdateProgressRequest,
  type UpdateTaskRequest,
} from "@/lib/goals-api"

/** Pulls a backend `Result` failure description out of an axios error, if present. */
function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { errors?: { description?: string }[] } } })?.response?.data
  return data?.errors?.[0]?.description ?? fallback
}

function httpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

/** Distinguishes a genuinely missing goal (404) from a transient/server failure. */
export type DetailError = "notfound" | "error"

interface GoalsState {
  goals: GoalSummary[]
  detail: GoalDetail | null
  stats: GoalStats | null
  detailError: DetailError | null
  includeCompleted: boolean
  isLoadingList: boolean
  isLoadingDetail: boolean
  isMutating: boolean

  loadGoals: (includeCompleted?: boolean) => Promise<void>
  loadStats: () => Promise<void>
  loadDetail: (goalId: number) => Promise<void>
  clearDetail: () => void
  applyProgress: (
    goalId: number,
    target: { itemType: GoalItemType; itemId: number },
    result: ProgressResult,
  ) => void

  createGoal: (request: CreateGoalRequest) => Promise<number | null>
  updateGoal: (goalId: number, request: UpdateGoalRequest) => Promise<boolean>
  removeGoal: (goalId: number) => Promise<boolean>
  addMilestone: (goalId: number, request: AddMilestoneRequest) => Promise<boolean>
  updateMilestone: (goalId: number, milestoneId: number, request: UpdateMilestoneRequest) => Promise<boolean>
  removeMilestone: (goalId: number, milestoneId: number) => Promise<boolean>
  addTask: (goalId: number, request: AddTaskRequest) => Promise<boolean>
  updateTask: (goalId: number, taskId: number, request: UpdateTaskRequest) => Promise<boolean>
  removeTask: (goalId: number, taskId: number) => Promise<boolean>
  reorderItems: (goalId: number, request: ReorderRequest) => Promise<boolean>
  updateGoalProgress: (goalId: number, request: UpdateProgressRequest) => Promise<boolean>
  updateMilestoneProgress: (goalId: number, milestoneId: number, request: UpdateProgressRequest) => Promise<boolean>
  updateTaskProgress: (goalId: number, taskId: number, request: UpdateProgressRequest) => Promise<boolean>
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  detail: null,
  stats: null,
  detailError: null,
  includeCompleted: false,
  isLoadingList: false,
  isLoadingDetail: false,
  isMutating: false,

  loadGoals: async (includeCompleted) => {
    attachToken()
    const flag = includeCompleted ?? get().includeCompleted
    set({ isLoadingList: true, includeCompleted: flag })
    try {
      const goals = await fetchGoals(flag)
      set({ goals })
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to load goals."))
    } finally {
      set({ isLoadingList: false })
    }
  },

  loadStats: async () => {
    attachToken()
    try {
      const stats = await fetchGoalStats()
      set({ stats })
    } catch {
      // Stats are a non-critical headline; stay silent and leave the prior value.
    }
  },

  loadDetail: async (goalId) => {
    attachToken()
    set({ isLoadingDetail: true, detailError: null })
    try {
      const detail = await fetchGoalDetail(goalId)
      set({ detail })
    } catch (error) {
      // A 404 is a real missing goal; anything else is transient and retryable —
      // keep them distinct so the page doesn't cry "not found" on a network blip.
      const notFound = httpStatus(error) === 404
      set({ detail: null, detailError: notFound ? "notfound" : "error" })
      if (!notFound) toast.error(apiErrorMessage(error, "Failed to load goal."))
    } finally {
      set({ isLoadingDetail: false })
    }
  },

  clearDetail: () => set({ detail: null, detailError: null }),

  // Patch the loaded detail and its list summary in place from a progress PATCH
  // response, sidestepping a full goal + history refetch. The matching detail is
  // only present when the user is on that goal's page (where milestone/task
  // progress is edited), so when it is absent there is nothing local to patch.
  applyProgress: (goalId, target, result) => {
    const { detail, goals } = get()
    if (!detail || detail.id !== goalId) return
    const nextDetail = applyProgressToDetail(detail, target, result)
    set({
      detail: nextDetail,
      goals: goals.map((goal) =>
        goal.id === goalId ? applyDetailToSummary(goal, nextDetail) : goal,
      ),
    })
  },

  createGoal: async (request) => {
    attachToken()
    set({ isMutating: true })
    try {
      const id = await createGoal(request)
      toast.success("Goal created.")
      await Promise.all([get().loadGoals(), get().loadStats()])
      return id
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to create goal."))
      return null
    } finally {
      set({ isMutating: false })
    }
  },

  updateGoal: async (goalId, request) => {
    attachToken()
    set({ isMutating: true })
    try {
      await updateGoal(goalId, request)
      toast.success("Goal updated.")
      await Promise.all([get().loadDetail(goalId), get().loadGoals(), get().loadStats()])
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to update goal."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  removeGoal: async (goalId) => {
    attachToken()
    set({ isMutating: true })
    try {
      await deleteGoal(goalId)
      toast.success("Goal deleted.")
      await Promise.all([get().loadGoals(), get().loadStats()])
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to delete goal."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  addMilestone: async (goalId, request) => {
    attachToken()
    set({ isMutating: true })
    try {
      await addMilestone(goalId, request)
      toast.success("Milestone added.")
      await get().loadDetail(goalId)
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to add milestone."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  updateMilestone: async (goalId, milestoneId, request) => {
    attachToken()
    set({ isMutating: true })
    try {
      await updateMilestone(goalId, milestoneId, request)
      toast.success("Milestone updated.")
      await get().loadDetail(goalId)
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to update milestone."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  removeMilestone: async (goalId, milestoneId) => {
    attachToken()
    set({ isMutating: true })
    try {
      await deleteMilestone(goalId, milestoneId)
      toast.success("Milestone deleted.")
      await get().loadDetail(goalId)
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to delete milestone."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  addTask: async (goalId, request) => {
    attachToken()
    set({ isMutating: true })
    try {
      await addTask(goalId, request)
      toast.success("Task added.")
      await get().loadDetail(goalId)
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to add task."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  updateTask: async (goalId, taskId, request) => {
    attachToken()
    set({ isMutating: true })
    try {
      await updateTask(goalId, taskId, request)
      toast.success("Task updated.")
      await get().loadDetail(goalId)
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to update task."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  removeTask: async (goalId, taskId) => {
    attachToken()
    set({ isMutating: true })
    try {
      await deleteTask(goalId, taskId)
      toast.success("Task deleted.")
      await get().loadDetail(goalId)
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to delete task."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  reorderItems: async (goalId, request) => {
    attachToken()
    set({ isMutating: true })
    try {
      await reorderItems(goalId, request)
      await get().loadDetail(goalId)
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to reorder items."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  updateGoalProgress: async (goalId, request) => {
    attachToken()
    set({ isMutating: true })
    try {
      const result = await updateGoalProgress(goalId, request)
      get().applyProgress(goalId, { itemType: GoalItemType.Goal, itemId: goalId }, result)
      toast.success("Progress updated.")
      // Stats span all goals (including ones hidden from the visible list), so
      // they can't be recomputed locally — keep that lightweight refetch.
      await get().loadStats()
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to update progress."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  updateMilestoneProgress: async (goalId, milestoneId, request) => {
    attachToken()
    set({ isMutating: true })
    try {
      const result = await updateMilestoneProgress(goalId, milestoneId, request)
      get().applyProgress(goalId, { itemType: GoalItemType.Milestone, itemId: milestoneId }, result)
      toast.success("Progress updated.")
      await get().loadStats()
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to update progress."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },

  updateTaskProgress: async (goalId, taskId, request) => {
    attachToken()
    set({ isMutating: true })
    try {
      const result = await updateTaskProgress(goalId, taskId, request)
      get().applyProgress(goalId, { itemType: GoalItemType.Task, itemId: taskId }, result)
      toast.success("Progress updated.")
      await get().loadStats()
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to update progress."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },
}))
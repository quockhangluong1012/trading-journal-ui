import { create } from "zustand"
import { toast } from "sonner"
import { attachToken } from "@/lib/api"
import {
  addMilestone,
  addTask,
  createGoal,
  fetchGoalDetail,
  fetchGoals,
  updateGoalProgress,
  updateMilestoneProgress,
  updateTaskProgress,
  type AddMilestoneRequest,
  type AddTaskRequest,
  type CreateGoalRequest,
  type GoalDetail,
  type GoalSummary,
  type UpdateProgressRequest,
} from "@/lib/goals-api"

/** Pulls a backend `Result` failure description out of an axios error, if present. */
function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { errors?: { description?: string }[] } } })?.response?.data
  return data?.errors?.[0]?.description ?? fallback
}

interface GoalsState {
  goals: GoalSummary[]
  detail: GoalDetail | null
  includeCompleted: boolean
  isLoadingList: boolean
  isLoadingDetail: boolean
  isMutating: boolean

  loadGoals: (includeCompleted?: boolean) => Promise<void>
  loadDetail: (goalId: number) => Promise<void>
  clearDetail: () => void

  createGoal: (request: CreateGoalRequest) => Promise<number | null>
  addMilestone: (goalId: number, request: AddMilestoneRequest) => Promise<boolean>
  addTask: (goalId: number, request: AddTaskRequest) => Promise<boolean>
  updateGoalProgress: (goalId: number, request: UpdateProgressRequest) => Promise<boolean>
  updateMilestoneProgress: (goalId: number, milestoneId: number, request: UpdateProgressRequest) => Promise<boolean>
  updateTaskProgress: (goalId: number, taskId: number, request: UpdateProgressRequest) => Promise<boolean>
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  detail: null,
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

  loadDetail: async (goalId) => {
    attachToken()
    set({ isLoadingDetail: true })
    try {
      const detail = await fetchGoalDetail(goalId)
      set({ detail })
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to load goal."))
      set({ detail: null })
    } finally {
      set({ isLoadingDetail: false })
    }
  },

  clearDetail: () => set({ detail: null }),

  createGoal: async (request) => {
    attachToken()
    set({ isMutating: true })
    try {
      const id = await createGoal(request)
      toast.success("Goal created.")
      await get().loadGoals()
      return id
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to create goal."))
      return null
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

  updateGoalProgress: async (goalId, request) => {
    attachToken()
    set({ isMutating: true })
    try {
      await updateGoalProgress(goalId, request)
      toast.success("Progress updated.")
      await get().loadDetail(goalId)
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
      await updateMilestoneProgress(goalId, milestoneId, request)
      toast.success("Progress updated.")
      await get().loadDetail(goalId)
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
      await updateTaskProgress(goalId, taskId, request)
      toast.success("Progress updated.")
      await get().loadDetail(goalId)
      return true
    } catch (error) {
      toast.error(apiErrorMessage(error, "Failed to update progress."))
      return false
    } finally {
      set({ isMutating: false })
    }
  },
}))

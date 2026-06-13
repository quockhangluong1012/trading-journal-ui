import { api, type ApiResponse } from "./api"
import type {
  GoalActivitySourceType,
  GoalItemType,
  GoalMetricSource,
  MetricDirection,
  TrackingMode,
} from "./enum/GoalEnums"

// ─── Tracking ─────────────────────────────────────────────────────────

/** Mirrors backend TrackingSnapshot — the computed state of any trackable item. */
export interface TrackingSnapshot {
  mode: TrackingMode
  source: GoalMetricSource | null
  metricName: string | null
  metricUnit: string | null
  direction: MetricDirection | null
  startValue: number | null
  currentValue: number | null
  targetValue: number | null
  progressPercent: number
  isCompleted: boolean
  completedDate: string | null
}

/** Mirrors backend TrackingInput — how an item should be tracked, sent on create. */
export interface TrackingInput {
  mode: TrackingMode
  metricName?: string | null
  metricUnit?: string | null
  direction?: MetricDirection | null
  startValue?: number | null
  targetValue?: number | null
  /** When set, the metric is auto-tracked from app activity and cannot be updated manually. */
  source?: GoalMetricSource | null
}

// ─── Views ────────────────────────────────────────────────────────────

export interface GoalTaskView {
  id: number
  milestoneId: number | null
  title: string
  description: string | null
  dueDate: string | null
  sortOrder: number
  tracking: TrackingSnapshot
}

export interface GoalMilestoneView {
  id: number
  title: string
  description: string | null
  dueDate: string | null
  sortOrder: number
  tracking: TrackingSnapshot
  tasks: GoalTaskView[]
}

export interface ProgressEntryView {
  id: number
  itemType: GoalItemType
  milestoneId: number | null
  taskId: number | null
  previousValue: number | null
  currentValue: number | null
  previousIsCompleted: boolean
  currentIsCompleted: boolean
  note: string | null
  recordedAt: string
}

export interface GoalActivityView {
  id: number
  itemType: GoalItemType
  itemId: number
  metricSource: GoalMetricSource
  sourceType: GoalActivitySourceType
  sourceId: number
  delta: number
  completedItem: boolean
  recordedAt: string
}

export interface GoalSummary {
  id: number
  title: string
  description: string | null
  startDate: string | null
  dueDate: string | null
  tracking: TrackingSnapshot
  milestoneCount: number
  taskCount: number
  completedTaskCount: number
  createdDate: string
  updatedDate: string | null
}

export interface GoalDetail {
  id: number
  title: string
  description: string | null
  startDate: string | null
  dueDate: string | null
  tracking: TrackingSnapshot
  milestones: GoalMilestoneView[]
  tasks: GoalTaskView[]
  progressHistory: ProgressEntryView[]
  activityHistory: GoalActivityView[]
  createdDate: string
  updatedDate: string | null
}

export interface ProgressResult {
  currentValue: number | null
  progressPercent: number
  isCompleted: boolean
  completedDate: string | null
}

// ─── Request payloads ─────────────────────────────────────────────────

export interface CreateGoalRequest {
  title: string
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
  tracking: TrackingInput
}

export interface AddMilestoneRequest {
  title: string
  description?: string | null
  dueDate?: string | null
  sortOrder: number
  tracking: TrackingInput
}

export interface AddTaskRequest {
  milestoneId?: number | null
  title: string
  description?: string | null
  dueDate?: string | null
  sortOrder: number
  tracking: TrackingInput
}

export interface UpdateProgressRequest {
  /** Required for manual tracking; must be omitted for metric tracking. */
  isCompleted?: boolean | null
  /** Required for (non-auto) metric tracking; must be omitted for manual tracking. */
  value?: number | null
  note?: string | null
}

// ─── API functions ────────────────────────────────────────────────────

export async function fetchGoals(includeCompleted = false): Promise<GoalSummary[]> {
  const res = await api.get<ApiResponse<GoalSummary[]>>(
    `/v1/goals?includeCompleted=${includeCompleted}`,
  )
  return res.data.value
}

export async function fetchGoalDetail(goalId: number): Promise<GoalDetail> {
  const res = await api.get<ApiResponse<GoalDetail>>(`/v1/goals/${goalId}`)
  return res.data.value
}

export async function createGoal(request: CreateGoalRequest): Promise<number> {
  const res = await api.post<ApiResponse<number>>("/v1/goals", request)
  return res.data.value
}

export async function addMilestone(
  goalId: number,
  request: AddMilestoneRequest,
): Promise<number> {
  const res = await api.post<ApiResponse<number>>(
    `/v1/goals/${goalId}/milestones`,
    request,
  )
  return res.data.value
}

export async function addTask(goalId: number, request: AddTaskRequest): Promise<number> {
  const res = await api.post<ApiResponse<number>>(`/v1/goals/${goalId}/tasks`, request)
  return res.data.value
}

export async function updateGoalProgress(
  goalId: number,
  request: UpdateProgressRequest,
): Promise<ProgressResult> {
  const res = await api.patch<ApiResponse<ProgressResult>>(
    `/v1/goals/${goalId}/progress`,
    request,
  )
  return res.data.value
}

export async function updateMilestoneProgress(
  goalId: number,
  milestoneId: number,
  request: UpdateProgressRequest,
): Promise<ProgressResult> {
  const res = await api.patch<ApiResponse<ProgressResult>>(
    `/v1/goals/${goalId}/milestones/${milestoneId}/progress`,
    request,
  )
  return res.data.value
}

export async function updateTaskProgress(
  goalId: number,
  taskId: number,
  request: UpdateProgressRequest,
): Promise<ProgressResult> {
  const res = await api.patch<ApiResponse<ProgressResult>>(
    `/v1/goals/${goalId}/tasks/${taskId}/progress`,
    request,
  )
  return res.data.value
}

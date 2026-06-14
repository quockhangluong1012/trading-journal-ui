import { api, type ApiPaginatedResponse, type ApiResponse } from "./api"
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
  /** Progress rolled up from this milestone's tasks (own progress if it has none). */
  rollupProgressPercent: number
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
  /** Progress rolled up from milestones + tasks (own progress if it has none). */
  rollupProgressPercent: number
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
  /** Progress rolled up from milestones + tasks (own progress if it has none). */
  rollupProgressPercent: number
  milestones: GoalMilestoneView[]
  tasks: GoalTaskView[]
  progressHistory: ProgressEntryView[]
  activityHistory: GoalActivityView[]
  createdDate: string
  updatedDate: string | null
}

export interface GoalStats {
  activeCount: number
  completedCount: number
  averageProgressPercent: number
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

/** Edit a goal's metadata. `tracking` is optional — omit to leave tracking as-is. */
export interface UpdateGoalRequest {
  title: string
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
  tracking?: TrackingInput | null
}

export interface UpdateMilestoneRequest {
  title: string
  description?: string | null
  dueDate?: string | null
  tracking?: TrackingInput | null
}

export interface UpdateTaskRequest {
  title: string
  description?: string | null
  dueDate?: string | null
  milestoneId?: number | null
  tracking?: TrackingInput | null
}

export interface ReorderEntry {
  itemType: GoalItemType
  id: number
  sortOrder: number
}

export interface ReorderRequest {
  items: ReorderEntry[]
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

// ─── Stats ────────────────────────────────────────────────────────────

export async function fetchGoalStats(): Promise<GoalStats> {
  const res = await api.get<ApiResponse<GoalStats>>("/v1/goals/stats")
  return res.data.value
}

// ─── Paginated history ────────────────────────────────────────────────

export async function fetchGoalProgressHistory(
  goalId: number,
  page = 1,
  pageSize = 50,
): Promise<ApiPaginatedResponse<ProgressEntryView>["value"]> {
  const res = await api.get<ApiPaginatedResponse<ProgressEntryView>>(
    `/v1/goals/${goalId}/history/progress?page=${page}&pageSize=${pageSize}`,
  )
  return res.data.value
}

export async function fetchGoalActivityHistory(
  goalId: number,
  page = 1,
  pageSize = 50,
): Promise<ApiPaginatedResponse<GoalActivityView>["value"]> {
  const res = await api.get<ApiPaginatedResponse<GoalActivityView>>(
    `/v1/goals/${goalId}/history/activity?page=${page}&pageSize=${pageSize}`,
  )
  return res.data.value
}

// ─── Edit / delete / reorder ──────────────────────────────────────────

export async function updateGoal(goalId: number, request: UpdateGoalRequest): Promise<void> {
  await api.patch<ApiResponse<unknown>>(`/v1/goals/${goalId}`, request)
}

export async function updateMilestone(
  goalId: number,
  milestoneId: number,
  request: UpdateMilestoneRequest,
): Promise<void> {
  await api.patch<ApiResponse<unknown>>(`/v1/goals/${goalId}/milestones/${milestoneId}`, request)
}

export async function updateTask(
  goalId: number,
  taskId: number,
  request: UpdateTaskRequest,
): Promise<void> {
  await api.patch<ApiResponse<unknown>>(`/v1/goals/${goalId}/tasks/${taskId}`, request)
}

export async function deleteGoal(goalId: number): Promise<void> {
  await api.delete<ApiResponse<unknown>>(`/v1/goals/${goalId}`)
}

export async function deleteMilestone(goalId: number, milestoneId: number): Promise<void> {
  await api.delete<ApiResponse<unknown>>(`/v1/goals/${goalId}/milestones/${milestoneId}`)
}

export async function deleteTask(goalId: number, taskId: number): Promise<void> {
  await api.delete<ApiResponse<unknown>>(`/v1/goals/${goalId}/tasks/${taskId}`)
}

export async function reorderItems(goalId: number, request: ReorderRequest): Promise<void> {
  await api.patch<ApiResponse<unknown>>(`/v1/goals/${goalId}/reorder`, request)
}

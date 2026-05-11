import { api, ApiResponse, ApiPaginatedResponse } from "./api";

// ─── Enums ────────────────────────────────────────────────────────────

export enum LessonCategory {
  RiskManagement = 0,
  EntryTiming = 1,
  ExitTiming = 2,
  PositionSizing = 3,
  EmotionalControl = 4,
  SetupDiscipline = 5,
  MarketBias = 6,
  Overtrading = 7,
  Other = 99,
}

export enum LessonSeverity {
  Minor = 0,
  Moderate = 1,
  Critical = 2,
}

export enum LessonStatus {
  New = 0,
  Reviewing = 1,
  Applied = 2,
  Archived = 3,
}

export enum LessonSortOption {
  Newest = 0,
  Oldest = 1,
  HighestImpact = 2,
  LowestImpact = 3,
  MostLinkedTrades = 4,
  TitleAsc = 5,
}

export const LessonCategoryLabels: Record<LessonCategory, string> = {
  [LessonCategory.RiskManagement]: "Risk Management",
  [LessonCategory.EntryTiming]: "Entry Timing",
  [LessonCategory.ExitTiming]: "Exit Timing",
  [LessonCategory.PositionSizing]: "Position Sizing",
  [LessonCategory.EmotionalControl]: "Emotional Control",
  [LessonCategory.SetupDiscipline]: "Setup Discipline",
  [LessonCategory.MarketBias]: "Market Bias",
  [LessonCategory.Overtrading]: "Overtrading",
  [LessonCategory.Other]: "Other",
};

export const LessonSeverityLabels: Record<LessonSeverity, string> = {
  [LessonSeverity.Minor]: "Minor",
  [LessonSeverity.Moderate]: "Moderate",
  [LessonSeverity.Critical]: "Critical",
};

export const LessonStatusLabels: Record<LessonStatus, string> = {
  [LessonStatus.New]: "New",
  [LessonStatus.Reviewing]: "Reviewing",
  [LessonStatus.Applied]: "Applied",
  [LessonStatus.Archived]: "Archived",
};

export const LessonSortLabels: Record<LessonSortOption, string> = {
  [LessonSortOption.Newest]: "Newest first",
  [LessonSortOption.Oldest]: "Oldest first",
  [LessonSortOption.HighestImpact]: "Highest impact",
  [LessonSortOption.LowestImpact]: "Lowest impact",
  [LessonSortOption.MostLinkedTrades]: "Most linked trades",
  [LessonSortOption.TitleAsc]: "Title A-Z",
};

// ─── DTOs ─────────────────────────────────────────────────────────────

export interface LessonLearnedDto {
  id: number;
  title: string;
  category: LessonCategory;
  severity: LessonSeverity;
  status: LessonStatus;
  tags: string[];
  keyTakeaway: string | null;
  impactScore: number;
  linkedTradesCount: number;
  createdDate: string;
}

export interface LinkedTradeDto {
  id: number;
  asset: string;
  position: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  tradingResult: string | null;
  date: string;
  isRuleBroken: boolean;
}

export interface LessonLearnedDetailDto {
  id: number;
  title: string;
  content: string;
  category: LessonCategory;
  severity: LessonSeverity;
  status: LessonStatus;
  tags: string[];
  keyTakeaway: string | null;
  actionItems: string | null;
  impactScore: number;
  createdDate: string;
  updatedDate: string | null;
  linkedTrades: LinkedTradeDto[];
}

export interface DisciplineRuleDto {
  id: number;
  name: string;
  description: string | null;
  category: LessonCategory;
  isActive: boolean;
  sortOrder: number;
  createdDate: string;
}

export interface DisciplineLogDto {
  id: number;
  disciplineRuleId: number;
  ruleName: string;
  tradeHistoryId: number | null;
  tradeAsset: string | null;
  wasFollowed: boolean;
  notes: string | null;
  date: string;
}

export interface CategoryBreakdownItem {
  category: LessonCategory;
  count: number;
  percentage: number;
}

export interface DisciplineTimePoint {
  date: string;
  score: number;
  totalChecks: number;
  followed: number;
}

export interface LessonsDashboardDto {
  totalLessons: number;
  activeLessons: number;
  appliedLessons: number;
  criticalLessons: number;
  categoryBreakdown: CategoryBreakdownItem[];
  disciplineScore: number;
  disciplineScoreTrend: number;
  totalRulesChecked: number;
  totalRulesFollowed: number;
  totalRulesBroken: number;
  disciplineTimeline: DisciplineTimePoint[];
  recentLessons: LessonLearnedDto[];
  topImpactLessons: LessonLearnedDto[];
  totalLossFromLinkedTrades: number;
  linkedTradesCount: number;
}

// ─── Request DTOs ─────────────────────────────────────────────────────

export interface CreateLessonRequest {
  title: string;
  content: string;
  category: LessonCategory;
  severity: LessonSeverity;
  keyTakeaway: string | null;
  actionItems: string | null;
  impactScore: number;
  linkedTradeIds: number[] | null;
  tags: string[] | null;
}

export interface UpdateLessonRequest {
  id: number;
  title: string;
  content: string;
  category: LessonCategory;
  severity: LessonSeverity;
  status: LessonStatus;
  keyTakeaway: string | null;
  actionItems: string | null;
  impactScore: number;
  tags: string[] | null;
}

export interface SearchLessonsRequest {
  category?: LessonCategory | null;
  severity?: LessonSeverity | null;
  status?: LessonStatus | null;
  minimumImpactScore?: number | null;
  linkedTradesOnly?: boolean;
  sortBy?: LessonSortOption | null;
  tags?: string[] | null;
  searchTerm?: string | null;
  page: number;
  pageSize: number;
}

export function parseLessonTags(rawValue: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const rawTag of rawValue.split(",")) {
    const tag = rawTag.trim().slice(0, 32)

    if (!tag) {
      continue
    }

    if (tags.length >= 8) {
      break
    }

    // Match backend case-insensitive tag deduplication.
    const dedupeKey = tag.toLowerCase()
    if (seen.has(dedupeKey)) {
      continue
    }

    seen.add(dedupeKey)
    tags.push(tag)
  }

  return tags
}

export function formatLessonTags(tags: string[] | null | undefined): string {
  return tags?.join(", ") ?? ""
}

export interface CreateDisciplineRuleRequest {
  name: string;
  description: string | null;
  category: LessonCategory;
  sortOrder: number;
}

export interface UpdateDisciplineRuleRequest {
  id: number;
  name: string;
  description: string | null;
  category: LessonCategory;
  isActive: boolean;
  sortOrder: number;
}

export interface LogDisciplineRequest {
  disciplineRuleId: number;
  tradeHistoryId: number | null;
  wasFollowed: boolean;
  notes: string | null;
  date: string;
}

export interface SearchDisciplineLogsRequest {
  disciplineRuleId?: number | null;
  tradeHistoryId?: number | null;
  wasFollowed?: boolean | null;
  fromDate?: string | null;
  toDate?: string | null;
  page: number;
  pageSize: number;
}

// ─── Lessons API ──────────────────────────────────────────────────────

export async function createLesson(data: CreateLessonRequest) {
  return api.post<ApiResponse<number>>("/v1/lessons", data);
}

export async function searchLessons(data: SearchLessonsRequest) {
  return api.post<ApiPaginatedResponse<LessonLearnedDto>>("/v1/lessons/search", data);
}

export async function getLessonDetail(id: number) {
  return api.get<ApiResponse<LessonLearnedDetailDto>>(`/v1/lessons/${id}`);
}

export async function updateLesson(id: number, data: UpdateLessonRequest) {
  return api.put(`/v1/lessons/${id}`, data);
}

export async function deleteLesson(id: number) {
  return api.delete(`/v1/lessons/${id}`);
}

export async function linkTradesToLesson(lessonId: number, tradeIds: number[]) {
  return api.post<ApiResponse<unknown>>(`/v1/lessons/${lessonId}/trades`, tradeIds);
}

export async function unlinkTradeFromLesson(lessonId: number, tradeId: number) {
  return api.delete(`/v1/lessons/${lessonId}/trades/${tradeId}`);
}

export async function getLessonsDashboard() {
  return api.get<ApiResponse<LessonsDashboardDto>>("/v1/lessons/dashboard");
}

// ─── Discipline API ───────────────────────────────────────────────────

export async function getDisciplineRules() {
  return api.get<ApiResponse<DisciplineRuleDto[]>>("/v1/discipline/rules");
}

export async function createDisciplineRule(data: CreateDisciplineRuleRequest) {
  return api.post<ApiResponse<number>>("/v1/discipline/rules", data);
}

export async function updateDisciplineRule(id: number, data: UpdateDisciplineRuleRequest) {
  return api.put(`/v1/discipline/rules/${id}`, data);
}

export async function deleteDisciplineRule(id: number) {
  return api.delete(`/v1/discipline/rules/${id}`);
}

export async function logDiscipline(data: LogDisciplineRequest) {
  return api.post<ApiResponse<number>>("/v1/discipline/log", data);
}

export async function searchDisciplineLogs(data: SearchDisciplineLogsRequest) {
  return api.post<ApiPaginatedResponse<DisciplineLogDto>>("/v1/discipline/log/search", data);
}

import { api, ApiResponse } from "./api";

// ─── Dashboard Metrics ───────────────────────────────────
export interface RegistrationData {
  date: string;
  userSignups: number;
}

export interface SystemMetricsDto {
  totalUsers: number;
  totalStaff: number;
  activeUsers: number;
  activeStaff: number;
  registrationChart: RegistrationData[];
}

export async function getSystemMetrics() {
  return api.get<ApiResponse<SystemMetricsDto>>("/v1/auth/admin/metrics");
}

// ─── Staffs ──────────────────────────────────────────────
export interface StaffDto {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
  createdDate: string;
}

export async function getStaffs() {
  return api.get<ApiResponse<StaffDto[]>>("/v1/auth/staffs");
}

export async function getStaffDetail(id: number) {
  return api.get<ApiResponse<StaffDto>>(`/v1/auth/staffs/${id}`);
}

export async function createStaff(data: any) {
  return api.post<ApiResponse<number>>("/v1/auth/staffs", data);
}

export async function updateStaff(data: any) {
  return api.put<ApiResponse<boolean>>(`/v1/auth/staffs/${data.id}`, data);
}

export async function deleteStaff(id: number) {
  return api.delete<ApiResponse<boolean>>(`/v1/auth/staffs/${id}`);
}

// ─── Emotion Tags ────────────────────────────────────────
export interface EmotionTagDto {
  id: number;
  name: string;
  emotionType: number; // 1=Positive, 2=Negative, 3=Neutral
}

export async function getEmotionTags() {
  return api.get<ApiResponse<EmotionTagDto[]>>("/v1/emotions");
}

export async function createEmotionTag(data: { name: string; emotionType: number }) {
  return api.post<ApiResponse<number>>("/v1/emotions", data);
}

export async function deleteEmotionTag(id: number) {
  return api.delete<ApiResponse<boolean>>(`/v1/emotions/${id}`);
}

// ─── Technical Analysis Tags ─────────────────────────────
export interface TechnicalAnalysisTagDto {
  id: number;
  name: string;
  shortName: string | null;
  description: string | null;
}

export async function getTechnicalAnalysisTags() {
  return api.get<ApiResponse<TechnicalAnalysisTagDto[]>>("/v1/technical-analysis");
}

export async function createTechnicalAnalysis(data: { name: string; shortName?: string; description?: string }) {
  return api.post<ApiResponse<number>>("/v1/technical-analysis", data);
}

export async function updateTechnicalAnalysis(data: { id: number; name: string; shortName?: string; description?: string }) {
  return api.put<ApiResponse<boolean>>("/v1/technical-analysis", data);
}

export async function deleteTechnicalAnalysis(id: number) {
  return api.delete<ApiResponse<boolean>>(`/v1/technical-analysis/${id}`);
}

// ─── Trading Zones ───────────────────────────────────────
export interface TradingZoneDto {
  id: number;
  name: string;
  fromTime: string;
  toTime: string;
  description: string | null;
}

export async function getTradingZones() {
  return api.get<ApiResponse<TradingZoneDto[]>>("/v1/trading-zones");
}

export async function createTradingZone(data: { name: string; fromTime: string; toTime: string; description?: string }) {
  return api.post<ApiResponse<number>>("/v1/trading-zones", data);
}

export async function updateTradingZone(data: { id: number; name: string; fromTime: string; toTime: string; description?: string }) {
  return api.put<ApiResponse<boolean>>("/v1/trading-zones", data);
}

export async function deleteTradingZone(id: number) {
  return api.delete<ApiResponse<boolean>>(`/v1/trading-zones/${id}`);
}

// ─── Checklist Models ────────────────────────────────────
export interface ChecklistModelDto {
  id: number;
  name: string;
  description: string | null;
  criteriaCount: number;
}

export interface ChecklistCriteriaDto {
  id: number;
  name: string;
  checkListType: number; // 1=MarketStructure, 2=TradingSetup, 3=RiskManagement, 4=Psychology
}

export interface ChecklistModelDetailDto {
  id: number;
  name: string;
  description: string | null;
  criteria: ChecklistCriteriaDto[];
}

export async function getChecklistModels() {
  return api.get<ApiResponse<ChecklistModelDto[]>>("/v1/checklist-models");
}

export async function getChecklistModelDetail(id: number) {
  return api.get<ApiResponse<ChecklistModelDetailDto>>(`/v1/checklist-models/${id}`);
}

export async function createChecklistModel(data: { name: string; description?: string }) {
  return api.post<ApiResponse<number>>("/v1/checklist-models", data);
}

export async function updateChecklistModel(data: { id: number; name: string; description?: string }) {
  return api.put<ApiResponse<boolean>>("/v1/checklist-models", data);
}

export async function addCriteriaToModel(modelId: number, data: { name: string; type: number }) {
  return api.post<ApiResponse<number>>(`/v1/checklist-models/${modelId}/criteria`, data);
}

// ─── Pretrade Checklists (standalone) ────────────────────
export interface PretradeChecklistDto {
  id: number;
  name: string;
  checkListType: number; // 1=MarketStructure, 2=TradingSetup, 3=RiskManagement, 4=Psychology
}

export async function getPretradeChecklists(userId?: number) {
  return api.get<ApiResponse<PretradeChecklistDto[]>>(`/v1/pretrade-checklists${userId ? `?userId=${userId}` : ""}`);
}

export async function createPretradeChecklist(data: { name: string; type: number }) {
  return api.post<ApiResponse<number>>("/v1/pretrade-checklists", data);
}

export async function updatePretradeChecklist(data: { id: number; name: string; type: number }) {
  return api.put<ApiResponse<boolean>>("/v1/pretrade-checklists", data);
}

export async function deletePretradeChecklist(id: number) {
  return api.delete<ApiResponse<boolean>>(`/v1/pretrade-checklists/${id}`);
}

// ─── Enum Labels ─────────────────────────────────────────
export const EmotionTypeLabels: Record<number, string> = {
  1: "Positive",
  2: "Negative",
  3: "Neutral",
};

export const EmotionTypeColors: Record<number, string> = {
  1: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  2: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  3: "text-slate-400 bg-slate-400/10 border-slate-400/20",
};

export const ChecklistTypeLabels: Record<number, string> = {
  1: "Market Structure",
  2: "Trading Setup",
  3: "Risk Management",
  4: "Psychology",
};

export const ChecklistTypeColors: Record<number, string> = {
  1: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  2: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  3: "text-red-400 bg-red-400/10 border-red-400/20",
  4: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

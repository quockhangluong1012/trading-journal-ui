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

// ─── Pretrade Checklists ──────────────────────────────────
export interface PretradeChecklistDto {
  id: number;
  name: string;
  checklistModelId: number;
  checklistModelName: string;
  createdDate: string;
}

export async function getPretradeChecklists() {
  return api.get<ApiResponse<PretradeChecklistDto[]>>("/v1/trades/pretrade-checklists");
}

export async function createPretradeChecklist(data: { name: string; checklistModelId: number }) {
  return api.post<ApiResponse<number>>("/v1/trades/pretrade-checklists", data);
}

export async function updatePretradeChecklist(id: number, data: { name: string; checklistModelId: number }) {
  return api.put<ApiResponse<boolean>>(`/v1/trades/pretrade-checklists/${id}`, data);
}

export async function deletePretradeChecklist(id: number) {
  return api.delete<ApiResponse<boolean>>(`/v1/trades/pretrade-checklists/${id}`);
}

// ─── Backtest Assets ──────────────────────────────────────
export interface AssetDto {
  id: number;
  displayName: string;
  symbol: string;
  category: string;
  dataProvider: string;
  syncStatus: string;
  dataStartDate: string;
  dataEndDate: string | null;
  lastSyncedDate: string | null;
  totalCandles: number;
  lastError: string | null;
  createdDate: string;
}

export interface AdminCreateAssetRequest {
  displayName: string;
  symbol: string;
  category: "Forex" | "Metals" | "Futures" | "Crypto" | "Indices" | string;
  dataProvider: "TwelveData" | "AlphaVantage" | "CSV" | string;
  dataStartDate: string;
  dataEndDate: string | null;
  defaultSpreadPips: number;
  pipType: number;
}

export async function getBacktestAssets() {
  return api.get<ApiResponse<AssetDto[]>>("/v1/admin/backtest");
}

export async function createBacktestAsset(data: AdminCreateAssetRequest) {
  return api.post<ApiResponse<number>>("/v1/admin/backtest", data);
}

export async function deleteBacktestAsset(id: number) {
  return api.delete<ApiResponse<boolean>>(`/v1/admin/backtest/${id}`);
}

export interface CsvImportJobDto {
  id: number;
  fileName: string;
  status: "Pending" | "Processing" | "Completed" | "Failed";
  importedCandles: number;
  skippedDuplicates: number;
  errorMessage: string | null;
  processedDate: string | null;
  createdDate: string;
}

export async function bulkUploadCsvFiles(assetId: number, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return api.post<ApiResponse<{ queuedFiles: number; jobIds: number[] }>>(
    `/v1/admin/backtest/${assetId}/bulk-import`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
}

export async function getImportJobs(assetId: number) {
  return api.get<ApiResponse<CsvImportJobDto[]>>(
    `/v1/admin/backtest/${assetId}/import-jobs`
  );
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

// ─── Pip Type Enum ───────────────────────────────────────
// Maps to backend AssetPipType enum
export enum PipType {
  Standard = 0,  // 0.0001 — Forex majors (EUR/USD, GBP/USD)
  JpyPair = 1,   // 0.01   — JPY pairs (USD/JPY, EUR/JPY)
  Metal = 2,     // 0.01   — Precious metals (XAU/USD)
  Crypto = 3,    // 0.01   — Crypto (BTC/USDT)
  Index = 4,     // 0.25   — Indices/Futures (NQ, ES)
  WholePip = 5,  // 1.0    — Exotic/custom
}

export const PipTypeLabels: Record<number, string> = {
  [PipType.Standard]: "Standard (0.0001)",
  [PipType.JpyPair]: "JPY Pair (0.01)",
  [PipType.Metal]: "Metal (0.01)",
  [PipType.Crypto]: "Crypto (0.01)",
  [PipType.Index]: "Index (0.25)",
  [PipType.WholePip]: "Whole Pip (1.0)",
};

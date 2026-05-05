import { api, type ApiResponse } from "@/lib/api";
import { attachToken } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────

export interface DailyNoteDto {
  id: number;
  noteDate: string;
  dailyBias: string;
  marketStructureNotes: string;
  keyLevelsAndLiquidity: string;
  newsAndEvents: string;
  sessionFocus: string;
  riskAppetite: string;
  mentalState: string;
  keyRulesAndReminders: string;
  createdDate: string;
  updatedDate: string | null;
}

export interface DailyNoteSummaryDto {
  id: number;
  noteDate: string;
  dailyBias: string;
  sessionFocus: string;
  riskAppetite: string;
  mentalState: string;
  filledFieldsCount: number;
  createdDate: string;
  updatedDate: string | null;
}

export interface UpsertDailyNoteRequest {
  noteDate: string;
  dailyBias: string;
  marketStructureNotes: string;
  keyLevelsAndLiquidity: string;
  newsAndEvents: string;
  sessionFocus: string;
  riskAppetite: string;
  mentalState: string;
  keyRulesAndReminders: string;
}

// ─── API Calls ────────────────────────────────────────────────────────

export async function getDailyNote(date: string) {
  attachToken();
  return api.get<ApiResponse<DailyNoteDto | null>>(`/v1/daily-notes/${date}`);
}

export async function getDailyNotes(startDate?: string, endDate?: string) {
  attachToken();
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const qs = params.toString();
  return api.get<ApiResponse<DailyNoteSummaryDto[]>>(
    `/v1/daily-notes${qs ? `?${qs}` : ""}`
  );
}

export async function upsertDailyNote(data: UpsertDailyNoteRequest) {
  attachToken();
  return api.put<ApiResponse<DailyNoteDto>>("/v1/daily-notes", data);
}

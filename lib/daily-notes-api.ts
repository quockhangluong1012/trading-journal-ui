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

export async function upsertDailyNote(data: UpsertDailyNoteRequest) {
  attachToken();
  return api.put<ApiResponse<DailyNoteDto>>("/v1/daily-notes", data);
}

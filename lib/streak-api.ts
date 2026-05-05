import { api } from "./api";

export interface StreakData {
  streakType: "None" | "Win" | "Loss";
  length: number;
  streakPnl: number;
  bestWinStreak: number;
  worstLossStreak: number;
  totalClosedTrades: number;
  recordedAt: string;
}

interface ApiResponse<T> {
  isSuccess: boolean;
  value: T;
  errors: string[];
}

export async function getCurrentStreak(): Promise<StreakData> {
  const res = await api.get<ApiResponse<StreakData>>("/v1/streaks/current");
  return res.data.value;
}

export async function recalculateStreak(): Promise<StreakData> {
  const res = await api.post<ApiResponse<StreakData>>("/v1/streaks/recalculate");
  return res.data.value;
}

export async function getStreakHistory(days: number = 30): Promise<StreakData[]> {
  const res = await api.get<ApiResponse<StreakData[]>>(`/v1/streaks/history?days=${days}`);
  return res.data.value;
}

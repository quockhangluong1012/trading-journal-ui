import { api } from "./api";

export interface TiltScore {
  score: number;
  level: string;
  consecutiveLosses: number;
  consecutiveWins: number;
  tradesLastHour: number;
  ruleBreaksToday: number;
  todayPnl: number;
  circuitBreakerTriggered: boolean;
  cooldownUntil: string | null;
  recordedAt: string;
}

interface ApiResponse<T> {
  isSuccess: boolean;
  value: T;
  errors: string[];
}

export async function getTiltScore(): Promise<TiltScore> {
  const res = await api.get<ApiResponse<TiltScore>>("/api/v1/tilt/score");
  return res.data.value;
}

export async function recalculateTilt(): Promise<TiltScore> {
  const res = await api.post<ApiResponse<TiltScore>>("/api/v1/tilt/recalculate");
  return res.data.value;
}

export async function getTiltHistory(days: number = 30): Promise<TiltScore[]> {
  const res = await api.get<ApiResponse<TiltScore[]>>(`/api/v1/tilt/history?days=${days}`);
  return res.data.value;
}

import { api } from "./api";

// ── Types ────────────────────────────────────────────────────────────

export interface KarmaEvent {
  actionType: string;
  points: number;
  description: string;
  recordedAt: string;
}

export interface KarmaSummary {
  totalKarma: number;
  level: number;
  title: string;
  pointsToNextLevel: number;
  nextLevelThreshold: number;
  levelProgress: number;
  totalAchievements: number;
  unlockedAchievements: number;
  currentJournalingStreak: number;
  recentEvents: KarmaEvent[];
}

export interface Achievement {
  type: string;
  name: string;
  description: string;
  emoji: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  category: string;
}

interface ApiResponse<T> {
  isSuccess: boolean;
  value: T;
  errors: string[];
}

// ── API Functions ────────────────────────────────────────────────────

export async function getKarmaSummary(): Promise<KarmaSummary> {
  const res = await api.get<ApiResponse<KarmaSummary>>("/v1/karma/summary");
  return res.data.value;
}

export async function getKarmaHistory(days: number = 30): Promise<KarmaEvent[]> {
  const res = await api.get<ApiResponse<KarmaEvent[]>>(`/v1/karma/history?days=${days}`);
  return res.data.value;
}

export async function getAchievements(): Promise<Achievement[]> {
  const res = await api.get<ApiResponse<Achievement[]>>("/v1/karma/achievements");
  return res.data.value;
}

export async function recalculateKarma(): Promise<KarmaSummary> {
  const res = await api.post<ApiResponse<KarmaSummary>>("/v1/karma/recalculate");
  return res.data.value;
}

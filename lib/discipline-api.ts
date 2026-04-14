import { api, ApiResponse } from "./api";

export interface TradingProfileDto {
  id: number;
  maxTradesPerDay: number | null;
  maxDailyLossPercentage: number | null;
  maxConsecutiveLosses: number | null;
  isDisciplineEnabled: boolean;
}

export interface UpdateTradingProfileRequest {
  maxTradesPerDay: number | null;
  maxDailyLossPercentage: number | null;
  maxConsecutiveLosses: number | null;
  isDisciplineEnabled: boolean;
}

export async function getTradingProfile() {
  return api.get<ApiResponse<TradingProfileDto>>("/v1/trading-profiles");
}

export async function updateTradingProfile(data: UpdateTradingProfileRequest) {
  return api.post<ApiResponse<number>>("/v1/trading-profiles", data);
}

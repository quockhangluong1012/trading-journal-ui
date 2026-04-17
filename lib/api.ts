import axios from "axios";

import { buildRedirectWithNext, getLoginRouteForPath } from "@/lib/auth-redirect";

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
});

const AUTH_STORAGE_KEY = "trading-journey-auth-user"
const AUTH_TOKEN_COOKIE = "trading-journey-token"
const AUTH_ROLE_COOKIE = "trading-journey-role"

function getCookieAttributes(): string {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  return `Path=/; SameSite=Lax${secure}`;
}

export function syncAuthCookies(token?: string, isAdmin?: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  const attrs = getCookieAttributes();

  if (token) {
    document.cookie = `${AUTH_TOKEN_COOKIE}=${encodeURIComponent(token)}; ${attrs}`;
  } else {
    document.cookie = `${AUTH_TOKEN_COOKIE}=; Max-Age=0; ${attrs}`;
  }

  if (typeof isAdmin === "boolean") {
    document.cookie = `${AUTH_ROLE_COOKIE}=${isAdmin ? "admin" : "user"}; ${attrs}`;
  } else {
    document.cookie = `${AUTH_ROLE_COOKIE}=; Max-Age=0; ${attrs}`;
  }
}

export function clearAuthState(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  syncAuthCookies(undefined, undefined);
  delete api.defaults.headers.common["Authorization"];
}

export function clearAuthAndRedirectToLogin(): void {
  clearAuthState();

  const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const loginRoute = getLoginRouteForPath(window.location.pathname);

  window.location.assign(buildRedirectWithNext(loginRoute, nextPath));
}

export function attachToken(): void {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);

      if (user?.token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
        syncAuthCookies(user.token, Boolean(user.isAdmin));
      }
    }
  } catch {
    // Ignore parse errors
  }
}

let isRedirecting = false;

api.interceptors.response.use(
  (response) => {
    isRedirecting = false;
    return response;
  },
  (error) => {
    const status = error?.response?.status;

    if (status === 401 && typeof window !== "undefined") {
      const onLoginPage = window.location.pathname === "/login" || window.location.pathname === "/admin/login";

      if (!onLoginPage) {
        if (!isRedirecting) {
          isRedirecting = true;
          clearAuthAndRedirectToLogin();
        }
        return Promise.reject(error);
      }

      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);


export interface RiskGuardrailsDto {
  accountEquity?: number;
  riskPercentage?: number;
  maxDailyLoss?: number;
  takeProfit?: number;
  positionSize?: number;
}

export interface CreateTradeRequest {
  asset: string;
  position: number;
  entryPrice: number;
  targetTier1: number;
  targetTier2: number | null;
  targetTier3: number | null;
  stopLoss: number;
  notes: string;
  date: string;
  status: number;
  exitPrice: number | null;
  pnl: number | null;
  closedDate: string | null;
  screenshots: string[] | null;
  tradeTechnicalAnalysisTags: number[] | null;
  emotionTags: number[] | null;
  confidenceLevel: number;
  psychologyNotes: string | null;
  tradeHistoryChecklists: number[];
  tradingZoneId: number;
  tradingSessionId: number | null;
  riskGuardrail: RiskGuardrailsDto | null;
}

export type ApiResponse<T> = {
  isSuccess: boolean;
  value: T;
}

export type ApiPaginatedResponse<T> = {
  isSuccess: boolean;
  value: {
    values: T[];
    totalItems: number;
    hasMore: boolean
  };
};

export async function createTradeHistory(data: CreateTradeRequest) {
  return api.post<ApiResponse<number>>("/v1/trade-histories", data);
}

// Auth API
export interface AuthResponse {
  token: string;
  email: string;
  fullName: string;
  expiry: string;
  isAdmin?: boolean;
}

export async function loginUser(data: any) {
  return api.post<ApiResponse<AuthResponse>>("/v1/auth/login", data);
}

export async function loginStaff(data: any) {
  return api.post<ApiResponse<AuthResponse & { isAdmin: boolean }>>("/v1/auth/staff-login", data);
}

export async function registerUser(data: any) {
  return api.post<ApiResponse<number>>("/v1/auth/register", data);
}

// Backtesting API
export interface HistoricalDataFileInfo {
  asset: string;
  startDate: string;
  endDate: string;
  filePath: string;
  fileSizeBytes: number;
}

export async function getHistoricalDataFiles() {
  return api.get<ApiResponse<HistoricalDataFileInfo[]>>("/v1/backtests/historical-data");
}

export async function downloadHistoricalData(asset: string, startDate: string, endDate: string) {
  return api.post<ApiResponse<{ filePath: string, candleCount: number }>>("/v1/backtests/historical-data", {
    asset,
    startDate,
    endDate,
  });
}

export interface CreateBacktestRequest {
  strategyId: number;
  name: string;
  notes?: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
}

export async function createBacktest(data: CreateBacktestRequest) {
  return api.post<ApiResponse<number>>("/v1/backtests", data);
}

export async function getBacktests(strategyId?: number) {
  return api.get<ApiResponse<any[]>>(`/v1/backtests${strategyId ? `?StrategyId=${strategyId}` : ""}`);
}

export async function getBacktestDetail(id: number) {
  return api.get<ApiResponse<any>>(`/v1/backtests/${id}`);
}

export async function runBacktest(id: number) {
  return api.post<ApiResponse<any>>(`/v1/backtests/${id}/run`);
}

export async function deleteBacktest(id: number) {
  return api.delete<ApiResponse<boolean>>(`/v1/backtests/${id}`);
}

export { api };
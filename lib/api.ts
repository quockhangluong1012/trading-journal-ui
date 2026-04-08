import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
});

const AUTH_STORAGE_KEY = "trading-journey-auth-user"
const LOGOUT_ROUTE = "/login"

export function clearAuthAndRedirectToLogin(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.location.assign(LOGOUT_ROUTE);
}

export function attachToken(): void {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);

      if (user?.token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
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
      const onLoginPage = window.location.pathname === LOGOUT_ROUTE;

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
}

export async function loginUser(data: any) {
  return api.post<ApiResponse<AuthResponse>>("/v1/auth/login", data);
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
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
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

api.interceptors.response.use(
  (response) => {
    isRedirecting = false;
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error.config;

    if (status === 401 && typeof window !== "undefined") {
      const onLoginPage = window.location.pathname === "/login" || window.location.pathname === "/admin/login";

      if (onLoginPage) {
        return Promise.reject(error);
      }

      // Attempt silent token refresh
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const stored = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!stored) throw new Error("No auth state");

            const user = JSON.parse(stored);
            if (!user?.refreshToken || !user?.token) throw new Error("No refresh token");

            const res = await axios.post<ApiResponse<AuthResponse>>(
              `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
              { accessToken: user.token, refreshToken: user.refreshToken }
            );

            const newAuth = res.data.value;
            const updatedUser = { ...user, token: newAuth.token, refreshToken: newAuth.refreshToken, expiry: newAuth.expiry };
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
            api.defaults.headers.common["Authorization"] = `Bearer ${newAuth.token}`;
            syncAuthCookies(newAuth.token, Boolean(user.isAdmin));

            isRefreshing = false;
            onTokenRefreshed(newAuth.token);

            originalRequest.headers["Authorization"] = `Bearer ${newAuth.token}`;
            return api(originalRequest);
          } catch {
            isRefreshing = false;
            refreshSubscribers = [];

            if (!isRedirecting) {
              isRedirecting = true;
              clearAuthAndRedirectToLogin();
            }
            return Promise.reject(error);
          }
        } else {
          // Another request is already refreshing — queue this one
          return new Promise((resolve) => {
            addRefreshSubscriber((token: string) => {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
              resolve(api(originalRequest));
            });
          });
        }
      }

      if (!isRedirecting) {
        isRedirecting = true;
        clearAuthAndRedirectToLogin();
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);


// ─── Shared API Types ─────────────────────────────────────────────────

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
  refreshToken: string;
  email: string;
  fullName: string;
  expiry: string;
  isAdmin?: boolean;
}

// ─── Auth Request DTOs ────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export async function loginUser(data: LoginRequest) {
  return api.post<ApiResponse<AuthResponse>>("/v1/auth/login", data);
}

export async function loginStaff(data: LoginRequest) {
  return api.post<ApiResponse<AuthResponse & { isAdmin: boolean }>>("/v1/auth/staff-login", data);
}

export async function registerUser(data: RegisterRequest) {
  return api.post<ApiResponse<number>>("/v1/auth/register", data);
}

export { api };
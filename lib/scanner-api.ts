import { api } from "./api";

export enum IctPatternType {
  FVG = 1,
  OrderBlock = 2,
  BreakerBlock = 3,
  Liquidity = 4,
  LiquiditySweep = 5,
}

export enum ScannerTimeframe {
  M5 = 5,
  M15 = 15,
  H1 = 60,
  D1 = 1440,
}

export enum ScannerStatus {
  Stopped = 0,
  Running = 1,
  Error = 2,
}

export interface WatchlistAssetDto {
  id: number;
  symbol: string;
  displayName: string;
}

export interface WatchlistDto {
  id: number;
  name: string;
  isActive: boolean;
  isScannerRunning: boolean;
  assets: WatchlistAssetDto[];
}

export interface ScannerAlertDto {
  id: number;
  symbol: string;
  patternType: IctPatternType;
  timeframe: ScannerTimeframe;
  detectionTimeframe: ScannerTimeframe;
  priceAtDetection: number;
  zoneHighPrice?: number;
  zoneLowPrice?: number;
  description: string;
  confluenceScore: number;
  detectedAt: string;
  isDismissed: boolean;
}

export interface ScannerStatusDto {
  status: ScannerStatus;
  lastScanTime?: string;
  assetsScanned: number;
  activeAlerts: number;
}

export const scannerApi = {
  // Watchlists
  getWatchlists: async (): Promise<WatchlistDto[]> => {
    const response = await api.get("/v1/scanner/watchlists");
    return response.data?.value ?? response.data;
  },

  createWatchlist: async (name: string): Promise<WatchlistDto> => {
    const response = await api.post("/v1/scanner/watchlists", { name });
    return response.data?.value ?? response.data;
  },

  updateWatchlist: async (id: number, data: { name?: string; isActive?: boolean }): Promise<void> => {
    await api.put(`/v1/scanner/watchlists/${id}`, data);
  },

  deleteWatchlist: async (id: number): Promise<void> => {
    await api.delete(`/v1/scanner/watchlists/${id}`);
  },

  addAsset: async (watchlistId: number, symbol: string, displayName: string): Promise<WatchlistAssetDto> => {
    const response = await api.post(`/v1/scanner/watchlists/${watchlistId}/assets`, { symbol, displayName });
    return response.data?.value ?? response.data;
  },

  removeAsset: async (watchlistId: number, assetId: number): Promise<void> => {
    await api.delete(`/v1/scanner/watchlists/${watchlistId}/assets/${assetId}`);
  },

  // Per-Watchlist Scanner Control
  startWatchlistScanner: async (watchlistId: number): Promise<WatchlistDto> => {
    const response = await api.post(`/v1/scanner/watchlists/${watchlistId}/scanner/start`);
    return response.data?.value ?? response.data;
  },

  stopWatchlistScanner: async (watchlistId: number): Promise<WatchlistDto> => {
    const response = await api.post(`/v1/scanner/watchlists/${watchlistId}/scanner/stop`);
    return response.data?.value ?? response.data;
  },

  // Global Scanner Control (batch start/stop all)
  getStatus: async (): Promise<ScannerStatusDto> => {
    const response = await api.get("/v1/scanner/status");
    return response.data?.value ?? response.data;
  },

  startScanner: async (): Promise<void> => {
    await api.post("/v1/scanner/start");
  },

  stopScanner: async (): Promise<void> => {
    await api.post("/v1/scanner/stop");
  },

  // Alerts
  getAlerts: async (page: number = 1, limit: number = 50, activeOnly: boolean = true): Promise<{ items: ScannerAlertDto[], totalCount: number }> => {
    const response = await api.get(`/v1/scanner/alerts?pageNumber=${page}&pageSize=${limit}&activeOnly=${activeOnly}`);
    return response.data?.value ?? response.data;
  },

  dismissAlert: async (id: number): Promise<void> => {
    await api.put(`/v1/scanner/alerts/${id}/dismiss`);
  },

  // Economic Calendar
  getEconomicCalendar: async (from?: string, to?: string): Promise<EconomicCalendarDto> => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const response = await api.get(`/v1/scanner/economic-calendar?${params.toString()}`);
    return response.data?.value ?? response.data;
  },

  getUpcomingHighImpactEvents: async (lookAheadMinutes: number = 30): Promise<UpcomingHighImpactDto> => {
    const response = await api.get(`/v1/scanner/economic-calendar/upcoming-high-impact?lookAheadMinutes=${lookAheadMinutes}`);
    return response.data?.value ?? response.data;
  },
};

// Economic Calendar Interfaces
export interface EconomicEventDto {
  id: string;
  country: string;
  currency: string;
  eventName: string;
  eventDateUtc: string;
  impact: "High" | "Medium" | "Low" | "Holiday" | "Non-Economic";
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  unit: string | null;
  isUpcoming: boolean;
  minutesUntilRelease: number | null;
}

export interface EconomicCalendarDto {
  from: string;
  to: string;
  totalEvents: number;
  highImpactCount: number;
  mediumImpactCount: number;
  lowImpactCount: number;
  events: EconomicEventDto[];
}

export interface UpcomingHighImpactDto {
  count: number;
  shouldStopTrading: boolean;
  nextEventName: string | null;
  minutesUntilNext: number | null;
  events: EconomicEventDto[];
}

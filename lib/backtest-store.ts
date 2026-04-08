import { create } from "zustand";
import { api, attachToken, ApiResponse } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────

export type Timeframe = "M5" | "M15" | "H1" | "H4" | "D1";
export type PlaybackSpeed = 1 | 2 | 5 | 10;

export interface BacktestSession {
  id: number;
  asset: string;
  startDate: string;
  endDate: string | null;
  initialBalance: number;
  currentBalance: number;
  pnlPercent: number;
  status: "InProgress" | "Completed" | "Liquidated";
  currentTimestamp: string;
  activeTimeframe: string;
  playbackSpeed: number;
  isDataReady: boolean;
  totalOrders: number;
  openPositions: number;
  closedTrades: number;
  createdDate: string;
}

export interface BacktestSessionSummary {
  id: number;
  asset: string;
  startDate: string;
  endDate: string | null;
  initialBalance: number;
  currentBalance: number;
  pnlPercent: number;
  status: string;
  currentTimestamp: string;
  isDataReady: boolean;
  createdDate: string;
}

export interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestOrder {
  id: number;
  orderType: "Market" | "Limit";
  side: "Long" | "Short";
  status: "Pending" | "Active" | "Closed" | "Cancelled";
  entryPrice: number;
  filledPrice: number | null;
  positionSize: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitPrice: number | null;
  pnl: number | null;
  orderedAt: string;
  filledAt: string | null;
  closedAt: string | null;
}

export interface TradeResult {
  id: number;
  orderId: number;
  side: string;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  pnl: number;
  balanceAfter: number;
  entryTime: string;
  exitTime: string;
  exitReason: string;
}

export interface EquityCurvePoint {
  timestamp: string;
  balance: number;
}

export interface SessionAnalytics {
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netPnl: number;
  maxDrawdown: number;
  equityCurve: EquityCurvePoint[];
  tradeLog: TradeResult[];
}

export interface ChartDrawing {
  id: string;
  type: "trendline" | "rectangle" | "fibonacci";
  points: { time: number; price: number }[];
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor: string;
    fillOpacity: number;
  };
  text?: { content: string; placement: string; fontSize: number };
  fibLevels?: number[];
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export interface AdvanceCandleResponse {
  candle: CandleData | null;
  balance: number;
  equity: number;
  unrealizedPnl: number;
  currentTimestamp: string;
  isSessionEnded: boolean;
  isLiquidated: boolean;
  filledOrders: BacktestOrder[];
  closedPositions: BacktestOrder[];
}

export interface PlaybackState {
  sessionId: number;
  asset: string;
  currentTimestamp: string;
  activeTimeframe: string;
  balance: number;
  equity: number;
  unrealizedPnl: number;
  status: string;
  pendingOrders: BacktestOrder[];
  activePositions: BacktestOrder[];
  drawingsJson: string;
}

export interface CreateSessionRequest {
  asset: string;
  startDate: string;
  endDate?: string | null;
  initialBalance: number;
}

export interface PlaceOrderRequest {
  sessionId: number;
  orderType: number; // 0 = Market, 1 = Limit
  side: number; // 0 = Long, 1 = Short
  entryPrice: number;
  positionSize: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
}

// ─── API Functions ──────────────────────────────────────────────────────

const BASE = "/v1";

async function fetchSessions(): Promise<BacktestSessionSummary[]> {
  attachToken();
  const res = await api.get<ApiResponse<BacktestSessionSummary[]>>(`${BASE}/backtest-sessions`);
  return res.data.value;
}

async function fetchSessionDetail(id: number): Promise<BacktestSession> {
  attachToken();
  const res = await api.get<ApiResponse<BacktestSession>>(`${BASE}/backtest-sessions/${id}`);
  return res.data.value;
}

async function createSessionApi(req: CreateSessionRequest): Promise<number> {
  attachToken();
  const res = await api.post<ApiResponse<number>>(`${BASE}/backtest-sessions`, req);
  return res.data.value;
}

async function deleteSessionApi(id: number): Promise<void> {
  attachToken();
  await api.delete(`${BASE}/backtest-sessions/${id}`);
}

async function fetchPlaybackState(sessionId: number): Promise<PlaybackState> {
  attachToken();
  const res = await api.get<ApiResponse<PlaybackState>>(`${BASE}/backtest-playback/${sessionId}/state`);
  return res.data.value;
}

async function advanceCandleApi(sessionId: number): Promise<AdvanceCandleResponse> {
  attachToken();
  const res = await api.post<ApiResponse<AdvanceCandleResponse>>(`${BASE}/backtest-playback/${sessionId}/advance`);
  return res.data.value;
}

async function fetchHistoricalCandles(
  sessionId: number,
  timeframe?: string,
  page = 1,
  pageSize = 2000
): Promise<CandleData[]> {
  attachToken();
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (timeframe) params.set("timeframe", timeframe);
  const res = await api.get<ApiResponse<CandleData[]>>(
    `${BASE}/backtest-market-data/${sessionId}/candles?${params}`
  );
  return res.data.value;
}

async function placeOrderApi(req: PlaceOrderRequest): Promise<BacktestOrder> {
  attachToken();
  const res = await api.post<ApiResponse<BacktestOrder>>(`${BASE}/backtest-orders`, req);
  return res.data.value;
}

async function cancelOrderApi(orderId: number): Promise<void> {
  attachToken();
  await api.delete(`${BASE}/backtest-orders/${orderId}`);
}

async function fetchSessionOrders(sessionId: number): Promise<BacktestOrder[]> {
  attachToken();
  const res = await api.get<ApiResponse<BacktestOrder[]>>(`${BASE}/backtest-orders/session/${sessionId}`);
  return res.data.value;
}

async function saveDrawingsApi(sessionId: number, drawingsJson: string): Promise<void> {
  attachToken();
  await api.put(`${BASE}/backtest-drawings/${sessionId}`, { drawingsJson });
}

async function fetchDrawings(sessionId: number): Promise<string> {
  attachToken();
  const res = await api.get<ApiResponse<string>>(`${BASE}/backtest-drawings/${sessionId}`);
  return res.data.value;
}

async function fetchAnalytics(sessionId: number): Promise<SessionAnalytics> {
  attachToken();
  const res = await api.get<ApiResponse<SessionAnalytics>>(`${BASE}/backtest-analytics/${sessionId}`);
  return res.data.value;
}

// ─── Store ──────────────────────────────────────────────────────────────

interface BacktestStore {
  // ── Session List ──
  sessions: BacktestSessionSummary[];
  sessionsLoading: boolean;
  loadSessions: () => Promise<void>;
  createSession: (req: CreateSessionRequest) => Promise<number>;
  deleteSession: (id: number) => Promise<void>;

  // ── Active Session ──
  session: BacktestSession | null;
  sessionLoading: boolean;
  loadSession: (id: number) => Promise<void>;

  // ── Playback ──
  candles: CandleData[];
  currentTimestamp: string | null;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  activeTimeframe: Timeframe;
  playbackIntervalId: ReturnType<typeof setInterval> | null;

  loadCandles: (sessionId: number, timeframe?: Timeframe) => Promise<void>;
  advanceCandle: (sessionId: number) => Promise<AdvanceCandleResponse | null>;
  startPlayback: (sessionId: number) => void;
  pausePlayback: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  switchTimeframe: (sessionId: number, timeframe: Timeframe) => Promise<void>;

  // ── Orders & Positions ──
  pendingOrders: BacktestOrder[];
  activePositions: BacktestOrder[];
  closedTrades: TradeResult[];

  placeOrder: (req: PlaceOrderRequest) => Promise<BacktestOrder | null>;
  cancelOrder: (orderId: number) => Promise<void>;
  loadOrders: (sessionId: number) => Promise<void>;

  // ── Account ──
  balance: number;
  equity: number;
  unrealizedPnl: number;

  // ── Drawings ──
  drawings: ChartDrawing[];
  selectedDrawingId: string | null;
  activeDrawingTool: "trendline" | "rectangle" | "fibonacci" | null;

  setDrawings: (drawings: ChartDrawing[]) => void;
  setSelectedDrawing: (id: string | null) => void;
  setActiveDrawingTool: (tool: "trendline" | "rectangle" | "fibonacci" | null) => void;
  saveDrawings: (sessionId: number) => Promise<void>;
  loadDrawings: (sessionId: number) => Promise<void>;

  // ── Analytics ──
  analytics: SessionAnalytics | null;
  analyticsLoading: boolean;
  loadAnalytics: (sessionId: number) => Promise<void>;

  // ── Resume ──
  resumeSession: (sessionId: number) => Promise<void>;

  // ── Reset ──
  reset: () => void;
}

const initialState = {
  sessions: [],
  sessionsLoading: false,
  session: null,
  sessionLoading: false,
  candles: [],
  currentTimestamp: null,
  isPlaying: false,
  playbackSpeed: 1 as PlaybackSpeed,
  activeTimeframe: "M15" as Timeframe,
  playbackIntervalId: null,
  pendingOrders: [],
  activePositions: [],
  closedTrades: [],
  balance: 0,
  equity: 0,
  unrealizedPnl: 0,
  drawings: [],
  selectedDrawingId: null,
  activeDrawingTool: null,
  analytics: null,
  analyticsLoading: false,
};

export const useBacktestStore = create<BacktestStore>((set, get) => ({
  ...initialState,

  // ── Session List ──

  loadSessions: async () => {
    set({ sessionsLoading: true });
    try {
      const sessions = await fetchSessions();
      set({ sessions, sessionsLoading: false });
    } catch {
      set({ sessionsLoading: false });
    }
  },

  createSession: async (req) => {
    const id = await createSessionApi(req);
    await get().loadSessions();
    return id;
  },

  deleteSession: async (id) => {
    await deleteSessionApi(id);
    set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) }));
  },

  // ── Active Session ──

  loadSession: async (id) => {
    set({ sessionLoading: true });
    try {
      const session = await fetchSessionDetail(id);
      set({
        session,
        sessionLoading: false,
        balance: session.currentBalance,
        activeTimeframe: session.activeTimeframe as Timeframe,
      });
    } catch {
      set({ sessionLoading: false });
    }
  },

  // ── Playback ──

  loadCandles: async (sessionId, timeframe) => {
    const tf = timeframe ?? get().activeTimeframe;
    const candles = await fetchHistoricalCandles(sessionId, tf);
    set({ candles });
  },

  advanceCandle: async (sessionId) => {
    try {
      const result = await advanceCandleApi(sessionId);

      set((s) => {
        const newCandles = result.candle
          ? [...s.candles, result.candle]
          : s.candles;

        // Update pending/active orders from fill/close events
        let pendingOrders = [...s.pendingOrders];
        let activePositions = [...s.activePositions];

        for (const filled of result.filledOrders) {
          pendingOrders = pendingOrders.filter((o) => o.id !== filled.id);
          activePositions.push(filled);
        }

        for (const closed of result.closedPositions) {
          activePositions = activePositions.filter((o) => o.id !== closed.id);
        }

        return {
          candles: newCandles,
          balance: result.balance,
          equity: result.equity,
          unrealizedPnl: result.unrealizedPnl,
          currentTimestamp: result.currentTimestamp,
          pendingOrders,
          activePositions,
        };
      });

      // Stop playback if session ended
      if (result.isSessionEnded || result.isLiquidated) {
        get().pausePlayback();
        await get().loadSession(sessionId);
      }

      return result;
    } catch {
      get().pausePlayback();
      return null;
    }
  },

  startPlayback: (sessionId) => {
    const { isPlaying, playbackSpeed } = get();
    if (isPlaying) return;

    const intervalMs = Math.max(100, 1000 / playbackSpeed);
    const intervalId = setInterval(() => {
      get().advanceCandle(sessionId);
    }, intervalMs);

    set({ isPlaying: true, playbackIntervalId: intervalId });
  },

  pausePlayback: () => {
    const { playbackIntervalId } = get();
    if (playbackIntervalId) {
      clearInterval(playbackIntervalId);
    }
    set({ isPlaying: false, playbackIntervalId: null });
  },

  setPlaybackSpeed: (speed) => {
    const { isPlaying, playbackIntervalId } = get();

    if (isPlaying && playbackIntervalId) {
      // Restart with new speed — need the sessionId from state
      clearInterval(playbackIntervalId);
      const session = get().session;
      if (session) {
        const intervalMs = Math.max(100, 1000 / speed);
        const newIntervalId = setInterval(() => {
          get().advanceCandle(session.id);
        }, intervalMs);
        set({ playbackSpeed: speed, playbackIntervalId: newIntervalId });
        return;
      }
    }

    set({ playbackSpeed: speed });
  },

  /**
   * Switch timeframe with look-ahead bias prevention:
   * Reloads candles for the new timeframe, filtered server-side to currentTimestamp only.
   */
  switchTimeframe: async (sessionId, timeframe) => {
    get().pausePlayback();
    set({ activeTimeframe: timeframe });
    await get().loadCandles(sessionId, timeframe);
  },

  // ── Orders & Positions ──

  placeOrder: async (req) => {
    try {
      const order = await placeOrderApi(req);

      set((s) => {
        if (order.status === "Pending") {
          return { pendingOrders: [...s.pendingOrders, order] };
        } else if (order.status === "Active") {
          return { activePositions: [...s.activePositions, order] };
        }
        return {};
      });

      return order;
    } catch {
      return null;
    }
  },

  cancelOrder: async (orderId) => {
    await cancelOrderApi(orderId);
    set((s) => ({
      pendingOrders: s.pendingOrders.filter((o) => o.id !== orderId),
    }));
  },

  loadOrders: async (sessionId) => {
    const orders = await fetchSessionOrders(sessionId);
    set({
      pendingOrders: orders.filter((o) => o.status === "Pending"),
      activePositions: orders.filter((o) => o.status === "Active"),
    });
  },

  // ── Drawings ──

  setDrawings: (drawings) => set({ drawings }),

  setSelectedDrawing: (id) => set({ selectedDrawingId: id }),

  setActiveDrawingTool: (tool) => set({ activeDrawingTool: tool }),

  saveDrawings: async (sessionId) => {
    const { drawings } = get();
    const json = JSON.stringify(drawings);
    await saveDrawingsApi(sessionId, json);
  },

  loadDrawings: async (sessionId) => {
    const json = await fetchDrawings(sessionId);
    try {
      const parsed = JSON.parse(json) as ChartDrawing[];
      set({ drawings: parsed });
    } catch {
      set({ drawings: [] });
    }
  },

  // ── Analytics ──

  loadAnalytics: async (sessionId) => {
    set({ analyticsLoading: true });
    try {
      const analytics = await fetchAnalytics(sessionId);
      set({ analytics, analyticsLoading: false });
    } catch {
      set({ analyticsLoading: false });
    }
  },

  // ── Resume ──

  resumeSession: async (sessionId) => {
    const state = await fetchPlaybackState(sessionId);

    // Parse drawings
    let drawings: ChartDrawing[] = [];
    try {
      drawings = JSON.parse(state.drawingsJson) as ChartDrawing[];
    } catch {
      /* empty */
    }

    set({
      currentTimestamp: state.currentTimestamp,
      activeTimeframe: state.activeTimeframe as Timeframe,
      balance: state.balance,
      equity: state.equity,
      unrealizedPnl: state.unrealizedPnl,
      pendingOrders: state.pendingOrders,
      activePositions: state.activePositions,
      drawings,
    });

    // Load session detail and candles
    await get().loadSession(sessionId);
    await get().loadCandles(sessionId, state.activeTimeframe as Timeframe);
  },

  // ── Reset ──

  reset: () => {
    const { playbackIntervalId } = get();
    if (playbackIntervalId) clearInterval(playbackIntervalId);
    set(initialState);
  },
}));

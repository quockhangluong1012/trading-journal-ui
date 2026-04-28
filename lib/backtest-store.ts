import { create } from "zustand";
import { api, attachToken, ApiResponse } from "@/lib/api";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────

export type Timeframe = "M1" | "M5" | "M15" | "H1" | "H4" | "D1";
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
  leverage: number;
  maintenanceMarginPercentage: number;
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

export interface TradingZoneDto {
  id: number;
  name: string;
  description?: string;
  fromTime: string;
  toTime: string;
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

export interface UpdateOrderRequest {
  orderId: number;
  entryPrice?: number;
  positionSize?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
}

export interface AvailableAsset {
  id: number;
  displayName: string;
  symbol: string;
  category: string;
  dataStartDate: string;
  dataEndDate: string | null;
  totalCandles: number;
}

const TIMEFRAME_TO_MINUTES: Record<Timeframe, number> = {
  M1: 1,
  M5: 5,
  M15: 15,
  H1: 60,
  H4: 240,
  D1: 1440,
};

function floorTimestampToBucket(timestamp: string, timeframe: Timeframe): string {
  const time = new Date(timestamp).getTime();
  const bucketMs = TIMEFRAME_TO_MINUTES[timeframe] * 60 * 1000;
  const floored = Math.floor(time / bucketMs) * bucketMs;
  return new Date(floored).toISOString();
}

function aggregateCandlesToTimeframe(
  candles: CandleData[],
  sourceTimeframe: Timeframe,
  targetTimeframe: Timeframe,
): CandleData[] | null {
  if (candles.length === 0) {
    return [];
  }

  const sourceMinutes = TIMEFRAME_TO_MINUTES[sourceTimeframe];
  const targetMinutes = TIMEFRAME_TO_MINUTES[targetTimeframe];

  if (targetMinutes < sourceMinutes || targetMinutes % sourceMinutes !== 0) {
    return null;
  }

  if (targetMinutes === sourceMinutes) {
    return candles.map((candle) => ({ ...candle }));
  }

  const aggregated = new Map<string, CandleData>();

  candles.forEach((candle) => {
    const bucketTimestamp = floorTimestampToBucket(candle.timestamp, targetTimeframe);
    const existing = aggregated.get(bucketTimestamp);

    if (!existing) {
      aggregated.set(bucketTimestamp, {
        ...candle,
        timestamp: bucketTimestamp,
      });
      return;
    }

    aggregated.set(bucketTimestamp, {
      ...existing,
      high: Math.max(existing.high, candle.high),
      low: Math.min(existing.low, candle.low),
      close: candle.close,
      volume: existing.volume + candle.volume,
    });
  });

  return Array.from(aggregated.values()).sort((left, right) =>
    new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

function upsertOrderById(list: BacktestOrder[], order: BacktestOrder): BacktestOrder[] {
  const index = list.findIndex((item) => item.id === order.id);
  if (index === -1) {
    return [...list, order];
  }

  const next = [...list];
  next[index] = order;
  return next;
}

function dedupeOrdersById(list: BacktestOrder[]): BacktestOrder[] {
  const byId = new Map<number, BacktestOrder>();
  list.forEach((order) => {
    byId.set(order.id, order);
  });
  return Array.from(byId.values());
}

// ─── API Functions ──────────────────────────────────────────────────────

const BASE = "/v1";

export async function fetchAvailableAssetsApi(): Promise<AvailableAsset[]> {
  attachToken();
  const res = await api.get<ApiResponse<AvailableAsset[]>>(`${BASE}/backtest-assets`);
  return res.data.value;
}

export async function fetchTradingZonesApi(): Promise<TradingZoneDto[]> {
  attachToken();
  const res = await api.get<ApiResponse<TradingZoneDto[]>>(`${BASE}/trading-zones`);
  return res.data.value || [];
}

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
  const res = await api.post<ApiResponse<number | { id: number }[] | { id: number }>>(`${BASE}/backtest-sessions`, req);
  let val = res.data.value;
  if (Array.isArray(val) && val.length > 0) {
    return val[0].id;
  }
  if (val && typeof val === "object" && "id" in val) {
    return val.id;
  }
  return val as number;
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

async function setPlaybackTimeframeApi(sessionId: number, timeframe: Timeframe): Promise<Timeframe> {
  attachToken();
  const res = await api.put<ApiResponse<string>>(`${BASE}/backtest-playback/${sessionId}/timeframe`, { timeframe });
  return res.data.value as Timeframe;
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

async function finishSessionApi(sessionId: number, exitPrice?: number | null): Promise<void> {
  attachToken();

  const params = new URLSearchParams();
  if (typeof exitPrice === "number" && Number.isFinite(exitPrice) && exitPrice > 0) {
    params.set("exitPrice", exitPrice.toString());
  }

  const query = params.toString();
  const url = query
    ? `${BASE}/backtest-sessions/${sessionId}/finish?${query}`
    : `${BASE}/backtest-sessions/${sessionId}/finish`;

  await api.post(url);
}

async function cancelOrderApi(orderId: number): Promise<void> {
  attachToken();
  await api.delete(`${BASE}/backtest-orders/${orderId}`);
}

async function closeOrderApi(orderId: number, exitPrice: number): Promise<void> {
  attachToken();
  await api.post(`${BASE}/backtest-orders/${orderId}/close?exitPrice=${exitPrice}`);
}

async function updateOrderApi(orderId: number, req: Omit<UpdateOrderRequest, 'orderId'>): Promise<void> {
  attachToken();
  await api.put(`${BASE}/backtest-orders/${orderId}`, req);
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

  tradingZones: TradingZoneDto[];
  loadTradingZones: () => Promise<void>;

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
  isSwitchingTimeframe: boolean;
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
  closedPositions: BacktestOrder[];
  closedTrades: TradeResult[];

  placeOrder: (req: PlaceOrderRequest) => Promise<BacktestOrder>;
  updateOrder: (req: UpdateOrderRequest) => Promise<void>;
  cancelOrder: (orderId: number) => Promise<void>;
  closeOrder: (orderId: number, exitPrice: number) => Promise<void>;
  loadOrders: (sessionId: number) => Promise<void>;
  finishSession: (sessionId: number, exitPrice?: number | null) => Promise<void>;

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
  tradingZones: [],
  session: null,
  sessionLoading: false,
  candles: [],
  currentTimestamp: null,
  isPlaying: false,
  playbackSpeed: 1 as PlaybackSpeed,
  activeTimeframe: "M15" as Timeframe,
  isSwitchingTimeframe: false,
  playbackIntervalId: null,
  pendingOrders: [],
  activePositions: [],
  closedPositions: [],
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

  loadTradingZones: async () => {
    try {
      const tradingZones = await fetchTradingZonesApi();
      set({ tradingZones });
    } catch {
      console.error("Failed to fetch trading zones");
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
        let pendingOrders = s.pendingOrders;
        let activePositions = s.activePositions;
        let closedPositions = s.closedPositions;

        if (result.filledOrders.length > 0 || result.closedPositions.length > 0) {
          pendingOrders = dedupeOrdersById(pendingOrders);
          activePositions = dedupeOrdersById(activePositions);
          closedPositions = dedupeOrdersById(closedPositions);
        }

        for (const filled of result.filledOrders) {
          pendingOrders = pendingOrders.filter((o) => o.id !== filled.id);
          activePositions = upsertOrderById(activePositions, filled);
          toast.success(`Pending ${filled.side} Limit triggered at ${filled.filledPrice}`);
        }

        for (const closed of result.closedPositions) {
          activePositions = activePositions.filter((o) => o.id !== closed.id);
          closedPositions = upsertOrderById(closedPositions, closed);
          const pnl = closed.pnl ?? 0;
          const pnlText = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
          
          let reason = "closed";
          if (closed.exitPrice) {
            if (closed.side === "Long") {
              if (closed.stopLoss && closed.exitPrice <= closed.stopLoss) reason = "hit Stop Loss";
              else if (closed.takeProfit && closed.exitPrice >= closed.takeProfit) reason = "hit Take Profit";
            } else {
              if (closed.stopLoss && closed.exitPrice >= closed.stopLoss) reason = "hit Stop Loss";
              else if (closed.takeProfit && closed.exitPrice <= closed.takeProfit) reason = "hit Take Profit";
            }
          }

          if (reason === "hit Stop Loss") {
            toast.error(`${closed.side} Position ${reason}. PnL: ${pnlText}`);
          } else if (reason === "hit Take Profit") {
            toast.success(`${closed.side} Position ${reason}. PnL: ${pnlText}`);
          } else {
            toast.info(`${closed.side} Position ${reason}. PnL: ${pnlText}`);
          }
        }

        return {
          candles: newCandles,
          balance: result.balance,
          equity: result.equity,
          unrealizedPnl: result.unrealizedPnl,
          currentTimestamp: result.currentTimestamp,
          pendingOrders,
          activePositions,
          closedPositions,
        };
      });

      // Stop playback if session ended
      if (result.isSessionEnded || result.isLiquidated) {
        get().pausePlayback();
        await get().loadSession(sessionId);
        if (result.isLiquidated) {
          toast.error("Account Liquidated!");
        } else if (result.isSessionEnded) {
          toast.info("Backtest session ended.");
        }
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
    if (get().isSwitchingTimeframe || timeframe === get().activeTimeframe) {
      return;
    }

    const previousTimeframe = get().activeTimeframe;
    const previousCandles = get().candles;
    const previousSession = get().session;
    const optimisticCandles = aggregateCandlesToTimeframe(previousCandles, previousTimeframe, timeframe) ?? previousCandles;
    let serverTimeframeUpdated = false;

    get().pausePlayback();

    set((state) => ({
      activeTimeframe: timeframe,
      candles: optimisticCandles,
      isSwitchingTimeframe: true,
      session: state.session
        ? { ...state.session, activeTimeframe: timeframe }
        : state.session,
    }));

    try {
      await setPlaybackTimeframeApi(sessionId, timeframe);
      serverTimeframeUpdated = true;

      const candles = await fetchHistoricalCandles(sessionId, timeframe);

      set((state) => ({
        activeTimeframe: timeframe,
        candles,
        isSwitchingTimeframe: false,
        session: state.session
          ? { ...state.session, activeTimeframe: timeframe }
          : state.session,
      }));
    } catch {
      if (serverTimeframeUpdated && previousTimeframe !== timeframe) {
        try {
          await setPlaybackTimeframeApi(sessionId, previousTimeframe);
        } catch {
          // Best-effort rollback only.
        }
      }

      set({
        activeTimeframe: previousTimeframe,
        candles: previousCandles,
        isSwitchingTimeframe: false,
        session: previousSession ? { ...previousSession } : null,
      });
      toast.error("Failed to switch timeframe");
    }
  },

  // ── Orders & Positions ──

  placeOrder: async (req) => {
    const order = await placeOrderApi(req);

    set((s) => {
      if (order.status === "Pending") {
        return { pendingOrders: upsertOrderById(s.pendingOrders, order) };
      }

      if (order.status === "Active") {
        return { activePositions: upsertOrderById(s.activePositions, order) };
      }

      return {};
    });

    return order;
  },

  updateOrder: async (req) => {
    try {
      const { orderId, ...payload } = req;
      await updateOrderApi(orderId, payload);
      toast.success("Order updated successfully");

      const session = get().session;
      if (session) {
        await get().loadOrders(session.id);
      }
    } catch {
      toast.error("Failed to update order");
    }
  },

  cancelOrder: async (orderId) => {
    await cancelOrderApi(orderId);
    set((s) => ({
      pendingOrders: s.pendingOrders.filter((o) => o.id !== orderId),
    }));
  },

  closeOrder: async (orderId, exitPrice) => {
    await closeOrderApi(orderId, exitPrice);
    
    // Optimistically load orders again to sync up perfectly or move it locally
    // For exact P&L, it's safer to fetch the orders again
    const orders = await fetchSessionOrders(get().session!.id);
    set({
      pendingOrders: dedupeOrdersById(orders.filter((o) => o.status === "Pending")),
      activePositions: dedupeOrdersById(orders.filter((o) => o.status === "Active")),
      closedPositions: dedupeOrdersById(orders.filter((o) => o.status === "Closed")),
    });
  },

  loadOrders: async (sessionId) => {
    const orders = await fetchSessionOrders(sessionId);
    set({
      pendingOrders: dedupeOrdersById(orders.filter((o) => o.status === "Pending")),
      activePositions: dedupeOrdersById(orders.filter((o) => o.status === "Active")),
      closedPositions: dedupeOrdersById(orders.filter((o) => o.status === "Closed")),
    });
  },

  finishSession: async (sessionId, exitPrice) => {
    get().pausePlayback();
    await finishSessionApi(sessionId, exitPrice);

    await Promise.all([
      get().loadSession(sessionId),
      get().loadOrders(sessionId),
      get().loadSessions(),
    ]);
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
    // Clear previous session data to prevent chart bleeding
    set({
      session: null,
      candles: [],
      isPlaying: false,
      playbackIntervalId: null,
      pendingOrders: [],
      activePositions: [],
      closedPositions: [],
      drawings: [],
      selectedDrawingId: null,
      activeDrawingTool: null,
      analytics: null,
    });

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
      pendingOrders: dedupeOrdersById(state.pendingOrders),
      activePositions: dedupeOrdersById(state.activePositions),
      closedPositions: [],
      drawings,
    });

    // Load session detail, candles, and full order state.
    await get().loadSession(sessionId);
    await get().loadCandles(sessionId, state.activeTimeframe as Timeframe);
    await get().loadOrders(sessionId);
  },

  // ── Reset ──

  reset: () => {
    const { playbackIntervalId } = get();
    if (playbackIntervalId) clearInterval(playbackIntervalId);
    set(initialState);
  },
}));

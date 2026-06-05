"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type CandlestickData,
  type CreatePriceLineOptions,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type Logical,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  Crosshair,
  Eye,
  EyeOff,
  FilePenLine,
  Lock,
  Magnet,
  Maximize2,
  Minus,
  Equal,
  MousePointer2,
  MoveHorizontal,
  MoveVertical,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  SkipForward,
  Slash,
  Square,
  Trash2,
  TrendingUp,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BacktestOrder, CandleData, PlaybackSpeed, Timeframe } from "@/lib/backtest-store";
import { cn } from "@/lib/utils";

const FOREX_CODES = new Set([
  "AUD",
  "CAD",
  "CHF",
  "CNH",
  "EUR",
  "GBP",
  "JPY",
  "NZD",
  "USD",
]);

const DIRECT_SYMBOL_MAP: Record<string, string> = {
  XAUUSD: "OANDA:XAUUSD",
  XAGUSD: "OANDA:XAGUSD",
  BTCUSD: "BITSTAMP:BTCUSD",
  ETHUSD: "BITSTAMP:ETHUSD",
  SOLUSD: "COINBASE:SOLUSD",
  BTCUSDT: "BINANCE:BTCUSDT",
  ETHUSDT: "BINANCE:ETHUSDT",
  SOLUSDT: "BINANCE:SOLUSDT",
  NQ: "CME_MINI:NQ1!",
  MNQ: "CME_MINI:MNQ1!",
  ES: "CME_MINI:ES1!",
  MES: "CME_MINI:MES1!",
  YM: "CBOT_MINI:YM1!",
  MYM: "CBOT_MINI:MYM1!",
  RTY: "CME_MINI:RTY1!",
  M2K: "CME_MINI:M2K1!",
  CL: "NYMEX:CL1!",
  GC: "COMEX:GC1!",
  SI: "COMEX:SI1!",
  US30: "CAPITALCOM:US30",
  NAS100: "CAPITALCOM:NAS100",
  SPX500: "CAPITALCOM:US500",
  DXY: "TVC:DXY",
};

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 5, 10];
const TIMEFRAME_OPTIONS: Array<{ value: Timeframe; label: string }> = [
  { value: "M1", label: "1m" },
  { value: "M5", label: "5m" },
  { value: "M15", label: "15m" },
  { value: "H1", label: "1H" },
  { value: "H4", label: "4H" },
  { value: "D1", label: "1D" },
];
const VISIBLE_CANDLE_COUNT = 120;
// Default candle price-scale margins. The vertical-zoom feature scales the
// usable height between these margins; zoom level 1 reproduces this layout.
const PRICE_SCALE_BASE_TOP = 0.08;
const PRICE_SCALE_BASE_BOTTOM = 0.24;
const BASE_PRICE_USABLE = 1 - PRICE_SCALE_BASE_TOP - PRICE_SCALE_BASE_BOTTOM;
const BASE_PRICE_TOP_RATIO = PRICE_SCALE_BASE_TOP / (PRICE_SCALE_BASE_TOP + PRICE_SCALE_BASE_BOTTOM);
// Bounds on the vertical-zoom factor. Beyond these the usable height clamps,
// so capping keeps the wheel responsive when reversing at an extreme.
const MIN_VERTICAL_ZOOM = 0.12;
const MAX_VERTICAL_ZOOM = 1.45;
const LONG_COLOR = "#2563eb";
const SHORT_COLOR = "#e11d48";
const STOP_COLOR = "#dc2626";
const TARGET_COLOR = "#059669";
const PENDING_STOP_COLOR = "#f97316";
const AXIS_LABEL_TEXT_COLOR = "#ffffff";
const SECONDS_PER_HOUR = 60 * 60;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const DEFAULT_DRAWING_COLOR = "#2563eb";
const DRAWING_COLORS = ["#2563eb", "#059669", "#f97316", "#e11d48", "#7c3aed", "#0f172a"];
const MIN_DRAWING_DISTANCE = 4;
const DRAWING_STROKE_WIDTHS = [1, 2, 3, 4, 5];
const DRAWING_TEXT_SIZES = [11, 12, 14, 16, 18];
const DRAWING_LINE_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
] as const;

const DEFAULT_DRAWING_STYLE: ChartDrawingStyle = {
  strokeColor: DEFAULT_DRAWING_COLOR,
  strokeWidth: 2,
  lineStyle: "solid",
  fillColor: DEFAULT_DRAWING_COLOR,
  fillOpacity: 0.09,
  textColor: DEFAULT_DRAWING_COLOR,
  textSize: 11,
};

const DRAWING_STYLE_TEMPLATES: DrawingStyleTemplate[] = [
  {
    id: "standard",
    label: "Standard",
    style: DEFAULT_DRAWING_STYLE,
  },
  {
    id: "focus-zone",
    label: "Focus zone",
    style: {
      strokeColor: "#f97316",
      strokeWidth: 3,
      lineStyle: "dashed",
      fillColor: "#f97316",
      fillOpacity: 0.16,
      textColor: "#f97316",
      textSize: 12,
    },
  },
  {
    id: "execution",
    label: "Execution",
    style: {
      strokeColor: "#059669",
      strokeWidth: 4,
      lineStyle: "solid",
      fillColor: "#059669",
      fillOpacity: 0.12,
      textColor: "#059669",
      textSize: 14,
    },
  },
  {
    id: "muted",
    label: "Muted",
    style: {
      strokeColor: "#64748b",
      strokeWidth: 1,
      lineStyle: "dotted",
      fillColor: "#64748b",
      fillOpacity: 0.06,
      textColor: "#64748b",
      textSize: 11,
    },
  },
];

const DEFAULT_FIBONACCI_LEVELS: FibonacciLevel[] = [
  { value: 0, visible: true, color: DEFAULT_DRAWING_COLOR, label: "0" },
  { value: 0.236, visible: true, color: DEFAULT_DRAWING_COLOR, label: "0.236" },
  { value: 0.382, visible: true, color: DEFAULT_DRAWING_COLOR, label: "0.382" },
  { value: 0.5, visible: true, color: DEFAULT_DRAWING_COLOR, label: "0.5" },
  { value: 0.618, visible: true, color: DEFAULT_DRAWING_COLOR, label: "0.618" },
  { value: 0.786, visible: true, color: DEFAULT_DRAWING_COLOR, label: "0.786" },
  { value: 1, visible: true, color: DEFAULT_DRAWING_COLOR, label: "1" },
];

export type TradingSessionId = "tokyo" | "london" | "new-york";

export interface TradingSessionDefinition {
  id: TradingSessionId;
  label: string;
  startHourUtc: number;
  endHourUtc: number;
  color: string;
  fillColor: string;
}

export const ICT_TRADING_SESSIONS: TradingSessionDefinition[] = [
  {
    id: "tokyo",
    label: "Tokyo",
    startHourUtc: 0,
    endHourUtc: 9,
    color: "#ec4899",
    fillColor: "rgba(236, 72, 153, 0.09)",
  },
  {
    id: "london",
    label: "London",
    startHourUtc: 7,
    endHourUtc: 16,
    color: "#2563eb",
    fillColor: "rgba(37, 99, 235, 0.09)",
  },
  {
    id: "new-york",
    label: "New York",
    startHourUtc: 12,
    endHourUtc: 21,
    color: "#f97316",
    fillColor: "rgba(249, 115, 22, 0.09)",
  },
];

export type TradingViewInterval = "1" | "5" | "15" | "60" | "240" | "D";
export type TradingViewTheme = "dark" | "light";

export interface TradingViewWidgetOptions {
  allow_symbol_change: boolean;
  autosize: boolean;
  backgroundColor: string;
  calendar: boolean;
  compareSymbols: string[];
  details: boolean;
  gridColor: string;
  hide_legend: boolean;
  hide_side_toolbar: boolean;
  hide_top_toolbar: boolean;
  hide_volume: boolean;
  hotlist: boolean;
  interval: TradingViewInterval;
  locale: "en";
  save_image: boolean;
  studies: string[];
  style: "1";
  symbol: string;
  theme: TradingViewTheme;
  timezone: "Etc/UTC";
  withdateranges: boolean;
}

interface TradingViewPlatformProps {
  asset: string;
  timeframe: Timeframe;
  candles: CandleData[];
  pendingOrders?: BacktestOrder[];
  activePositions?: BacktestOrder[];
  closedPositions?: BacktestOrder[];
  theme?: string;
  className?: string;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  formattedTimestamp: string;
  startDate?: string | null;
  endDate?: string | null;
  currentTimestamp?: string | null;
  /** Drawings persisted from a previous visit, hydrated once on mount. */
  initialDrawings?: ChartDrawing[];
  /** Called whenever the user's drawings change, so the parent can persist them. */
  onDrawingsChange?: (drawings: ChartDrawing[]) => void;
  activeTimeframe?: Timeframe;
  isSwitchingTimeframe?: boolean;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  finishAction?: ReactNode;
  onTogglePlayback: () => void;
  onSkip: () => void;
  onPlaybackSpeedChange: (speed: PlaybackSpeed) => void;
}

interface ChartPalette {
  background: string;
  border: string;
  crosshair: string;
  down: string;
  grid: string;
  muted: string;
  text: string;
  up: string;
}

interface ChartData {
  candles: Array<CandlestickData<UTCTimestamp>>;
  volumes: Array<HistogramData<UTCTimestamp>>;
}

export type OrderPriceLineOptions = CreatePriceLineOptions & { id: string };

export interface OrderMarkerOverlay {
  id: string;
  time: UTCTimestamp;
  price: number;
  anchorPrice: number;
  side: BacktestOrder["side"];
  text: string;
  color: string;
  isExit: boolean;
}

interface PositionedOrderMarkerOverlay extends OrderMarkerOverlay {
  x: number;
  y: number;
}

export interface TradingSessionOverlay {
  id: string;
  sessionId: TradingSessionId;
  label: string;
  color: string;
  fillColor: string;
  startTime: UTCTimestamp;
  endTime: UTCTimestamp;
  high: number;
  low: number;
}

export interface PositionedTradingSessionOverlay extends TradingSessionOverlay {
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
}

export type ChartDrawingTool =
  | "cursor"
  | "crosshair"
  | "trend-line"
  | "ray"
  | "horizontal-line"
  | "vertical-line"
  | "rectangle"
  | "long-position"
  | "short-position"
  | "text"
  | "measure"
  | "fibonacci";

export type DrawableChartTool = Exclude<ChartDrawingTool, "cursor" | "crosshair">;

export type ChartDrawingLineStyle = "solid" | "dashed" | "dotted";
export type DrawingStyleTemplateId = "standard" | "focus-zone" | "execution" | "muted";

export interface FibonacciLevel {
  value: number;
  visible: boolean;
  color: string;
  label: string;
}

export interface ChartDrawingStyle {
  strokeColor: string;
  strokeWidth: number;
  lineStyle: ChartDrawingLineStyle;
  fillColor: string;
  fillOpacity: number;
  textColor: string;
  textSize: number;
}

interface DrawingStyleTemplate {
  id: string;
  label: string;
  style: Partial<ChartDrawingStyle>;
  tool?: DrawableChartTool;
  text?: string;
}

export interface ChartDrawingAnchor {
  time: UTCTimestamp;
  /** Fractional bar index, kept so drawings can be re-projected even when the
   *  anchor's time falls outside the chart's currently-mapped range. */
  logical?: number;
  price: number;
}

export interface ChartDrawing {
  id: string;
  tool: DrawableChartTool;
  color: string;
  style?: ChartDrawingStyle;
  points: ChartDrawingAnchor[];
  text?: string;
  fibonacciLevels?: FibonacciLevel[];
}

export interface DrawingMetrics {
  priceChange: number;
  percentChange: number | null;
}

export interface PositionedChartDrawing extends ChartDrawing {
  points: Array<ChartDrawingAnchor & { x: number; y: number }>;
  metrics: DrawingMetrics | null;
}

export interface PointerChartAnchor extends ChartDrawingAnchor {
  x: number;
  y: number;
}

export interface ChartDrawingDraft {
  tool: DrawableChartTool;
  color: string;
  style: ChartDrawingStyle;
  start: ChartDrawingAnchor;
  end: ChartDrawingAnchor;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  text?: string;
}

// ── Drag-to-move: allow free-form repositioning of drawings ──

interface DrawingDragState {
  drawingId: string;
  /** -1 = move whole drawing; 0+ = drag a specific anchor point */
  pointIndex: number;
  startMousePosition: { x: number; y: number };
  startPoints: ChartDrawingAnchor[];
  surfaceRect: { left: number; top: number; width: number; height: number };
}

// Seed the auto-increment id counter past any persisted drawings so newly
// created drawings ("drawing-<n>") never collide with hydrated ones.
function nextDrawingIdSeed(drawings?: ChartDrawing[]): number {
  if (!drawings?.length) return 0;
  let max = -1;
  for (const drawing of drawings) {
    const match = /^drawing-(\d+)$/.exec(drawing.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function hitTestDrawing(
  x: number,
  y: number,
  drawing: PositionedChartDrawing,
): { pointIndex: number } | null {
  const handleRadius = 10;

  // Check handles first (reverse order so top handles win for overlapping)
  for (let i = drawing.points.length - 1; i >= 0; i--) {
    const dx = x - drawing.points[i].x;
    const dy = y - drawing.points[i].y;
    if (Math.hypot(dx, dy) <= handleRadius) {
      return { pointIndex: i };
    }
  }

  // Body hit-test – bounding box with generous margins
  const margin = 12;
  if (drawing.points.length === 1) {
    if (Math.abs(x - drawing.points[0].x) <= margin + 20 &&
        Math.abs(y - drawing.points[0].y) <= margin + 20) {
      return { pointIndex: -1 };
    }
    return null;
  }

  const xs = drawing.points.map((p) => p.x);
  const ys = drawing.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Expand narrow dimensions for horizontal/vertical lines
  const isHorizontal = maxY - minY < 8;
  const isVertical = maxX - minX < 8;
  const hitX = x >= minX - margin && x <= maxX + margin;
  const hitY = y >= minY - margin && y <= maxY + margin;
  const nearCenterY = Math.abs(y - (minY + maxY) / 2) <= margin + 16;
  const nearCenterX = Math.abs(x - (minX + maxX) / 2) <= margin + 16;

  if (isHorizontal && hitX && nearCenterY) return { pointIndex: -1 };
  if (isVertical && hitY && nearCenterX) return { pointIndex: -1 };
  if (!isHorizontal && !isVertical && hitX && hitY) return { pointIndex: -1 };

  return null;
}

function pixelDeltaToChartDelta(
  chart: IChartApi,
  candleSeries: ISeriesApi<"Candlestick">,
  pixelDX: number,
  pixelDY: number,
  containerHeight: number,
): { dt: number; dp: number } {
  let dt = 0;
  let dp = 0;

  // Horizontal: use visible range times + timeToCoordinate for reliable time/pixel ratio.
  // coordinateToTime() can return null when queried outside the chart data — this
  // alternative never hits that path because we start from known Time values.
  const timeScale = chart.timeScale();
  const visibleRange = timeScale.getVisibleRange();
  if (visibleRange) {
    const tFrom = Number(visibleRange.from);
    const tTo = Number(visibleRange.to);
    if (Number.isFinite(tFrom) && Number.isFinite(tTo) && tTo !== tFrom) {
      const xFrom = timeScale.timeToCoordinate(visibleRange.from);
      const xTo = timeScale.timeToCoordinate(visibleRange.to);
      if (xFrom !== null && xTo !== null && xFrom !== xTo) {
        dt = pixelDX * (tTo - tFrom) / (xTo - xFrom);
      }
    }
  }

  // Vertical: probe two well-separated Y positions for price/pixel ratio
  const probeY1 = Math.max(1, containerHeight * 0.1);
  const probeY2 = Math.max(1, containerHeight * 0.9);
  if (probeY1 !== probeY2) {
    const p1 = candleSeries.coordinateToPrice(probeY1);
    const p2 = candleSeries.coordinateToPrice(probeY2);
    if (p1 !== null && p2 !== null) {
      dp = pixelDY * (p2 - p1) / (probeY2 - probeY1);
    }
  }

  return { dt, dp };
}

interface DrawingToolDefinition {
  id: ChartDrawingTool;
  label: string;
  icon: typeof MousePointer2;
  requiresSecondPoint: boolean;
}

const DRAWING_TOOL_GROUPS: DrawingToolDefinition[][] = [
  [
    { id: "cursor", label: "Cursor", icon: MousePointer2, requiresSecondPoint: false },
  ],
  [
    { id: "trend-line", label: "Trend line", icon: Slash, requiresSecondPoint: true },
    { id: "ray", label: "Ray", icon: TrendingUp, requiresSecondPoint: true },
    { id: "horizontal-line", label: "Horizontal line", icon: Minus, requiresSecondPoint: false },
    { id: "vertical-line", label: "Vertical line", icon: MoveVertical, requiresSecondPoint: false },
  ],
  [
    { id: "rectangle", label: "Rectangle", icon: Square, requiresSecondPoint: true },
    { id: "long-position", label: "Long position", icon: MoveHorizontal, requiresSecondPoint: true },
    { id: "short-position", label: "Short position", icon: MoveHorizontal, requiresSecondPoint: true },
    { id: "text", label: "Text note", icon: Type, requiresSecondPoint: false },
    { id: "fibonacci", label: "Fib retracement", icon: Equal, requiresSecondPoint: true },
  ],
];

export function toTradingViewInterval(timeframe: Timeframe): TradingViewInterval {
  const intervals: Record<Timeframe, TradingViewInterval> = {
    M1: "1",
    M5: "5",
    M15: "15",
    H1: "60",
    H4: "240",
    D1: "D",
  };

  return intervals[timeframe];
}

export function resolveTradingViewSymbol(asset: string): string {
  const trimmed = asset.trim();
  if (!trimmed) {
    return "OANDA:EURUSD";
  }

  if (trimmed.includes(":")) {
    return trimmed.toUpperCase();
  }

  const normalized = trimmed.toUpperCase().replaceAll("/", "").replace(/\s+/g, "");
  const directSymbol = DIRECT_SYMBOL_MAP[normalized];
  if (directSymbol) {
    return directSymbol;
  }

  if (normalized.length === 6) {
    const base = normalized.slice(0, 3);
    const quote = normalized.slice(3, 6);

    if (FOREX_CODES.has(base) && FOREX_CODES.has(quote)) {
      return `OANDA:${normalized}`;
    }
  }

  return normalized;
}

export function buildTradingViewWidgetOptions({
  asset,
  timeframe,
  theme,
}: Pick<TradingViewPlatformProps, "asset" | "timeframe" | "theme">): TradingViewWidgetOptions {
  const tradingViewTheme: TradingViewTheme = theme === "dark" ? "dark" : "light";
  const symbol = resolveTradingViewSymbol(asset);

  return {
    allow_symbol_change: true,
    autosize: true,
    backgroundColor: tradingViewTheme === "dark" ? "#020617" : "#ffffff",
    calendar: true,
    compareSymbols: [],
    details: true,
    gridColor: tradingViewTheme === "dark" ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.08)",
    hide_legend: false,
    hide_side_toolbar: false,
    hide_top_toolbar: false,
    hide_volume: false,
    hotlist: true,
    interval: toTradingViewInterval(timeframe),
    locale: "en",
    save_image: true,
    studies: [],
    style: "1",
    symbol,
    theme: tradingViewTheme,
    timezone: "Etc/UTC",
    withdateranges: true,
  };
}

export function toChartTimestamp(timestamp: string): UTCTimestamp | null {
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) {
    return null;
  }

  return Math.floor(time / 1000) as UTCTimestamp;
}

export function mapBacktestCandlesToChartData(candles: CandleData[]): ChartData {
  const deduped = new Map<UTCTimestamp, CandleData>();

  for (const candle of candles) {
    const time = toChartTimestamp(candle.timestamp);
    if (!time) {
      continue;
    }

    deduped.set(time, candle);
  }

  const sorted = Array.from(deduped.entries()).sort(([left], [right]) => left - right);

  return sorted.reduce<ChartData>(
    (result, [time, candle]) => {
      result.candles.push({
        time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });

      result.volumes.push({
        time,
        value: candle.volume ?? 0,
        color: candle.close >= candle.open ? "rgba(34, 197, 94, 0.28)" : "rgba(239, 68, 68, 0.28)",
      });

      return result;
    },
    { candles: [], volumes: [] },
  );
}

export interface IncrementalChartDataCache {
  data: ChartData;
  sourceLength: number;
}

export interface IncrementalChartDataUpdate extends IncrementalChartDataCache {
  mode: "reset" | "update" | "none";
  updatedCandle?: CandlestickData<UTCTimestamp>;
  updatedVolume?: HistogramData<UTCTimestamp>;
}

function mapBacktestCandleToChartBars(
  candle: CandleData,
): { candle: CandlestickData<UTCTimestamp>; volume: HistogramData<UTCTimestamp> } | null {
  const time = toChartTimestamp(candle.timestamp);
  if (!time) {
    return null;
  }

  return {
    candle: {
      time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    },
    volume: {
      time,
      value: candle.volume ?? 0,
      color: candle.close >= candle.open ? "rgba(34, 197, 94, 0.28)" : "rgba(239, 68, 68, 0.28)",
    },
  };
}

/**
 * Diff the new candle array against the previously-rendered one so the chart can
 * append/replace a single bar (candleSeries.update) instead of re-ingesting the
 * whole series (candleSeries.setData) on every replay tick. Falls back to a full
 * "reset" whenever the tail no longer lines up (re-fetch, timeframe switch, reorder).
 */
export function buildIncrementalChartData(
  candles: CandleData[],
  previous?: IncrementalChartDataCache | null,
): IncrementalChartDataUpdate {
  const reset = (): IncrementalChartDataUpdate => ({
    data: mapBacktestCandlesToChartData(candles),
    mode: "reset",
    sourceLength: candles.length,
  });

  if (
    !previous ||
    candles.length !== previous.sourceLength + 1 ||
    previous.data.candles.length === 0 ||
    previous.data.candles.length !== previous.data.volumes.length
  ) {
    return reset();
  }

  const previousSourceTail = candles[previous.sourceLength - 1];
  const previousSourceTailTime = previousSourceTail ? toChartTimestamp(previousSourceTail.timestamp) : null;
  const previousLastTime = Number(previous.data.candles[previous.data.candles.length - 1].time);

  if (!previousSourceTailTime || Number(previousSourceTailTime) !== previousLastTime) {
    return reset();
  }

  const mapped = mapBacktestCandleToChartBars(candles[candles.length - 1]);
  if (!mapped) {
    return {
      data: previous.data,
      mode: "none",
      sourceLength: candles.length,
    };
  }

  const nextTime = Number(mapped.candle.time);

  if (!Number.isFinite(previousLastTime) || nextTime < previousLastTime) {
    return reset();
  }

  if (nextTime === previousLastTime) {
    return {
      data: {
        candles: [...previous.data.candles.slice(0, -1), mapped.candle],
        volumes: [...previous.data.volumes.slice(0, -1), mapped.volume],
      },
      mode: "update",
      sourceLength: candles.length,
      updatedCandle: mapped.candle,
      updatedVolume: mapped.volume,
    };
  }

  return {
    data: {
      candles: [...previous.data.candles, mapped.candle],
      volumes: [...previous.data.volumes, mapped.volume],
    },
    mode: "update",
    sourceLength: candles.length,
    updatedCandle: mapped.candle,
    updatedVolume: mapped.volume,
  };
}

export function calculateReplayProgress({
  startDate,
  endDate,
  currentTimestamp,
}: {
  startDate?: string | null;
  endDate?: string | null;
  currentTimestamp?: string | null;
}): number | null {
  if (!startDate || !endDate || !currentTimestamp) {
    return null;
  }

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const current = new Date(currentTimestamp).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(current) || end <= start) {
    return null;
  }

  return Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100));
}

function getUtcDayStartSeconds(time: number): number {
  const date = new Date(time * 1000);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000);
}

function createTradingSessionBounds(
  dayStart: number,
  session: TradingSessionDefinition,
): { startTime: UTCTimestamp; endTime: UTCTimestamp } {
  const startTime = dayStart + session.startHourUtc * SECONDS_PER_HOUR;
  let endTime = dayStart + session.endHourUtc * SECONDS_PER_HOUR;

  if (endTime <= startTime) {
    endTime += SECONDS_PER_DAY;
  }

  return {
    startTime: startTime as UTCTimestamp,
    endTime: endTime as UTCTimestamp,
  };
}

export function buildTradingSessionOverlays(
  chartCandles: Array<CandlestickData<UTCTimestamp>>,
  sessions: TradingSessionDefinition[] = ICT_TRADING_SESSIONS,
): TradingSessionOverlay[] {
  if (chartCandles.length === 0 || sessions.length === 0) {
    return [];
  }

  const sortedCandles = [...chartCandles].sort((left, right) => Number(left.time) - Number(right.time));
  const firstTime = Number(sortedCandles[0].time);
  const lastTime = Number(sortedCandles[sortedCandles.length - 1].time);

  if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime)) {
    return [];
  }

  const firstDayStart = getUtcDayStartSeconds(firstTime) - SECONDS_PER_DAY;
  const lastDayStart = getUtcDayStartSeconds(lastTime) + SECONDS_PER_DAY;
  const overlays: TradingSessionOverlay[] = [];

  for (let dayStart = firstDayStart; dayStart <= lastDayStart; dayStart += SECONDS_PER_DAY) {
    for (const session of sessions) {
      const bounds = createTradingSessionBounds(dayStart, session);
      const sessionCandles = sortedCandles.filter((candle) => {
        const time = Number(candle.time);
        return time >= Number(bounds.startTime) && time < Number(bounds.endTime);
      });

      if (sessionCandles.length === 0) {
        continue;
      }

      let high = Number.NEGATIVE_INFINITY;
      let low = Number.POSITIVE_INFINITY;

      for (const candle of sessionCandles) {
        if (Number.isFinite(candle.high)) {
          high = Math.max(high, candle.high);
        }
        if (Number.isFinite(candle.low)) {
          low = Math.min(low, candle.low);
        }
      }

      if (!Number.isFinite(high) || !Number.isFinite(low)) {
        continue;
      }

      overlays.push({
        id: `${session.id}-${bounds.startTime}`,
        sessionId: session.id,
        label: session.label,
        color: session.color,
        fillColor: session.fillColor,
        startTime: bounds.startTime,
        endTime: bounds.endTime,
        high,
        low,
      });
    }
  }

  return overlays.sort((left, right) => {
    const timeDiff = Number(left.startTime) - Number(right.startTime);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return left.sessionId.localeCompare(right.sessionId);
  });
}

export function positionTradingSessionOverlays({
  sessions,
  width,
  height,
  timeToCoordinate,
  priceToCoordinate,
}: {
  sessions: TradingSessionOverlay[];
  width: number;
  height: number;
  timeToCoordinate: (time: UTCTimestamp) => number | null;
  priceToCoordinate: (price: number) => number | null;
}): PositionedTradingSessionOverlay[] {
  if (width <= 0 || height <= 0) {
    return [];
  }

  return sessions.reduce<PositionedTradingSessionOverlay[]>((result, session) => {
    const startX = timeToCoordinate(session.startTime);
    const endX = timeToCoordinate(session.endTime);
    const highY = priceToCoordinate(session.high);
    const lowY = priceToCoordinate(session.low);

    if (
      startX == null ||
      endX == null ||
      highY == null ||
      lowY == null ||
      !Number.isFinite(startX) ||
      !Number.isFinite(endX) ||
      !Number.isFinite(highY) ||
      !Number.isFinite(lowY)
    ) {
      return result;
    }

    const left = Math.min(startX, endX);
    const right = Math.max(startX, endX);
    const top = Math.min(highY, lowY);
    const bottom = Math.max(highY, lowY);
    const boxWidth = right - left;
    const boxHeight = bottom - top;

    if (boxWidth <= 0 || boxHeight <= 0) {
      return result;
    }

    result.push({
      ...session,
      x: left,
      y: top,
      width: boxWidth,
      height: boxHeight,
      labelX: clamp(left + 8, 4, Math.max(4, width - 8)),
      labelY: clamp(top - 6, 12, Math.max(12, height - 4)),
    });

    return result;
  }, []);
}

function isValidPrice(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getOrderSideColor(side: BacktestOrder["side"]): string {
  return side === "Long" ? LONG_COLOR : SHORT_COLOR;
}

function getOrderEntryPrice(order: BacktestOrder): number | null {
  const price = order.filledPrice ?? order.entryPrice;
  return isValidPrice(price) ? price : null;
}

function createOrderPriceLine({
  id,
  price,
  color,
  lineStyle,
}: {
  id: string;
  price: number | null | undefined;
  color: string;
  lineStyle: LineStyle;
}): OrderPriceLineOptions | null {
  if (!isValidPrice(price)) {
    return null;
  }

  return {
    id,
    price,
    color,
    lineStyle,
    lineWidth: 1,
    lineVisible: false,
    axisLabelVisible: true,
    axisLabelTextColor: AXIS_LABEL_TEXT_COLOR,
    title: "",
  };
}

export function buildOrderPriceLines({
  pendingOrders,
  activePositions,
}: {
  pendingOrders: BacktestOrder[];
  activePositions: BacktestOrder[];
}): OrderPriceLineOptions[] {
  const lines: OrderPriceLineOptions[] = [];

  const addLine = (line: OrderPriceLineOptions | null) => {
    if (line) {
      lines.push(line);
    }
  };

  for (const order of activePositions) {
    const entryPrice = getOrderEntryPrice(order);
    addLine(createOrderPriceLine({
      id: `active-entry-${order.id}`,
      price: entryPrice,
      color: getOrderSideColor(order.side),
      lineStyle: LineStyle.Solid,
    }));
    addLine(createOrderPriceLine({
      id: `active-stop-${order.id}`,
      price: order.stopLoss,
      color: STOP_COLOR,
      lineStyle: LineStyle.Dashed,
    }));
    addLine(createOrderPriceLine({
      id: `active-target-${order.id}`,
      price: order.takeProfit,
      color: TARGET_COLOR,
      lineStyle: LineStyle.Dashed,
    }));
  }

  for (const order of pendingOrders) {
    addLine(createOrderPriceLine({
      id: `pending-entry-${order.id}`,
      price: order.entryPrice,
      color: getOrderSideColor(order.side),
      lineStyle: LineStyle.Dashed,
    }));
    addLine(createOrderPriceLine({
      id: `pending-stop-${order.id}`,
      price: order.stopLoss,
      color: PENDING_STOP_COLOR,
      lineStyle: LineStyle.Dashed,
    }));
    addLine(createOrderPriceLine({
      id: `pending-target-${order.id}`,
      price: order.takeProfit,
      color: TARGET_COLOR,
      lineStyle: LineStyle.Dashed,
    }));
  }

  return lines;
}

function findNearestChartTime(timestamp: string | null | undefined, chartTimes: UTCTimestamp[] = []): UTCTimestamp | null {
  const time = timestamp ? toChartTimestamp(timestamp) : null;
  if (!time || chartTimes.length === 0) {
    return null;
  }

  const firstTime = Number(chartTimes[0]);
  const lastTime = Number(chartTimes[chartTimes.length - 1]);
  const requestedTime = Number(time);

  if (requestedTime < firstTime || requestedTime > lastTime) {
    return null;
  }

  return chartTimes.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(Number(nearest) - Number(time));
    const candidateDistance = Math.abs(Number(candidate) - Number(time));
    return candidateDistance < nearestDistance ? candidate : nearest;
  }, chartTimes[0]);
}

function findNearestChartCandle(
  timestamp: string | null | undefined,
  chartCandles: Array<CandlestickData<UTCTimestamp>> = [],
): CandlestickData<UTCTimestamp> | null {
  const time = timestamp ? toChartTimestamp(timestamp) : null;
  if (!time || chartCandles.length === 0) {
    return null;
  }

  const firstTime = Number(chartCandles[0].time);
  const lastTime = Number(chartCandles[chartCandles.length - 1].time);
  const requestedTime = Number(time);

  if (requestedTime < firstTime || requestedTime > lastTime) {
    return null;
  }

  return chartCandles.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(Number(nearest.time) - Number(time));
    const candidateDistance = Math.abs(Number(candidate.time) - Number(time));
    return candidateDistance < nearestDistance ? candidate : nearest;
  }, chartCandles[0]);
}

function createOrderMarkerOverlay({
  id,
  order,
  timestamp,
  fallbackTimestamp,
  price,
  chartCandles = [],
  chartTimes,
  isExit = false,
}: {
  id: string;
  order: BacktestOrder;
  timestamp: string | null | undefined;
  fallbackTimestamp?: string | null | undefined;
  price: number | null | undefined;
  chartCandles?: Array<CandlestickData<UTCTimestamp>>;
  chartTimes?: UTCTimestamp[];
  isExit?: boolean;
}): OrderMarkerOverlay | null {
  const candle = findNearestChartCandle(timestamp, chartCandles)
    ?? findNearestChartCandle(fallbackTimestamp, chartCandles)
    ?? (chartCandles.length > 0 ? chartCandles[chartCandles.length - 1] : null);
  const time = candle?.time
    ?? findNearestChartTime(timestamp, chartTimes)
    ?? findNearestChartTime(fallbackTimestamp, chartTimes)
    ?? chartTimes?.at(-1);
  if (!time || !isValidPrice(price)) {
    return null;
  }

  const isLong = order.side === "Long";
  const isBuyMarker = isExit ? !isLong : isLong;
  const anchorPrice = isValidPrice(candle?.low) ? candle.low : price;

  return {
    id,
    time,
    price,
    anchorPrice,
    side: isBuyMarker ? "Long" : "Short",
    color: isBuyMarker ? LONG_COLOR : SHORT_COLOR,
    text: `${isExit ? "Exit" : order.side} ${order.positionSize} @ ${formatPrice(price)}`,
    isExit,
  };
}

export function buildOrderMarkerOverlays({
  pendingOrders = [],
  activePositions,
  closedPositions,
  chartCandles,
  chartTimes,
  placementFallbackTimestamp,
}: {
  pendingOrders?: BacktestOrder[];
  activePositions: BacktestOrder[];
  closedPositions: BacktestOrder[];
  chartCandles?: Array<CandlestickData<UTCTimestamp>>;
  chartTimes?: UTCTimestamp[];
  placementFallbackTimestamp?: string | null;
}): OrderMarkerOverlay[] {
  const markers: OrderMarkerOverlay[] = [];

  const addMarker = (marker: OrderMarkerOverlay | null) => {
    if (marker) {
      markers.push(marker);
    }
  };

  for (const order of pendingOrders) {
    addMarker(createOrderMarkerOverlay({
      id: `pending-entry-${order.id}`,
      order,
      timestamp: order.orderedAt,
      fallbackTimestamp: placementFallbackTimestamp,
      price: getOrderEntryPrice(order),
      chartCandles,
      chartTimes,
    }));
  }

  for (const order of activePositions) {
    addMarker(createOrderMarkerOverlay({
      id: `active-entry-${order.id}`,
      order,
      timestamp: order.orderedAt,
      fallbackTimestamp: order.filledAt ?? placementFallbackTimestamp,
      price: getOrderEntryPrice(order),
      chartCandles,
      chartTimes,
    }));
  }

  for (const order of closedPositions) {
    addMarker(createOrderMarkerOverlay({
      id: `closed-entry-${order.id}`,
      order,
      timestamp: order.orderedAt,
      fallbackTimestamp: order.filledAt ?? placementFallbackTimestamp,
      price: getOrderEntryPrice(order),
      chartCandles,
      chartTimes,
    }));
    addMarker(createOrderMarkerOverlay({
      id: `closed-exit-${order.id}`,
      order,
      timestamp: order.closedAt,
      price: order.exitPrice,
      chartCandles,
      chartTimes,
      isExit: true,
    }));
  }

  return markers.sort((left, right) => {
    const timeDiff = Number(left.time) - Number(right.time);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return (left.id ?? "").localeCompare(right.id ?? "");
  });
}

function getPalette(theme?: string): ChartPalette {
  if (theme === "dark") {
    return {
      background: "#020617",
      border: "rgba(148, 163, 184, 0.28)",
      crosshair: "rgba(226, 232, 240, 0.7)",
      down: "#ef4444",
      grid: "rgba(148, 163, 184, 0.12)",
      muted: "#94a3b8",
      text: "#dbeafe",
      up: "#22c55e",
    };
  }

  return {
    background: "#ffffff",
    border: "rgba(15, 23, 42, 0.14)",
    crosshair: "rgba(15, 23, 42, 0.55)",
    down: "#dc2626",
    grid: "rgba(15, 23, 42, 0.08)",
    muted: "#64748b",
    text: "#0f172a",
    up: "#16a34a",
  };
}

function fitLatestCandles(chart: IChartApi, candleCount: number) {
  if (candleCount === 0) {
    return;
  }

  if (candleCount <= VISIBLE_CANDLE_COUNT) {
    chart.timeScale().fitContent();
    return;
  }

  chart.timeScale().setVisibleLogicalRange({
    from: candleCount - VISIBLE_CANDLE_COUNT,
    to: candleCount + 6,
  });
}

function formatPrice(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 2 : 5,
    minimumFractionDigits: value >= 100 ? 2 : 5,
  }).format(value);
}

function isDrawableChartTool(tool: ChartDrawingTool): tool is DrawableChartTool {
  return tool !== "cursor" && tool !== "crosshair";
}

function getDrawingToolDefinition(tool: ChartDrawingTool): DrawingToolDefinition | null {
  for (const group of DRAWING_TOOL_GROUPS) {
    const definition = group.find((item) => item.id === tool);
    if (definition) {
      return definition;
    }
  }

  return null;
}

export function isTwoPointDrawingTool(tool: DrawableChartTool): boolean {
  return getDrawingToolDefinition(tool)?.requiresSecondPoint ?? true;
}

function isDrawingLineStyle(value: unknown): value is ChartDrawingLineStyle {
  return DRAWING_LINE_STYLE_OPTIONS.some((option) => option.value === value);
}

function normalizeDrawingStyle(
  style?: Partial<ChartDrawingStyle> | null,
  fallbackColor = DEFAULT_DRAWING_COLOR,
): ChartDrawingStyle {
  const strokeColor = style?.strokeColor?.trim() || fallbackColor || DEFAULT_DRAWING_COLOR;
  const strokeWidth = clamp(Math.round(style?.strokeWidth ?? DEFAULT_DRAWING_STYLE.strokeWidth), 1, 8);
  const lineStyle = isDrawingLineStyle(style?.lineStyle) ? style.lineStyle : DEFAULT_DRAWING_STYLE.lineStyle;
  const fillColor = style?.fillColor?.trim() || strokeColor;
  const fillOpacity = clamp(style?.fillOpacity ?? DEFAULT_DRAWING_STYLE.fillOpacity, 0, 0.45);
  const textColor = style?.textColor?.trim() || strokeColor;
  const textSize = clamp(Math.round(style?.textSize ?? DEFAULT_DRAWING_STYLE.textSize), 9, 24);

  return {
    strokeColor,
    strokeWidth,
    lineStyle,
    fillColor,
    fillOpacity,
    textColor,
    textSize,
  };
}

function normalizeStylePatch(style: Partial<ChartDrawingStyle>): Partial<ChartDrawingStyle> {
  if (!style.strokeColor) {
    return style;
  }

  return {
    fillColor: style.fillColor ?? style.strokeColor,
    textColor: style.textColor ?? style.strokeColor,
    ...style,
  };
}

function applyDrawingStylePatch(
  base: ChartDrawingStyle,
  style: Partial<ChartDrawingStyle>,
): ChartDrawingStyle {
  return normalizeDrawingStyle({
    ...base,
    ...normalizeStylePatch(style),
  }, base.strokeColor);
}

function getDrawingStyleTemplate(templateId: DrawingStyleTemplateId): DrawingStyleTemplate | null {
  return DRAWING_STYLE_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export function getChartDrawingStyle(drawing: Pick<ChartDrawing, "color" | "style">): ChartDrawingStyle {
  return normalizeDrawingStyle(drawing.style, drawing.color);
}

export function applyChartDrawingStyle(
  drawing: ChartDrawing,
  style: Partial<ChartDrawingStyle>,
): ChartDrawing {
  const nextStyle = applyDrawingStylePatch(getChartDrawingStyle(drawing), style);

  return {
    ...drawing,
    color: nextStyle.strokeColor,
    style: nextStyle,
  };
}

export function applyChartDrawingTemplate(
  drawing: ChartDrawing,
  templateId: DrawingStyleTemplateId,
): ChartDrawing {
  const template = getDrawingStyleTemplate(templateId);

  return template ? applyChartDrawingStyle(drawing, template.style) : drawing;
}

function getDrawingStrokeDasharray(style: ChartDrawingStyle): string | undefined {
  if (style.lineStyle === "dashed") {
    return `${Math.max(4, style.strokeWidth * 3)} ${Math.max(3, style.strokeWidth * 2)}`;
  }

  if (style.lineStyle === "dotted") {
    return `1 ${Math.max(3, style.strokeWidth * 2)}`;
  }

  return undefined;
}

export function createChartDrawing({
  id,
  tool,
  color,
  start,
  end,
  text,
  style,
}: {
  id: string;
  tool: DrawableChartTool;
  color: string;
  start: ChartDrawingAnchor;
  end?: ChartDrawingAnchor | null;
  text?: string;
  style?: Partial<ChartDrawingStyle>;
}): ChartDrawing | null {
  if (!Number.isFinite(start.price)) {
    return null;
  }

  const drawingStyle = normalizeDrawingStyle(style, color);

  if (tool === "text") {
    return {
      id,
      tool,
      color: drawingStyle.strokeColor,
      style: drawingStyle,
      points: [start],
      text: text?.trim() || "Note",
    };
  }

  if (!end || !Number.isFinite(end.price)) {
    return null;
  }

  const points: ChartDrawingAnchor[] = (() => {
    switch (tool) {
      case "horizontal-line":
        return [
          start,
          { time: end.time, price: start.price },
        ];
      case "vertical-line":
        return [
          start,
          { time: start.time, price: end.price },
        ];
      default:
        return [start, end];
    }
  })();

  return {
    id,
    tool,
    color: drawingStyle.strokeColor,
    style: drawingStyle,
    points,
    text,
  };
}

export function createChartDrawingDraft({
  tool,
  color,
  style,
  start,
  text,
}: {
  tool: DrawableChartTool;
  color: string;
  style: Partial<ChartDrawingStyle>;
  start: PointerChartAnchor;
  text?: string;
}): ChartDrawingDraft {
  const drawingStyle = normalizeDrawingStyle(style, color);

  return {
    tool,
    color: drawingStyle.strokeColor,
    style: drawingStyle,
    start,
    end: start,
    startPoint: { x: start.x, y: start.y },
    endPoint: { x: start.x, y: start.y },
    text,
  };
}

export function updateChartDrawingDraftEnd(
  draft: ChartDrawingDraft,
  end: PointerChartAnchor,
): ChartDrawingDraft {
  return {
    ...draft,
    end,
    endPoint: { x: end.x, y: end.y },
  };
}

export function completeChartDrawingDraft({
  draft,
  end,
  drawingId,
}: {
  draft: ChartDrawingDraft;
  end?: PointerChartAnchor | null;
  drawingId: string;
}): ChartDrawing | null {
  const resolvedEnd = end ?? {
    ...draft.end,
    x: draft.endPoint.x,
    y: draft.endPoint.y,
  };
  const distance = Math.hypot(
    resolvedEnd.x - draft.startPoint.x,
    resolvedEnd.y - draft.startPoint.y,
  );

  if (isTwoPointDrawingTool(draft.tool) && distance < MIN_DRAWING_DISTANCE) {
    return null;
  }

  return createChartDrawing({
    id: drawingId,
    tool: draft.tool,
    color: draft.color,
    style: draft.style,
    start: draft.start,
    end: resolvedEnd,
    text: draft.text,
  });
}

function calculateDrawingMetrics(drawing: ChartDrawing): DrawingMetrics | null {
  const [start, end] = drawing.points;
  if (!start || !end) {
    return null;
  }

  const priceChange = end.price - start.price;
  const percentChange = start.price === 0 ? null : (priceChange / start.price) * 100;

  return {
    priceChange,
    percentChange,
  };
}

function formatSignedNumber(value: number, maximumFractionDigits: number): string {
  const sign = value > 0 ? "+" : "";

  return `${sign}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(value)}`;
}

export function formatDrawingMetricLabel(drawing: ChartDrawing): string {
  const metrics = calculateDrawingMetrics(drawing);
  if (!metrics) {
    return "";
  }

  const priceDigits = Math.abs(metrics.priceChange) >= 1 ? 2 : 5;
  const priceChange = formatSignedNumber(metrics.priceChange, priceDigits);
  const percentChange = metrics.percentChange === null
    ? "--"
    : `${formatSignedNumber(metrics.percentChange, 2)}%`;

  return `${priceChange} / ${percentChange}`;
}

export function snapDrawingAnchorToCandles(
  anchor: ChartDrawingAnchor,
  chartCandles: Array<CandlestickData<UTCTimestamp>>,
): ChartDrawingAnchor {
  if (chartCandles.length === 0) {
    return anchor;
  }

  const logical = Number(anchor.logical);
  if (Number.isFinite(logical) && (logical < 0 || logical > chartCandles.length - 1)) {
    return anchor;
  }

  const nearest = chartCandles.reduce<{ candle: CandlestickData<UTCTimestamp>; logical: number }>((nearest, candidate, index) => {
    const nearestDistance = Math.abs(Number(nearest.candle.time) - Number(anchor.time));
    const candidateDistance = Math.abs(Number(candidate.time) - Number(anchor.time));
    return candidateDistance < nearestDistance ? { candle: candidate, logical: index } : nearest;
  }, { candle: chartCandles[0], logical: 0 });
  const nearestCandle = nearest.candle;

  const priceCandidates = [
    nearestCandle.open,
    nearestCandle.high,
    nearestCandle.low,
    nearestCandle.close,
  ].filter((value): value is number => Number.isFinite(value));

  const nearestPrice = priceCandidates.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(nearest - anchor.price);
    const candidateDistance = Math.abs(candidate - anchor.price);
    return candidateDistance < nearestDistance ? candidate : nearest;
  }, priceCandidates[0] ?? anchor.price);

  return {
    time: nearestCandle.time as UTCTimestamp,
    logical: nearest.logical,
    price: nearestPrice,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Extrapolation helpers — allow drawings anywhere on the chart canvas
// even when the pointer is outside the data range (no candle data).
// ═══════════════════════════════════════════════════════════════════

function extrapolateTimeFromCoordinate(
  chart: IChartApi,
  x: number,
): UTCTimestamp | null {
  const timeScale = chart.timeScale();
  const logicalRange = timeScale.getVisibleLogicalRange();
  if (!logicalRange) return null;

  const xFrom = timeScale.logicalToCoordinate(logicalRange.from);
  const xTo = timeScale.logicalToCoordinate(logicalRange.to);

  if (xFrom === null || xTo === null || xFrom === xTo) return null;

  const tFrom = timeScale.coordinateToTime(xFrom);
  const tTo = timeScale.coordinateToTime(xTo);

  if (tFrom === null || tTo === null || typeof tFrom !== "number" || typeof tTo !== "number") return null;

  const timePerPixel = (tTo - tFrom) / (xTo - xFrom);
  return Math.round(tFrom + (x - xFrom) * timePerPixel) as UTCTimestamp;
}

function extrapolatePriceFromCoordinate(
  candleSeries: ISeriesApi<"Candlestick">,
  y: number,
  containerHeight: number,
): number | null {
  const probeY1 = Math.max(1, containerHeight * 0.05);
  const probeY2 = Math.max(1, containerHeight * 0.95);

  if (probeY1 === probeY2) return null;

  const p1 = candleSeries.coordinateToPrice(probeY1);
  const p2 = candleSeries.coordinateToPrice(probeY2);

  if (p1 === null || p2 === null) return null;

  const pricePerPixel = (p2 - p1) / (probeY2 - probeY1);
  return p1 + (y - probeY1) * pricePerPixel;
}

function buildExtrapolationParams(
  chart: IChartApi,
  candleSeries: ISeriesApi<"Candlestick">,
  containerWidth: number,
  containerHeight: number,
): {
  timeParams: { timePerPixel: number; baseTime: number; baseX: number } | null;
  priceParams: { pricePerPixel: number; basePrice: number; baseY: number } | null;
} {
  const timeScale = chart.timeScale();

  let timeParams = null;
  let priceParams = null;

  // Preferred: derive the time/pixel mapping from the visible *time* range.
  // getVisibleRange() returns real bar times, so timeToCoordinate() on them
  // never returns null. The logical-range path below relies on
  // coordinateToTime() at the view edges, which returns null whenever an edge
  // falls in trailing whitespace (the normal state of a replay chart) — that
  // left timeParams null, so dragged drawings whose times go off-grid could
  // not be positioned and vanished. This path stays valid as long as any bar
  // is on screen.
  const visibleRange = timeScale.getVisibleRange();
  if (visibleRange) {
    const tFrom = Number(visibleRange.from);
    const tTo = Number(visibleRange.to);
    if (Number.isFinite(tFrom) && Number.isFinite(tTo) && tTo !== tFrom) {
      const xFrom = timeScale.timeToCoordinate(visibleRange.from);
      const xTo = timeScale.timeToCoordinate(visibleRange.to);
      if (xFrom !== null && xTo !== null && xFrom !== xTo) {
        timeParams = {
          timePerPixel: (tTo - tFrom) / (Number(xTo) - Number(xFrom)),
          baseTime: tFrom,
          baseX: Number(xFrom),
        };
      }
    }
  }

  // Fallback: logical-range based mapping for views with no visible bars.
  if (!timeParams) {
    const logicalRange = timeScale.getVisibleLogicalRange();
    if (logicalRange) {
      const xFrom = timeScale.logicalToCoordinate(logicalRange.from);
      const xTo = timeScale.logicalToCoordinate(logicalRange.to);

      if (xFrom !== null && xTo !== null && xFrom !== xTo) {
        const tFrom = timeScale.coordinateToTime(xFrom);
        const tTo = timeScale.coordinateToTime(xTo);

        if (tFrom !== null && tTo !== null && typeof tFrom === "number" && typeof tTo === "number") {
          timeParams = {
            timePerPixel: (tTo - tFrom) / (xTo - xFrom),
            baseTime: tFrom,
            baseX: xFrom,
          };
        }
      }
    }
  }

  const probeY1 = Math.max(1, containerHeight * 0.05);
  const probeY2 = Math.max(1, containerHeight * 0.95);

  if (probeY1 !== probeY2 && containerWidth > 0 && containerHeight > 0) {
    const p1 = candleSeries.coordinateToPrice(probeY1);
    const p2 = candleSeries.coordinateToPrice(probeY2);

    if (p1 !== null && p2 !== null) {
      priceParams = {
        pricePerPixel: (p2 - p1) / (probeY2 - probeY1),
        basePrice: p1,
        baseY: probeY1,
      };
    }
  }

  return { timeParams, priceParams };
}

export function positionChartDrawing({
  drawing,
  width,
  height,
  logicalToCoordinate,
  timeToCoordinate,
  priceToCoordinate,
}: {
  drawing: ChartDrawing;
  width: number;
  height: number;
  logicalToCoordinate?: (logical: number) => number | null;
  timeToCoordinate: (time: UTCTimestamp) => number | null;
  priceToCoordinate: (price: number) => number | null;
}): PositionedChartDrawing | null {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const points = drawing.points.reduce<PositionedChartDrawing["points"]>((result, point) => {
    let x = timeToCoordinate(point.time);
    // When a point's time falls outside the chart's mapped range (panned far,
    // or no bars on screen) the time mapping yields null — fall back to the
    // point's logical index so the drawing stays anchored instead of vanishing.
    if ((x == null || !Number.isFinite(x)) && logicalToCoordinate && Number.isFinite(point.logical)) {
      x = logicalToCoordinate(Number(point.logical));
    }
    const y = priceToCoordinate(point.price);

    if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) {
      return result;
    }

    result.push({
      ...point,
      x,
      y,
    });

    return result;
  }, []);

  if (points.length !== drawing.points.length) {
    return null;
  }

  return {
    ...drawing,
    points,
    metrics: calculateDrawingMetrics(drawing),
  };
}

export function estimateDrawingTimeFromLogical(
  logical: number,
  chartCandles: Array<CandlestickData<UTCTimestamp>>,
): UTCTimestamp | null {
  if (!Number.isFinite(logical) || chartCandles.length === 0) {
    return null;
  }

  if (chartCandles.length === 1) {
    return chartCandles[0].time as UTCTimestamp;
  }

  const lastIndex = chartCandles.length - 1;
  const intervalAt = (leftIndex: number, rightIndex: number) => (
    Number(chartCandles[rightIndex].time) - Number(chartCandles[leftIndex].time)
  );

  if (logical <= 0) {
    const interval = intervalAt(0, 1);
    return Math.round(Number(chartCandles[0].time) + logical * interval) as UTCTimestamp;
  }

  if (logical >= lastIndex) {
    const interval = intervalAt(lastIndex - 1, lastIndex);
    return Math.round(Number(chartCandles[lastIndex].time) + (logical - lastIndex) * interval) as UTCTimestamp;
  }

  const leftIndex = Math.floor(logical);
  const rightIndex = Math.ceil(logical);
  if (leftIndex === rightIndex) {
    return chartCandles[leftIndex].time as UTCTimestamp;
  }

  const leftTime = Number(chartCandles[leftIndex].time);
  const rightTime = Number(chartCandles[rightIndex].time);
  const ratio = logical - leftIndex;

  return Math.round(leftTime + (rightTime - leftTime) * ratio) as UTCTimestamp;
}

export function resolveDrawingAnchorFromCoordinate({
  x,
  y,
  chartCandles,
  coordinateToTime,
  coordinateToLogical,
  coordinateToPrice,
  isMagnetEnabled = false,
}: {
  x: number;
  y: number;
  chartCandles: Array<CandlestickData<UTCTimestamp>>;
  coordinateToTime: (x: number) => number | null;
  coordinateToLogical: (x: number) => number | null;
  coordinateToPrice: (y: number) => number | null;
  isMagnetEnabled?: boolean;
}): ChartDrawingAnchor | null {
  const rawTime = coordinateToTime(x);
  const rawLogical = coordinateToLogical(x);
  const logical = rawLogical != null && Number.isFinite(Number(rawLogical))
    ? Number(rawLogical)
    : undefined;
  const price = coordinateToPrice(y);

  let time = rawTime != null && Number.isFinite(Number(rawTime))
    ? Number(rawTime)
    : null;

  if (time == null && logical !== undefined) {
    time = estimateDrawingTimeFromLogical(logical, chartCandles);
  }

  if (time == null || price == null || !Number.isFinite(Number(price))) {
    return null;
  }

  const anchor: ChartDrawingAnchor = {
    time: time as UTCTimestamp,
    price: Number(price),
  };

  if (logical !== undefined) {
    anchor.logical = logical;
  }

  return isMagnetEnabled ? snapDrawingAnchorToCandles(anchor, chartCandles) : anchor;
}

export function calculateDrawingAnchorDelta(
  start: ChartDrawingAnchor,
  end: ChartDrawingAnchor,
): { dt: number; dLogical: number | null; dp: number } {
  const hasLogicalDelta = Number.isFinite(start.logical) && Number.isFinite(end.logical);

  return {
    dt: Number(end.time) - Number(start.time),
    dLogical: hasLogicalDelta ? Number(end.logical) - Number(start.logical) : null,
    dp: end.price - start.price,
  };
}

export function moveChartDrawing(
  drawing: ChartDrawing,
  delta: { dt: number; dLogical?: number | null; dp: number },
): ChartDrawing {
  return {
    ...drawing,
    points: drawing.points.map((point) => {
      const moved: ChartDrawingAnchor = {
        time: (Number(point.time) + delta.dt) as UTCTimestamp,
        price: point.price + delta.dp,
      };

      if (Number.isFinite(point.logical) && delta.dLogical != null && Number.isFinite(delta.dLogical)) {
        moved.logical = Number(point.logical) + delta.dLogical;
      }

      return moved;
    }),
  };
}

export function replaceChartDrawingPoint(
  drawing: ChartDrawing,
  pointIndex: number,
  point: ChartDrawingAnchor,
): ChartDrawing {
  return {
    ...drawing,
    points: drawing.points.map((currentPoint, index) => (
      index === pointIndex ? { ...point } : { ...currentPoint }
    )),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function renderDrawingLabel({
  x,
  y,
  text,
  color,
  fontSize,
  textAnchor,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize?: number;
  textAnchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={fontSize ?? DEFAULT_DRAWING_STYLE.textSize}
      fontWeight="700"
      paintOrder="stroke"
      stroke="hsl(var(--background))"
      strokeWidth="4"
      textAnchor={textAnchor}
    >
      {text}
    </text>
  );
}

function renderDrawingSelectionHandles(drawing: PositionedChartDrawing, color: string) {
  return drawing.points.map((point, index) => (
    <circle
      key={`${drawing.id}-handle-${index}`}
      cx={point.x}
      cy={point.y}
      r={4}
      fill="hsl(var(--background))"
      stroke={color}
      strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
    />
  ));
}

function renderPositionedChartDrawing(
  drawing: PositionedChartDrawing,
  width: number,
  height: number,
  {
    isDraft = false,
    isSelected = false,
    onSelect,
  }: {
    isDraft?: boolean;
    isSelected?: boolean;
    onSelect?: (drawingId: string) => void;
  } = {},
) {
  const [start, end] = drawing.points;
  if (!start) {
    return null;
  }

  const drawingStyle = getChartDrawingStyle(drawing);
  const strokeDasharray = isDraft ? "5 5" : getDrawingStrokeDasharray(drawingStyle);
  const strokeWidth = isDraft ? 1.5 : drawingStyle.strokeWidth;
  const selectionHandles = isSelected ? renderDrawingSelectionHandles(drawing, drawingStyle.strokeColor) : null;
  const interactiveProps = onSelect && !isDraft
    ? {
        className: "pointer-events-none",
        "data-drawing-id": drawing.id,
      }
    : { className: "pointer-events-none" };
  const commonLineProps = {
    stroke: drawingStyle.strokeColor,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth,
    strokeDasharray,
    vectorEffect: "non-scaling-stroke" as const,
  };

  switch (drawing.tool) {
    case "trend-line":
      if (!end) return null;
      return (
        <g key={drawing.id} {...interactiveProps}>
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} {...commonLineProps} />
          {drawing.text ? renderDrawingLabel({
            x: (start.x + end.x) / 2 + 8,
            y: (start.y + end.y) / 2 - 8,
            text: drawing.text,
            color: drawingStyle.textColor,
            fontSize: drawingStyle.textSize,
          }) : null}
          {selectionHandles}
        </g>
      );
    case "ray": {
      if (!end) return null;
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const rayEndX = deltaX < 0 ? 0 : width;
      const rayEndY = Math.abs(deltaX) < 0.001
        ? end.y
        : start.y + deltaY * ((rayEndX - start.x) / deltaX);

      return (
        <g key={drawing.id} {...interactiveProps}>
          <line x1={start.x} y1={start.y} x2={rayEndX} y2={rayEndY} {...commonLineProps} />
          {drawing.text ? renderDrawingLabel({
            x: start.x + 8,
            y: start.y - 8,
            text: drawing.text,
            color: drawingStyle.textColor,
            fontSize: drawingStyle.textSize,
          }) : null}
          {selectionHandles}
        </g>
      );
    }
    case "horizontal-line":
      return (
        <g key={drawing.id} {...interactiveProps}>
          <line x1={0} y1={start.y} x2={width} y2={start.y} {...commonLineProps} />
          {drawing.text ? renderDrawingLabel({
            x: 8,
            y: clamp(start.y - 6, 12, Math.max(12, height - 8)),
            text: drawing.text,
            color: drawingStyle.textColor,
            fontSize: drawingStyle.textSize,
          }) : null}
          {renderDrawingLabel({
            x: Math.max(8, width - 92),
            y: clamp(start.y - 6, 12, Math.max(12, height - 8)),
            text: formatPrice(start.price),
            color: drawingStyle.textColor,
            fontSize: drawingStyle.textSize,
          })}
          {selectionHandles}
        </g>
      );
    case "vertical-line":
      return (
        <g key={drawing.id} {...interactiveProps}>
          <line x1={start.x} y1={0} x2={start.x} y2={height} {...commonLineProps} />
          {drawing.text ? renderDrawingLabel({
            x: start.x + 8,
            y: 20,
            text: drawing.text,
            color: drawingStyle.textColor,
            fontSize: drawingStyle.textSize,
          }) : null}
          {selectionHandles}
        </g>
      );
    case "rectangle": {
      if (!end) return null;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const rectWidth = Math.abs(end.x - start.x);
      const rectHeight = Math.abs(end.y - start.y);
      const centerX = (start.x + end.x) / 2;
      const centerY = (start.y + end.y) / 2;

      return (
        <g key={drawing.id} {...interactiveProps}>
          <rect
            x={x}
            y={y}
            width={rectWidth}
            height={rectHeight}
            fill={drawingStyle.fillColor}
            fillOpacity={drawingStyle.fillOpacity}
            stroke={drawingStyle.strokeColor}
            strokeDasharray={strokeDasharray}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={3}
            fill="hsl(var(--background))"
            stroke={drawingStyle.strokeColor}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <line x1={centerX - 4} y1={centerY} x2={centerX + 4} y2={centerY}
            stroke={drawingStyle.strokeColor} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <line x1={centerX} y1={centerY - 4} x2={centerX} y2={centerY + 4}
            stroke={drawingStyle.strokeColor} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {drawing.text ? renderDrawingLabel({
            x: x + rectWidth - 8, 
            y: centerY + 4,
            text: drawing.text,
            color: drawingStyle.textColor,
            fontSize: drawingStyle.textSize,
            textAnchor: "end",
          }) : null}
          {selectionHandles}
        </g>
      );
    }
    case "long-position":
    case "short-position": {
      if (!end) return null;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const boxWidth = Math.max(24, Math.abs(end.x - start.x));
      const boxHeight = Math.max(12, Math.abs(end.y - start.y));
      const isLong = drawing.tool === "long-position";
      const label = `${isLong ? "Long" : "Short"} ${formatDrawingMetricLabel(drawing)}`;

      return (
        <g key={drawing.id} {...interactiveProps}>
          <rect
            x={x}
            y={y}
            width={boxWidth}
            height={boxHeight}
            fill={drawingStyle.fillColor}
            fillOpacity={drawingStyle.fillOpacity}
            stroke={drawingStyle.strokeColor}
            strokeDasharray={strokeDasharray}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
          <line x1={x} y1={start.y} x2={x + boxWidth} y2={start.y} {...commonLineProps} />
          {renderDrawingLabel({
            x: x + 6,
            y: clamp(y - 6, 12, Math.max(12, height - 8)),
            text: label,
            color: drawingStyle.textColor,
            fontSize: drawingStyle.textSize,
          })}
          {selectionHandles}
        </g>
      );
    }
    case "measure":
      if (!end) return null;
      return (
        <g key={drawing.id} {...interactiveProps}>
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} {...commonLineProps} strokeDasharray="6 4" />
          {renderDrawingLabel({
            x: (start.x + end.x) / 2 + 8,
            y: (start.y + end.y) / 2 - 8,
            text: formatDrawingMetricLabel(drawing),
            color: drawingStyle.textColor,
            fontSize: drawingStyle.textSize,
          })}
          {selectionHandles}
        </g>
      );
    case "text":
      return (
        <g key={drawing.id} {...interactiveProps}>
          {renderDrawingLabel({
            x: start.x + 8,
            y: start.y - 8,
            text: drawing.text || "Note",
            color: drawingStyle.textColor,
            fontSize: drawingStyle.textSize,
          })}
          {selectionHandles}
        </g>
      );
    case "fibonacci": {
      if (!end) return null;
      const levels = drawing.fibonacciLevels ?? DEFAULT_FIBONACCI_LEVELS;
      const priceRange = end.price - start.price;
      const pixelRange = end.y - start.y;
      const bgY = Math.min(start.y, end.y);
      const bgH = Math.abs(end.y - start.y);

      return (
        <g key={drawing.id} {...interactiveProps}>
          <rect
            x={0} y={bgY} width={width} height={bgH}
            fill={drawingStyle.fillColor}
            fillOpacity={drawingStyle.fillOpacity}
            vectorEffect="non-scaling-stroke"
          />
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y}
            stroke={drawingStyle.strokeColor} strokeWidth={1} strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke" />
          {levels.filter((l) => l.visible).map((level) => {
            const levelY = start.y + pixelRange * level.value;
            const levelPrice = start.price + priceRange * level.value;
            return (
              <g key={`${drawing.id}-fib-${level.value}`}>
                <line x1={0} y1={levelY} x2={width} y2={levelY}
                  stroke={level.color || drawingStyle.strokeColor}
                  strokeWidth={drawingStyle.strokeWidth}
                  strokeDasharray={getDrawingStrokeDasharray(drawingStyle)}
                  vectorEffect="non-scaling-stroke" />
                {renderDrawingLabel({
                  x: Math.max(8, width - 108),
                  y: clamp(levelY - 6, 12, Math.max(12, height - 8)),
                  text: `${level.label} (${formatPrice(levelPrice)})`,
                  color: level.color || drawingStyle.textColor,
                  fontSize: drawingStyle.textSize,
                })}
              </g>
            );
          })}
          <circle cx={start.x} cy={start.y} r={3}
            fill={drawingStyle.strokeColor}
            vectorEffect="non-scaling-stroke" />
          <circle cx={end.x} cy={end.y} r={3}
            fill={drawingStyle.strokeColor}
            vectorEffect="non-scaling-stroke" />
          {selectionHandles}
        </g>
      );
    }
    default:
      return null;
  }
}

export function TradingViewPlatform({
  asset,
  timeframe,
  candles,
  pendingOrders = [],
  activePositions = [],
  closedPositions = [],
  theme,
  className,
  isPlaying,
  playbackSpeed,
  formattedTimestamp,
  startDate,
  endDate,
  currentTimestamp,
  initialDrawings,
  onDrawingsChange,
  activeTimeframe,
  isSwitchingTimeframe = false,
  onTimeframeChange,
  finishAction,
  onTogglePlayback,
  onSkip,
  onPlaybackSpeedChange,
}: TradingViewPlatformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingSurfaceRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const orderPriceLinesRef = useRef<IPriceLine[]>([]);
  const orderMarkerSyncFrameRef = useRef<number | null>(null);
  // Caches the last-rendered chart data so each replay tick can diff against it
  // and push a single bar instead of re-ingesting the whole series.
  const chartDataCacheRef = useRef<(
    IncrementalChartDataCache & {
      source: CandleData[];
      update: IncrementalChartDataUpdate;
    }
  ) | null>(null);
  const drawingIdRef = useRef(nextDrawingIdSeed(initialDrawings));
  const previousCandleCountRef = useRef(0);
  // Tracks whether the overlay actually has anything to project, so viewport
  // changes don't bump overlayRevision (forcing a full re-render) when idle.
  const shouldProjectDrawingsRef = useRef(false);
  const shouldProjectTradingSessionsRef = useRef(false);
  const dragStateRef = useRef<DrawingDragState | null>(null);
  const chartPanRef = useRef<{ prevX: number; hasMoved: boolean } | null>(null);
  // True while the user has panned back to review past candles. While set, the
  // data-update effect stops snapping the view to the live edge so newly
  // arriving candles don't yank the user out of the history they're inspecting.
  const isViewingHistoryRef = useRef(false);
  // Current vertical (price) zoom level. 1 = the chart's default scaleMargins.
  const verticalZoomRef = useRef(1);
  const [orderMarkerPositions, setOrderMarkerPositions] = useState<PositionedOrderMarkerOverlay[]>([]);
  // Hydrate once from persisted drawings; later prop changes are ignored so a
  // re-fetch can't clobber the user's in-progress edits. The parent remounts
  // this component per session (key={sessionId}), which re-runs this initializer.
  const [chartDrawings, setChartDrawings] = useState<ChartDrawing[]>(() => initialDrawings ?? []);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [drawingDraft, setDrawingDraft] = useState<ChartDrawingDraft | null>(null);
  const [activeTool, setActiveTool] = useState<ChartDrawingTool>("cursor");
  const [activeDrawingStyle, setActiveDrawingStyle] = useState<ChartDrawingStyle>(DEFAULT_DRAWING_STYLE);
  const [drawingText, setDrawingText] = useState("Note");
  const [isMagnetEnabled, setIsMagnetEnabled] = useState(false);
  const [areDrawingsLocked, setAreDrawingsLocked] = useState(false);
  const [areDrawingsVisible, setAreDrawingsVisible] = useState(true);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [overlayRevision, setOverlayRevision] = useState(0);
  const [customTemplates, setCustomTemplates] = useState<DrawingStyleTemplate[]>([]);
  const [templateNameDialogOpen, setTemplateNameDialogOpen] = useState(false);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [fibonacciDialogOpen, setFibonacciDialogOpen] = useState(false);
  const [fibonacciEditLevels, setFibonacciEditLevels] = useState<FibonacciLevel[]>([]);
  const [fibonacciEditDrawingId, setFibonacciEditDrawingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tradingview-custom-templates");
      if (stored) {
        setCustomTemplates(JSON.parse(stored));
      }
    } catch {
      // ignore corrupt localStorage data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("tradingview-custom-templates", JSON.stringify(customTemplates));
  }, [customTemplates]);

  // Notify the parent whenever drawings change so it can persist them. The
  // first run is the initial hydration, which we skip to avoid re-saving data
  // we just loaded.
  const onDrawingsChangeRef = useRef(onDrawingsChange);
  useEffect(() => {
    onDrawingsChangeRef.current = onDrawingsChange;
  }, [onDrawingsChange]);
  const hasEmittedDrawingsRef = useRef(false);
  useEffect(() => {
    if (!hasEmittedDrawingsRef.current) {
      hasEmittedDrawingsRef.current = true;
      return;
    }
    onDrawingsChangeRef.current?.(chartDrawings);
  }, [chartDrawings]);

  const chartDataUpdate = useMemo(() => {
    const cached = chartDataCacheRef.current;
    if (cached?.source === candles) {
      return cached.update;
    }

    const update = buildIncrementalChartData(candles, cached);
    chartDataCacheRef.current = {
      data: update.data,
      source: candles,
      sourceLength: update.sourceLength,
      update,
    };

    return update;
  }, [candles]);
  const chartData = chartDataUpdate.data;
  const orderMarkerOverlays = useMemo(
    () => buildOrderMarkerOverlays({
      pendingOrders,
      activePositions,
      closedPositions,
      chartCandles: chartData.candles,
      placementFallbackTimestamp: currentTimestamp,
    }),
    [activePositions, chartData.candles, closedPositions, currentTimestamp, pendingOrders],
  );
  const tradingSessionOverlays = useMemo(
    () => buildTradingSessionOverlays(chartData.candles),
    [chartData.candles],
  );
  const orderPriceLines = useMemo(
    () => buildOrderPriceLines({ activePositions, pendingOrders }),
    [activePositions, pendingOrders],
  );
  const palette = useMemo(() => getPalette(theme), [theme]);
  const progress = calculateReplayProgress({ startDate, endDate, currentTimestamp });
  const latestCandle = chartData.candles.at(-1);
  const latestPrice = formatPrice(latestCandle?.close);
  const playLabel = isPlaying ? "Pause replay" : "Start replay";
  const selectedDrawing = useMemo(
    () => chartDrawings.find((drawing) => drawing.id === selectedDrawingId) ?? null,
    [chartDrawings, selectedDrawingId],
  );
  const selectedDrawingStyle = selectedDrawing ? getChartDrawingStyle(selectedDrawing) : null;
  const isDrawingMode = isDrawableChartTool(activeTool) && !areDrawingsLocked;

  const syncOrderMarkerPositions = useCallback(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chart || !candleSeries || orderMarkerOverlays.length === 0) {
      setOrderMarkerPositions((current) => (current.length === 0 ? current : []));
      return;
    }

    const timeScale = chart.timeScale();
    const nextPositions = orderMarkerOverlays.reduce<PositionedOrderMarkerOverlay[]>((result, marker) => {
      const x = timeScale.timeToCoordinate(marker.time);
      const y = candleSeries.priceToCoordinate(marker.anchorPrice);

      if (x == null || y == null) {
        return result;
      }

      result.push({
        ...marker,
        x: Number(x),
        y: Number(y),
      });

      return result;
    }, []);

    // Keep the same array reference when nothing moved so the markers don't
    // re-render every frame during pan/playback when their pixels are unchanged.
    setOrderMarkerPositions((current) => {
      if (
        current.length === nextPositions.length &&
        current.every((marker, index) => {
          const other = nextPositions[index];
          return (
            marker.id === other.id &&
            marker.x === other.x &&
            marker.y === other.y &&
            marker.text === other.text &&
            marker.color === other.color
          );
        })
      ) {
        return current;
      }

      return nextPositions;
    });
  }, [orderMarkerOverlays]);

  const syncChartSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const nextSize = {
      width: container.clientWidth,
      height: container.clientHeight,
    };

    setChartSize((previousSize) => {
      if (previousSize.width === nextSize.width && previousSize.height === nextSize.height) {
        return previousSize;
      }

      return nextSize;
    });
  }, []);

  const syncDrawingProjection = useCallback(() => {
    syncChartSize();
    // Only bump the overlay revision (which re-renders the SVG layer) when there
    // is actually something to project. Otherwise every viewport change / replay
    // tick would force a full re-render for nothing.
    if (!shouldProjectDrawingsRef.current && !shouldProjectTradingSessionsRef.current) {
      return;
    }
    setOverlayRevision((revision) => revision + 1);
  }, [syncChartSize]);

  const syncViewportOverlays = useCallback(() => {
    syncOrderMarkerPositions();
    syncDrawingProjection();
  }, [syncDrawingProjection, syncOrderMarkerPositions]);

  // Keep a ref to the latest sync fn so scheduleOrderMarkerSync can stay stable
  // ([] deps). Otherwise it changes identity on every tick (orderMarkerOverlays
  // depends on the per-tick candle array), which would re-subscribe the chart's
  // viewport listeners and re-attach the wheel handler every frame.
  const syncViewportOverlaysRef = useRef(syncViewportOverlays);
  useEffect(() => {
    syncViewportOverlaysRef.current = syncViewportOverlays;
  }, [syncViewportOverlays]);

  const scheduleOrderMarkerSync = useCallback(() => {
    if (typeof window === "undefined") {
      syncViewportOverlaysRef.current();
      return;
    }

    if (orderMarkerSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(orderMarkerSyncFrameRef.current);
    }

    orderMarkerSyncFrameRef.current = window.requestAnimationFrame(() => {
      orderMarkerSyncFrameRef.current = null;
      syncViewportOverlaysRef.current();
    });
  }, []);

  // Maintain the projection guard whenever visibility/drawing-presence changes.
  useEffect(() => {
    shouldProjectDrawingsRef.current =
      areDrawingsVisible && (chartDrawings.length > 0 || drawingDraft !== null);
  }, [areDrawingsVisible, chartDrawings.length, drawingDraft]);

  useEffect(() => {
    shouldProjectTradingSessionsRef.current = tradingSessionOverlays.length > 0;
  }, [tradingSessionOverlays.length]);

  useEffect(() => {
    if (selectedDrawingId && !chartDrawings.some((drawing) => drawing.id === selectedDrawingId)) {
      setSelectedDrawingId(null);
    }
  }, [chartDrawings, selectedDrawingId]);

  const applyStyleToCurrentTarget = useCallback((style: Partial<ChartDrawingStyle>) => {
    if (selectedDrawingId) {
      setChartDrawings((drawings) => drawings.map((drawing) => (
        drawing.id === selectedDrawingId ? applyChartDrawingStyle(drawing, style) : drawing
      )));
      return;
    }

    setActiveDrawingStyle((currentStyle) => applyDrawingStylePatch(currentStyle, style));
  }, [selectedDrawingId]);

  const applyTemplateToCurrentTarget = useCallback((templateId: string) => {
    const template = getDrawingStyleTemplate(templateId as DrawingStyleTemplateId)
      ?? customTemplates.find((t) => t.id === templateId);
    if (!template) {
      return;
    }

    // Apply style to the active "new drawings" defaults
    setActiveDrawingStyle((currentStyle) => applyDrawingStylePatch(currentStyle, template.style));

    // When no drawing is selected, also switch tool and set text from template
    if (!selectedDrawingId) {
      if (template.tool) {
        setDrawingDraft(null);
        setActiveTool(template.tool);
      }
      if (template.text != null) {
        setDrawingText(template.text);
      }
    }

    // Apply style (and text) to the selected drawing
    if (selectedDrawingId) {
      setChartDrawings((drawings) => drawings.map((drawing) => {
        if (drawing.id !== selectedDrawingId) return drawing;
        const styled = applyChartDrawingStyle(drawing, template.style);
        return template.text != null ? { ...styled, text: template.text } : styled;
      }));
    }
  }, [customTemplates, selectedDrawingId]);

  const saveCurrentStyleAsTemplate = useCallback((name: string) => {
    const style = selectedDrawingStyle ?? activeDrawingStyle;
    const newTemplate: DrawingStyleTemplate = {
      id: `custom-${Date.now()}`,
      label: name,
      style: { ...style },
      tool: selectedDrawing?.tool,
      text: selectedDrawing?.text?.trim() || undefined,
    };
    setCustomTemplates((prev) => [...prev, newTemplate]);
  }, [activeDrawingStyle, selectedDrawing, selectedDrawingStyle]);

  const deleteCustomTemplate = useCallback((templateId: string) => {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }, []);

  const updateSelectedDrawingText = useCallback((text: string) => {
    if (!selectedDrawingId) {
      setDrawingText(text);
      return;
    }

    setChartDrawings((drawings) => drawings.map((drawing) => (
      drawing.id === selectedDrawingId ? { ...drawing, text } : drawing
    )));
  }, [selectedDrawingId]);

  const selectDrawing = useCallback((drawingId: string) => {
    if (areDrawingsLocked) {
      return;
    }

    setDrawingDraft(null);
    setActiveTool("cursor");
    setSelectedDrawingId(drawingId);
  }, [areDrawingsLocked]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") {
      return;
    }

    syncChartSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        syncDrawingProjection();
      });
      observer.observe(container);

      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener("resize", syncDrawingProjection);
    return () => {
      window.removeEventListener("resize", syncDrawingProjection);
    };
  }, [syncChartSize, syncDrawingProjection]);

  // Scale the candle price-scale margins to match a vertical-zoom level, keeping
  // the same top:bottom ratio as the default layout so zoom 1 is a no-op and the
  // volume histogram keeps its space at the bottom. lightweight-charts has no
  // public price setVisibleRange in v4, so margins are the supported lever here.
  const applyVerticalZoom = useCallback((zoom: number) => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    const clampedZoom = clamp(zoom, MIN_VERTICAL_ZOOM, MAX_VERTICAL_ZOOM);
    verticalZoomRef.current = clampedZoom;

    const usable = clamp(BASE_PRICE_USABLE * clampedZoom, 0.08, 0.98);
    const remaining = 1 - usable;
    candleSeries.priceScale().applyOptions({
      scaleMargins: {
        top: remaining * BASE_PRICE_TOP_RATIO,
        bottom: remaining * (1 - BASE_PRICE_TOP_RATIO),
      },
    });
  }, []);

  // Wheel-to-zoom: non-passive listener so preventDefault() actually suppresses page scroll.
  // Over the chart body it zooms the time scale toward the cursor; over the right
  // price column it zooms the price scale vertically.
  useEffect(() => {
    const surface = drawingSurfaceRef.current;
    if (!surface) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const chart = chartRef.current;
      const candleSeries = candleSeriesRef.current;
      if (!chart || !candleSeries) return;

      const rect = surface.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;

      // Scrolling over the price axis (right column) zooms vertically.
      const priceAxisWidth = candleSeries.priceScale().width();
      if (priceAxisWidth > 0 && cursorX >= rect.width - priceAxisWidth) {
        const factor = event.deltaY > 0 ? 0.9 : 1.1; // scroll up = zoom in
        applyVerticalZoom(verticalZoomRef.current * factor);
        scheduleOrderMarkerSync();
        return;
      }

      const range = chart.timeScale().getVisibleLogicalRange();
      if (!range) return;

      const factor = event.deltaY > 0 ? 1.12 : 0.88;
      const currentWidth = range.to - range.from;
      const newWidth = Math.max(8, currentWidth * factor);

      const xFrom = chart.timeScale().logicalToCoordinate(range.from);
      const xTo = chart.timeScale().logicalToCoordinate(range.to);

      if (xFrom !== null && xTo !== null && Number(xFrom) !== Number(xTo)) {
        const ratio = Math.max(0, Math.min(1, (cursorX - Number(xFrom)) / (Number(xTo) - Number(xFrom))));
        const pivotLogical = range.from + ratio * currentWidth;
        chart.timeScale().setVisibleLogicalRange({
          from: pivotLogical - ratio * newWidth,
          to: pivotLogical + (1 - ratio) * newWidth,
        });
      } else {
        const center = (range.from + range.to) / 2;
        chart.timeScale().setVisibleLogicalRange({
          from: center - newWidth / 2,
          to: center + newWidth / 2,
        });
      }

      scheduleOrderMarkerSync();
    };

    surface.addEventListener("wheel", handleWheel, { passive: false });
    return () => surface.removeEventListener("wheel", handleWheel);
  }, [applyVerticalZoom, scheduleOrderMarkerSync]);

  const getChartAnchorFromPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>): PointerChartAnchor | null => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const surface = drawingSurfaceRef.current;

    if (!chart || !candleSeries || !surface) {
      return null;
    }

    const rect = surface.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const anchor = resolveDrawingAnchorFromCoordinate({
      x,
      y,
      chartCandles: chartData.candles,
      coordinateToTime: (coordinate) => {
        const time = chart.timeScale().coordinateToTime(coordinate);
        if (typeof time === "number" && Number.isFinite(time)) {
          return time;
        }

        const extrapolated = extrapolateTimeFromCoordinate(chart, coordinate);
        return extrapolated == null ? null : Number(extrapolated);
      },
      coordinateToLogical: (coordinate) => {
        const logical = chart.timeScale().coordinateToLogical(coordinate);
        return logical == null ? null : Number(logical);
      },
      coordinateToPrice: (coordinate) => {
        const price = candleSeries.coordinateToPrice(coordinate) as number | null;
        if (price !== null) {
          return Number(price);
        }

        return extrapolatePriceFromCoordinate(candleSeries, coordinate, rect.height);
      },
      isMagnetEnabled,
    });

    if (!anchor) {
      return null;
    }

    return {
      ...anchor,
      x,
      y,
    };
  }, [chartData.candles, isMagnetEnabled]);

  const positionedChartDrawings = useMemo(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chart || !candleSeries || !areDrawingsVisible) {
      return [];
    }

    const { timeParams, priceParams } = buildExtrapolationParams(
      chart, candleSeries, chartSize.width, chartSize.height,
    );

    return chartDrawings.reduce<PositionedChartDrawing[]>((result, drawing) => {
      const positioned = positionChartDrawing({
        drawing,
        width: chartSize.width,
        height: chartSize.height,
        logicalToCoordinate: (logical) => {
          const x = chart.timeScale().logicalToCoordinate(logical as Logical);
          return x == null ? null : Number(x);
        },
        timeToCoordinate: (time) => {
          const x = chart.timeScale().timeToCoordinate(time);
          if (x !== null) return Number(x);
          // Extrapolate pixel X for times outside the visible range
          if (timeParams) {
            const extrapolated = timeParams.baseX + (time - timeParams.baseTime) / timeParams.timePerPixel;
            if (Number.isFinite(extrapolated)) return extrapolated;
          }
          return null;
        },
        priceToCoordinate: (price) => {
          const y = candleSeries.priceToCoordinate(price);
          if (y !== null) return Number(y);
          // Extrapolate pixel Y for prices outside the visible range
          if (priceParams) {
            const extrapolated = priceParams.baseY + (price - priceParams.basePrice) / priceParams.pricePerPixel;
            if (Number.isFinite(extrapolated)) return extrapolated;
          }
          return null;
        },
      });

      if (positioned) {
        result.push(positioned);
      }

      return result;
    }, []);
  }, [areDrawingsVisible, chartDrawings, chartSize.height, chartSize.width, overlayRevision]);

  const positionedTradingSessions = useMemo(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chart || !candleSeries || tradingSessionOverlays.length === 0) {
      return [];
    }

    const { timeParams, priceParams } = buildExtrapolationParams(
      chart, candleSeries, chartSize.width, chartSize.height,
    );

    return positionTradingSessionOverlays({
      sessions: tradingSessionOverlays,
      width: chartSize.width,
      height: chartSize.height,
      timeToCoordinate: (time) => {
        const x = chart.timeScale().timeToCoordinate(time);
        if (x !== null) return Number(x);
        if (timeParams) {
          const extrapolated = timeParams.baseX + (time - timeParams.baseTime) / timeParams.timePerPixel;
          if (Number.isFinite(extrapolated)) return extrapolated;
        }
        return null;
      },
      priceToCoordinate: (price) => {
        const y = candleSeries.priceToCoordinate(price);
        if (y !== null) return Number(y);
        if (priceParams) {
          const extrapolated = priceParams.baseY + (price - priceParams.basePrice) / priceParams.pricePerPixel;
          if (Number.isFinite(extrapolated)) return extrapolated;
        }
        return null;
      },
    });
  }, [chartSize.height, chartSize.width, overlayRevision, tradingSessionOverlays]);

  const positionedDraftDrawing = useMemo(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chart || !candleSeries || !drawingDraft) {
      return null;
    }

    const drawing = createChartDrawing({
      id: "draft-drawing",
      tool: drawingDraft.tool,
      color: drawingDraft.color,
      style: drawingDraft.style,
      start: drawingDraft.start,
      end: drawingDraft.end,
      text: drawingDraft.text,
    });

    if (!drawing) {
      return null;
    }

    return positionChartDrawing({
      drawing,
      width: chartSize.width,
      height: chartSize.height,
      logicalToCoordinate: (logical) => {
        const x = chart.timeScale().logicalToCoordinate(logical as Logical);
        return x == null ? null : Number(x);
      },
      timeToCoordinate: (time) => {
        const x = chart.timeScale().timeToCoordinate(time);
        return x == null ? null : Number(x);
      },
      priceToCoordinate: (price) => {
        const y = candleSeries.priceToCoordinate(price);
        return y == null ? null : Number(y);
      },
    });
  }, [chartSize.height, chartSize.width, drawingDraft, overlayRevision]);

  const handleDrawingPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    // ── Check existing drawing hits first (regardless of activeTool) ──
    // This fixes the bug where having a drawing tool active would intercept
    // clicks on existing drawings, causing them to appear to "disappear"
    // (get deselected + a new draft starts instead of moving the object).
    if (!areDrawingsLocked) {
      const surface = drawingSurfaceRef.current;
      if (surface) {
        const rect = surface.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;

        const candidateIds = selectedDrawingId
          ? [selectedDrawingId, ...chartDrawings.map((d) => d.id).filter((id) => id !== selectedDrawingId)]
          : chartDrawings.map((d) => d.id);

        for (const drawingId of candidateIds) {
          const posDrawing = positionedChartDrawings.find((d) => d.id === drawingId);
          if (!posDrawing) continue;
          const hit = hitTestDrawing(canvasX, canvasY, posDrawing);
          if (!hit) continue;

          event.preventDefault();
          event.stopPropagation();

          if (hit.pointIndex >= 0) {
            const sourceDrawing = chartDrawings.find((d) => d.id === drawingId);
            if (!sourceDrawing) continue;
            (event.target as Element).setPointerCapture?.(event.pointerId);
            dragStateRef.current = {
              drawingId,
              pointIndex: hit.pointIndex,
              startMousePosition: { x: event.clientX, y: event.clientY },
              startPoints: sourceDrawing.points.map((p) => ({ ...p })),
              surfaceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            };
            setDrawingDraft(null);
            setActiveTool("cursor");
            setSelectedDrawingId(drawingId);
          } else if (drawingId === selectedDrawingId) {
            const sourceDrawing = chartDrawings.find((d) => d.id === drawingId);
            if (!sourceDrawing) continue;
            (event.target as Element).setPointerCapture?.(event.pointerId);
            setDrawingDraft(null);
            dragStateRef.current = {
              drawingId,
              pointIndex: -1,
              startMousePosition: { x: event.clientX, y: event.clientY },
              startPoints: sourceDrawing.points.map((p) => ({ ...p })),
              surfaceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            };
          } else {
            setDrawingDraft(null);
            setActiveTool("cursor");
            setSelectedDrawingId(drawingId);
          }
          return;
        }
      }
    }

    // ── Drawing-creation mode ──
    if (isDrawableChartTool(activeTool) && !areDrawingsLocked) {
      const anchor = getChartAnchorFromPointer(event);
      if (!anchor) {
        return;
      }

      event.preventDefault();
      setSelectedDrawingId(null);

      if (drawingDraft?.tool === activeTool && isTwoPointDrawingTool(activeTool)) {
        const drawingId = `drawing-${drawingIdRef.current++}`;
        const drawing = completeChartDrawingDraft({
          draft: drawingDraft,
          end: anchor,
          drawingId,
        });

        if (drawing) {
          if (activeTool === "fibonacci") {
            drawing.fibonacciLevels = DEFAULT_FIBONACCI_LEVELS.map((l) => ({ ...l }));
          }
          setChartDrawings((drawings) => [...drawings, drawing]);
          setSelectedDrawingId(drawingId);
        }

        setDrawingDraft(null);
        setActiveTool("cursor");
        return;
      }

      if (isTwoPointDrawingTool(activeTool)) {
        setDrawingDraft(createChartDrawingDraft({
          tool: activeTool,
          color: activeDrawingStyle.strokeColor,
          style: activeDrawingStyle,
          start: anchor,
          text: drawingText,
        }));
        return;
      }

      const drawingId = `drawing-${drawingIdRef.current++}`;
      const drawing = createChartDrawing({
        id: drawingId,
        tool: activeTool,
        color: activeDrawingStyle.strokeColor,
        style: activeDrawingStyle,
        start: anchor,
        end: anchor,
        text: drawingText,
      });

      if (drawing) {
        if (activeTool === "fibonacci") {
          drawing.fibonacciLevels = DEFAULT_FIBONACCI_LEVELS.map((l) => ({ ...l }));
        }
        setDrawingDraft(null);
        setChartDrawings((drawings) => [...drawings, drawing]);
        setSelectedDrawingId(drawingId);
        setActiveTool("cursor");
      }

      return;
    }

    // Clicked empty canvas area: start a chart pan gesture.
    // Deselection happens on pointer-up only if the pointer didn't move (i.e. it was a plain click).
    (event.target as Element).setPointerCapture?.(event.pointerId);
    chartPanRef.current = { prevX: event.clientX, hasMoved: false };
  }, [
    activeDrawingStyle,
    activeTool,
    areDrawingsLocked,
    chartDrawings,
    drawingDraft,
    drawingText,
    getChartAnchorFromPointer,
    positionedChartDrawings,
    selectedDrawingId,
  ]);

  const handleDrawingPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    // Drag update (check FIRST — stale drawingDraft from a prior incomplete
    // drawing operation must not block live drag of an existing object).
    const dragState = dragStateRef.current;
    if (dragState) {
      event.preventDefault();

      const chart = chartRef.current;
      const candleSeries = candleSeriesRef.current;
      if (!chart || !candleSeries) return;

      const pixelDX = event.clientX - dragState.startMousePosition.x;
      const pixelDY = event.clientY - dragState.startMousePosition.y;
      const { dt, dp } = pixelDeltaToChartDelta(
        chart, candleSeries, pixelDX, pixelDY, dragState.surfaceRect.height,
      );

      setChartDrawings((drawings) => drawings.map((drawing) => {
        if (drawing.id !== dragState.drawingId) return drawing;
        return {
          ...drawing,
          points: dragState.startPoints.map((point, i) => {
            if (dragState.pointIndex === -1 || dragState.pointIndex === i) {
              return {
                time: (point.time + dt) as UTCTimestamp,
                price: point.price + dp,
              };
            }
            return { ...point };
          }),
        };
      }));
      return;
    }

    // Chart pan — horizontal scroll while dragging on empty canvas
    const panState = chartPanRef.current;
    if (panState && !drawingDraft) {
      const dx = event.clientX - panState.prevX;
      if (Math.abs(dx) > 0) {
        const chart = chartRef.current;
        if (chart) {
          const timeScale = chart.timeScale();
          const range = timeScale.getVisibleLogicalRange();
          // Derive bars-per-pixel from the time-scale width rather than from
          // logicalToCoordinate() differences: width() always returns a usable
          // pixel value, whereas logicalToCoordinate() can return null at the
          // view edges (trailing whitespace on a replay chart), which silently
          // killed the pan.
          const width = timeScale.width();
          if (range && width > 0) {
            const logicalDelta = -dx * (range.to - range.from) / width;
            const nextTo = range.to + logicalDelta;
            timeScale.setVisibleLogicalRange({
              from: range.from + logicalDelta,
              to: nextTo,
            });
            // Once the last bar scrolls off the right edge the user is
            // reviewing history; suppress live auto-scroll until they pan
            // back far enough that the latest candle is visible again.
            const lastBarIndex = previousCandleCountRef.current - 1;
            isViewingHistoryRef.current = nextTo < lastBarIndex;
            panState.hasMoved = true;
            scheduleOrderMarkerSync();
          }
        }
      }
      panState.prevX = event.clientX;
      event.preventDefault();
      return;
    }

    // Draft update (existing behaviour)
    if (drawingDraft) {
      const anchor = getChartAnchorFromPointer(event);
      if (!anchor) {
        return;
      }

      event.preventDefault();
      setDrawingDraft((currentDraft) => currentDraft
        ? updateChartDrawingDraftEnd(currentDraft, anchor)
        : currentDraft);
      return;
    }
  }, [drawingDraft, getChartAnchorFromPointer, scheduleOrderMarkerSync]);

  const handleDrawingPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    dragStateRef.current = null;
    const panState = chartPanRef.current;
    if (panState) {
      chartPanRef.current = null;
      // No movement = plain click on empty canvas → deselect the current drawing
      if (!panState.hasMoved) {
        setSelectedDrawingId(null);
      }
    }
  }, []);

  const handleDrawingPointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    setDrawingDraft(null);
    dragStateRef.current = null;
    chartPanRef.current = null;
  }, []);

  const openFibonacciDialog = useCallback((drawingId: string) => {
    const drawing = chartDrawings.find((d) => d.id === drawingId);
    if (!drawing || drawing.tool !== "fibonacci") return;
    setFibonacciEditDrawingId(drawingId);
    setFibonacciEditLevels(
      (drawing.fibonacciLevels ?? DEFAULT_FIBONACCI_LEVELS).map((l) => ({ ...l })),
    );
    setFibonacciDialogOpen(true);
  }, [chartDrawings]);

  const applyFibonacciLevels = useCallback(() => {
    if (!fibonacciEditDrawingId) return;
    setChartDrawings((drawings) =>
      drawings.map((d) =>
        d.id === fibonacciEditDrawingId
          ? { ...d, fibonacciLevels: fibonacciEditLevels.map((l) => ({ ...l })) }
          : d,
      ),
    );
    setFibonacciDialogOpen(false);
  }, [fibonacciEditDrawingId, fibonacciEditLevels]);

  const handleDrawingDoubleClick = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const surface = drawingSurfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    for (const drawing of chartDrawings) {
      if (drawing.tool !== "fibonacci") continue;
      const posDrawing = positionedChartDrawings.find((d) => d.id === drawing.id);
      if (!posDrawing) continue;
      const hit = hitTestDrawing(canvasX, canvasY, posDrawing);
      if (hit) {
        event.preventDefault();
        event.stopPropagation();
        setSelectedDrawingId(drawing.id);
        openFibonacciDialog(drawing.id);
        return;
      }
    }
  }, [chartDrawings, positionedChartDrawings, openFibonacciDialog]);

  const undoLastDrawing = useCallback(() => {
    setChartDrawings((drawings) => drawings.slice(0, -1));
  }, []);

  const deleteSelectedDrawing = useCallback(() => {
    if (!selectedDrawingId) {
      return;
    }

    setDrawingDraft(null);
    setChartDrawings((drawings) => drawings.filter((drawing) => drawing.id !== selectedDrawingId));
    setSelectedDrawingId(null);
  }, [selectedDrawingId]);

  const clearDrawings = useCallback(() => {
    setDrawingDraft(null);
    setSelectedDrawingId(null);
    setChartDrawings([]);
  }, []);

  const zoomChart = useCallback((factor: number) => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) {
      return;
    }

    const center = (range.from + range.to) / 2;
    const width = Math.max(8, (range.to - range.from) * factor);
    chart.timeScale().setVisibleLogicalRange({
      from: center - width / 2,
      to: center + width / 2,
    });
    scheduleOrderMarkerSync();
  }, [scheduleOrderMarkerSync]);

  const resetChartView = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    // Read the candle count from the ref so this callback stays stable across
    // replay ticks (otherwise it would bust the memoized toolbar every tick).
    fitLatestCandles(chart, previousCandleCountRef.current);
    isViewingHistoryRef.current = false;
    scheduleOrderMarkerSync();
  }, [scheduleOrderMarkerSync]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape") {
        setDrawingDraft(null);
        setActiveTool("cursor");
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedDrawingId) {
        event.preventDefault();
        deleteSelectedDrawing();
      } else if ((event.key === "Delete" || event.key === "Backspace") && chartDrawings.length > 0) {
        undoLastDrawing();
      }

      if (event.ctrlKey && event.key.toLowerCase() === "z" && chartDrawings.length > 0) {
        event.preventDefault();
        undoLastDrawing();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [chartDrawings.length, deleteSelectedDrawing, selectedDrawingId, undoLastDrawing]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
      autoSize: true,
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: { color: palette.crosshair, labelBackgroundColor: palette.muted },
        vertLine: { color: palette.crosshair, labelBackgroundColor: palette.muted },
      },
      grid: {
        horzLines: { color: palette.grid, style: LineStyle.Solid },
        vertLines: { color: palette.grid, style: LineStyle.Solid },
      },
      layout: {
        background: { type: ColorType.Solid, color: palette.background },
        textColor: palette.text,
      },
      localization: {
        locale: "en-US",
      },
      rightPriceScale: {
        borderColor: palette.border,
        scaleMargins: { top: 0.08, bottom: 0.24 },
      },
      timeScale: {
        borderColor: palette.border,
        rightOffset: 6,
        secondsVisible: false,
        timeVisible: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      borderDownColor: palette.down,
      borderUpColor: palette.up,
      downColor: palette.down,
      priceLineColor: palette.text,
      wickDownColor: palette.down,
      wickUpColor: palette.up,
      upColor: palette.up,
    });

    const volumeSeries = chart.addHistogramSeries({
      color: "rgba(148, 163, 184, 0.26)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      if (orderMarkerSyncFrameRef.current !== null) {
        window.cancelAnimationFrame(orderMarkerSyncFrameRef.current);
        orderMarkerSyncFrameRef.current = null;
      }
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      orderPriceLinesRef.current = [];
      setOrderMarkerPositions([]);
      previousCandleCountRef.current = 0;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;

    if (!chart || !candleSeries || !volumeSeries) {
      return;
    }

    chart.applyOptions({
      crosshair: {
        horzLine: { color: palette.crosshair, labelBackgroundColor: palette.muted },
        vertLine: { color: palette.crosshair, labelBackgroundColor: palette.muted },
      },
      grid: {
        horzLines: { color: palette.grid },
        vertLines: { color: palette.grid },
      },
      layout: {
        background: { type: ColorType.Solid, color: palette.background },
        textColor: palette.text,
      },
      rightPriceScale: {
        borderColor: palette.border,
      },
      timeScale: {
        borderColor: palette.border,
      },
    });

    candleSeries.applyOptions({
      borderDownColor: palette.down,
      borderUpColor: palette.up,
      downColor: palette.down,
      priceLineColor: palette.text,
      wickDownColor: palette.down,
      wickUpColor: palette.up,
      upColor: palette.up,
    });
  }, [palette]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;

    if (!chart || !candleSeries || !volumeSeries) {
      return;
    }

    const previousCandleCount = previousCandleCountRef.current;
    const updatedCandle = chartDataUpdate.updatedCandle;
    const updatedVolume = chartDataUpdate.updatedVolume;
    // Append/replace just the latest bar when the diff says only the tail moved;
    // a full setData() re-ingests and repaints the entire series on every tick.
    const canUseSeriesUpdate =
      chartDataUpdate.mode === "update" &&
      updatedCandle !== undefined &&
      updatedVolume !== undefined &&
      previousCandleCount > 0 &&
      chartData.candles.length >= previousCandleCount &&
      chartData.candles.length - previousCandleCount <= 1;

    if (canUseSeriesUpdate) {
      candleSeries.update(updatedCandle);
      volumeSeries.update(updatedVolume);
    } else if (chartDataUpdate.mode !== "none") {
      candleSeries.setData(chartData.candles);
      volumeSeries.setData(chartData.volumes);
    }

    if (
      previousCandleCount === 0 ||
      chartDataUpdate.mode === "reset" ||
      chartData.candles.length < previousCandleCount ||
      chartData.candles.length - previousCandleCount > 5
    ) {
      fitLatestCandles(chart, chartData.candles.length);
      isViewingHistoryRef.current = false;
    } else if (chartData.candles.length > previousCandleCount && !isViewingHistoryRef.current) {
      // Skip the snap-to-live-edge while the user is panning through past
      // candles, so reviewing history isn't interrupted by new data.
      chart.timeScale().scrollToRealTime();
    }

    previousCandleCountRef.current = chartData.candles.length;
    scheduleOrderMarkerSync();
  }, [chartData, chartDataUpdate, scheduleOrderMarkerSync]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) {
      return;
    }

    for (const priceLine of orderPriceLinesRef.current) {
      candleSeries.removePriceLine(priceLine);
    }

    const createdPriceLines = orderPriceLines.map((priceLine) => candleSeries.createPriceLine(priceLine));
    orderPriceLinesRef.current = createdPriceLines;

    return () => {
      for (const priceLine of createdPriceLines) {
        try {
          candleSeries.removePriceLine(priceLine);
        } catch {
          // The chart may already be disposed during route teardown.
        }
      }

      if (orderPriceLinesRef.current === createdPriceLines) {
        orderPriceLinesRef.current = [];
      }
    };
  }, [orderPriceLines]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    const timeScale = chart.timeScale();
    const handleChartViewportChange = () => {
      scheduleOrderMarkerSync();
    };

    timeScale.subscribeVisibleTimeRangeChange(handleChartViewportChange);
    timeScale.subscribeVisibleLogicalRangeChange(handleChartViewportChange);
    timeScale.subscribeSizeChange(handleChartViewportChange);
    scheduleOrderMarkerSync();

    return () => {
      timeScale.unsubscribeVisibleTimeRangeChange(handleChartViewportChange);
      timeScale.unsubscribeVisibleLogicalRangeChange(handleChartViewportChange);
      timeScale.unsubscribeSizeChange(handleChartViewportChange);
    };
  }, [scheduleOrderMarkerSync]);

  const renderToolbarButton = useCallback(({
    label,
    icon: Icon,
    pressed = false,
    disabled = false,
    onClick,
    className,
  }: {
    label: string;
    icon: typeof MousePointer2;
    pressed?: boolean;
    disabled?: boolean;
    onClick: () => void;
    className?: string;
  }) => (
    <Tooltip key={label}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
            pressed && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            className,
          )}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ), []);

  // Memoize the left toolbar so the ~18 Radix Tooltip buttons don't re-render on
  // every overlay/marker/draft update (pan, zoom, drag, replay tick). It only
  // rebuilds when its real inputs change (active tool, toggles, selection).
  const drawingToolbar = useMemo(() => (
    <div className="pointer-events-auto absolute left-3 top-3 z-40 flex max-h-[calc(100%-1.5rem)] w-10 flex-col items-center gap-1 overflow-y-auto rounded-md border border-border/70 bg-background/95 p-1 shadow-sm backdrop-blur">
      {DRAWING_TOOL_GROUPS.map((group, groupIndex) => (
        <div key={`tool-group-${groupIndex}`} className="flex w-full flex-col items-center gap-1">
          {groupIndex > 0 ? <div className="my-0.5 h-px w-6 bg-border/80" /> : null}
          {group.map((tool) => renderToolbarButton({
            label: tool.label,
            icon: tool.icon,
            pressed: activeTool === tool.id,
            onClick: () => {
              setDrawingDraft(null);
              setSelectedDrawingId(null);
              setActiveTool(tool.id);
            },
          }))}
        </div>
      ))}

      <div className="my-0.5 h-px w-6 bg-border/80" />
      {renderToolbarButton({
        label: "Undo drawing",
        icon: RotateCcw,
        disabled: chartDrawings.length === 0,
        onClick: undoLastDrawing,
      })}
      {renderToolbarButton({
        label: "Clear drawings",
        icon: Trash2,
        disabled: chartDrawings.length === 0,
        onClick: clearDrawings,
      })}

      <div className="my-0.5 h-px w-6 bg-border/80" />
      {renderToolbarButton({
        label: "Reset view",
        icon: Maximize2,
        onClick: resetChartView,
      })}
    </div>
  ), [
    activeTool,
    isMagnetEnabled,
    areDrawingsLocked,
    areDrawingsVisible,
    chartDrawings.length,
    selectedDrawingId,
    undoLastDrawing,
    deleteSelectedDrawing,
    clearDrawings,
    zoomChart,
    resetChartView,
    renderToolbarButton,
  ]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-background", className)} data-testid="tradingview-platform">
      <div ref={containerRef} aria-label={`${asset} replay chart`} className="h-full w-full" />

      {chartSize.width > 0 && chartSize.height > 0 && positionedTradingSessions.length > 0 ? (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-hidden"
          viewBox={`0 0 ${chartSize.width} ${chartSize.height}`}
        >
          {positionedTradingSessions.map((session) => (
            <g key={session.id}>
              <rect
                x={session.x}
                y={session.y}
                width={session.width}
                height={session.height}
                fill={session.fillColor}
                stroke={session.color}
                strokeDasharray="2 2"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={session.labelX}
                y={session.labelY}
                fill={session.color}
                fontSize={11}
                fontWeight={700}
              >
                {session.label}
              </text>
            </g>
          ))}
        </svg>
      ) : null}

      <div
        ref={drawingSurfaceRef}
        aria-hidden={!isDrawingMode}
        className={cn(
          "absolute inset-0 z-10 pointer-events-auto",
          isDrawingMode || activeTool === "crosshair"
            ? "cursor-crosshair"
            : activeTool === "cursor"
              ? "cursor-grab active:cursor-grabbing"
              : "",
        )}
        onPointerDown={handleDrawingPointerDown}
        onPointerMove={handleDrawingPointerMove}
        onPointerUp={handleDrawingPointerUp}
        onPointerCancel={handleDrawingPointerCancel}
        onDoubleClick={handleDrawingDoubleClick}
      >
        {chartSize.width > 0 && chartSize.height > 0 ? (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
            viewBox={`0 0 ${chartSize.width} ${chartSize.height}`}
          >
            {positionedChartDrawings.map((drawing) => renderPositionedChartDrawing(
              drawing,
              chartSize.width,
              chartSize.height,
              {
                isSelected: drawing.id === selectedDrawingId,
                onSelect: selectDrawing,
              },
            ))}
            {positionedDraftDrawing
              ? renderPositionedChartDrawing(positionedDraftDrawing, chartSize.width, chartSize.height, { isDraft: true })
              : null}
          </svg>
        ) : null}
      </div>

      {drawingToolbar}

      {orderMarkerPositions.map((marker) => {
        const isBuyMarker = marker.side === "Long";

        return (
          <div
            key={marker.id}
            className="pointer-events-none absolute z-20 flex flex-col items-center gap-1 whitespace-nowrap"
            style={{
              left: marker.x,
              top: marker.y,
              transform: isBuyMarker ? "translate(-50%, 0)" : "translate(-50%, -100%)",
            }}
          >
            {!isBuyMarker ? (
              <span className="rounded-sm bg-background/85 px-1.5 py-0.5 text-[11px] font-semibold shadow-sm" style={{ color: marker.color }}>
                {marker.text}
              </span>
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "h-0 w-0 border-x-[10px] border-x-transparent",
                isBuyMarker ? "border-b-[14px]" : "border-t-[14px]",
              )}
              style={isBuyMarker ? { borderBottomColor: marker.color } : { borderTopColor: marker.color }}
            />
            {isBuyMarker ? (
              <span className="rounded-sm bg-background/85 px-1.5 py-0.5 text-[11px] font-semibold shadow-sm" style={{ color: marker.color }}>
                {marker.text}
              </span>
            ) : null}
          </div>
        );
      })}

      <div className="pointer-events-none absolute left-16 right-16 top-3 z-30 flex flex-wrap items-center gap-2">
        <div className="rounded-md border border-border/70 bg-background/90 px-2.5 py-1.5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="max-w-48 truncate" title={asset}>{asset}</span>
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{timeframe}</span>
            <span className="tabular-nums text-primary">{latestPrice}</span>
          </div>
        </div>

        {selectedDrawingId !== null ? (
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-md border border-border/70 bg-background/90 px-2 py-1.5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-1.5">
              <FilePenLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Select
                value={selectedDrawingId}
                onValueChange={(value) => {
                  setDrawingDraft(null);
                  setSelectedDrawingId(value);
                  setActiveTool("cursor");
                }}
              >
                <SelectTrigger className="h-8 w-[136px] rounded-md text-xs font-semibold" aria-label="Select drawing object">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  {chartDrawings.map((drawing, index) => (
                    <SelectItem key={drawing.id} value={drawing.id}>
                      {index + 1}. {getDrawingToolDefinition(drawing.tool)?.label ?? "Drawing"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div aria-hidden="true" className="h-4 w-px bg-border/60" />

            <Select onValueChange={(value) => applyTemplateToCurrentTarget(value)}>
              <SelectTrigger className="h-8 w-[118px] rounded-md text-xs font-semibold" aria-label="Apply drawing style template">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent align="start">
                {DRAWING_STYLE_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
                {customTemplates.length > 0 ? (
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Custom</div>
                ) : null}
                {customTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              aria-label="Save current style as template"
              className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center justify-center text-sm font-bold leading-none"
              onClick={() => {
                setTemplateNameDraft("");
                setTemplateNameDialogOpen(true);
              }}
              title="Save current style as template"
            >
              +
            </button>
            {customTemplates.length > 0 ? (
              <button
                type="button"
                aria-label="Delete last custom template"
                className="h-7 w-7 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive inline-flex items-center justify-center text-xs font-bold leading-none"
                onClick={() => {
                  const last = customTemplates[customTemplates.length - 1];
                  if (last) deleteCustomTemplate(last.id);
                }}
                title="Delete last custom template"
              >
                &times;
              </button>
            ) : null}

            <div aria-hidden="true" className="h-4 w-px bg-border/60" />

            <div className="flex items-center gap-1">
              {DRAWING_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Set color to ${color}`}
                  className={cn(
                    "h-4 w-4 rounded-full border border-background shadow-sm ring-offset-background transition",
                    selectedDrawingStyle?.strokeColor === color && "ring-2 ring-ring ring-offset-1",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => applyStyleToCurrentTarget({ strokeColor: color })}
                />
              ))}
            </div>

            <Select
              value={selectedDrawingStyle?.lineStyle ?? DEFAULT_DRAWING_STYLE.lineStyle}
              onValueChange={(value) => applyStyleToCurrentTarget({ lineStyle: value as ChartDrawingLineStyle })}
            >
              <SelectTrigger className="h-8 w-[88px] rounded-md text-xs font-semibold" aria-label="Drawing line style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {DRAWING_LINE_STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(selectedDrawingStyle?.strokeWidth ?? DEFAULT_DRAWING_STYLE.strokeWidth)}
              onValueChange={(value) => applyStyleToCurrentTarget({ strokeWidth: Number(value) })}
            >
              <SelectTrigger className="h-8 w-[72px] rounded-md text-xs font-semibold" aria-label="Drawing stroke width">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {DRAWING_STROKE_WIDTHS.map((width) => (
                  <SelectItem key={width} value={String(width)}>
                    {width}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="hidden w-24 items-center gap-2 md:flex">
              <span className="text-[11px] font-semibold text-muted-foreground">Fill</span>
              <Slider
                aria-label="Drawing fill opacity"
                value={[Math.round((selectedDrawingStyle?.fillOpacity ?? DEFAULT_DRAWING_STYLE.fillOpacity) * 100)]}
                min={0}
                max={45}
                step={1}
                onValueChange={([value]) => applyStyleToCurrentTarget({ fillOpacity: (value ?? 0) / 100 })}
              />
            </div>

            {selectedDrawing ? (
              <Input
                value={selectedDrawing.text ?? ""}
                onChange={(event) => updateSelectedDrawingText(event.target.value)}
                className="h-7 w-32 rounded-md px-2 text-xs"
                aria-label="Drawing text"
              />
            ) : null}

            {selectedDrawing ? (
              <Select
                value={String(selectedDrawingStyle?.textSize ?? DEFAULT_DRAWING_STYLE.textSize)}
                onValueChange={(value) => applyStyleToCurrentTarget({ textSize: Number(value) })}
              >
                <SelectTrigger className="h-8 w-[74px] rounded-md text-xs font-semibold" aria-label="Drawing text size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  {DRAWING_TEXT_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="pointer-events-auto absolute bottom-3 left-1/2 z-30 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-md border border-border/70 bg-background/95 px-2 py-1.5 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={onTogglePlayback}
          aria-label={playLabel}
          title={playLabel}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={onSkip}
          aria-label="Skip candle"
          title="Skip candle"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
        <Select
          value={String(playbackSpeed)}
          onValueChange={(value) => onPlaybackSpeedChange(Number(value) as PlaybackSpeed)}
        >
          <SelectTrigger className="h-8 w-[74px] rounded-md text-xs font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="center">
            {SPEED_OPTIONS.map((speed) => (
              <SelectItem key={speed} value={String(speed)}>
                {speed}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden min-w-40 items-center gap-2 sm:flex">
          <span className="max-w-40 truncate text-[11px] font-semibold tabular-nums text-muted-foreground">
            {formattedTimestamp}
          </span>
          {progress !== null ? (
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </span>
          ) : null}
        </div>
        {onTimeframeChange ? (
          <>
            <div aria-hidden="true" className="h-4 w-px bg-border/60" />
            <div className="flex items-center gap-0.5">
              {TIMEFRAME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isSwitchingTimeframe}
                  aria-label={`Switch to ${option.label} timeframe`}
                  aria-pressed={activeTimeframe === option.value}
                  className={cn(
                    "h-7 min-w-9 rounded-sm border px-2 text-xs font-medium shadow-sm transition-colors disabled:opacity-50",
                    activeTimeframe === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-background/75 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  onClick={() => onTimeframeChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {finishAction ? (
          <>
            <div aria-hidden="true" className="h-4 w-px bg-border/60" />
            {finishAction}
          </>
        ) : null}
      </div>

      {chartData.candles.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <div className="rounded-md border border-border/70 bg-background/95 px-4 py-3 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur">
            Waiting for historical candles
          </div>
        </div>
      ) : null}

      <Dialog open={templateNameDialogOpen} onOpenChange={setTemplateNameDialogOpen}>
        <DialogContent className="sm:max-w-xs" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Save template</DialogTitle>
            <DialogDescription>
              Enter a name for this style template.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={templateNameDraft}
            onChange={(e) => setTemplateNameDraft(e.target.value)}
            placeholder="e.g. FVG, Supply zone..."
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && templateNameDraft.trim()) {
                saveCurrentStyleAsTemplate(templateNameDraft.trim());
                setTemplateNameDialogOpen(false);
              }
            }}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setTemplateNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!templateNameDraft.trim()}
              onClick={() => {
                saveCurrentStyleAsTemplate(templateNameDraft.trim());
                setTemplateNameDialogOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fibonacciDialogOpen} onOpenChange={setFibonacciDialogOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Fibonacci Settings</DialogTitle>
            <DialogDescription>
              Toggle visibility, change values/colors for each level.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto py-1">
            {fibonacciEditLevels.map((level, index) => (
              <div key={index} className="flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "h-7 w-7 rounded-md border text-xs font-bold",
                    level.visible
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border",
                  )}
                  onClick={() => {
                    setFibonacciEditLevels((prev) =>
                      prev.map((l, i) => (i === index ? { ...l, visible: !l.visible } : l)),
                    );
                  }}
                  title={level.visible ? "Hide level" : "Show level"}
                >
                  {level.visible ? "✓" : "—"}
                </button>
                <Input
                  type="number"
                  step="0.001"
                  value={level.value}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) {
                      setFibonacciEditLevels((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, value: v } : l)),
                      );
                    }
                  }}
                  className="h-7 w-20 rounded-md text-xs"
                />
                <button
                  type="button"
                  className="h-6 w-6 shrink-0 rounded-full border shadow-sm"
                  style={{ backgroundColor: level.color }}
                  onClick={() => {
                    const c = prompt("Enter hex color (e.g. #ff6600):", level.color);
                    if (c && /^#[0-9a-fA-F]{6}$/.test(c.trim())) {
                      setFibonacciEditLevels((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, color: c.trim() } : l)),
                      );
                    }
                  }}
                  title="Change level color"
                />
                <Input
                  value={level.label}
                  onChange={(e) => {
                    setFibonacciEditLevels((prev) =>
                      prev.map((l, i) => (i === index ? { ...l, label: e.target.value } : l)),
                    );
                  }}
                  className="h-7 w-20 rounded-md text-xs"
                  placeholder="Label"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setFibonacciDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={applyFibonacciLevels}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

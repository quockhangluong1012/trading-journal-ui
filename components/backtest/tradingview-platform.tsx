"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
const VISIBLE_CANDLE_COUNT = 120;
const LONG_COLOR = "#2563eb";
const SHORT_COLOR = "#e11d48";
const STOP_COLOR = "#dc2626";
const TARGET_COLOR = "#059669";
const PENDING_STOP_COLOR = "#f97316";
const AXIS_LABEL_TEXT_COLOR = "#ffffff";
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
  watchlist: string[];
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
  | "measure";

export type DrawableChartTool = Exclude<ChartDrawingTool, "cursor" | "crosshair">;

export type ChartDrawingLineStyle = "solid" | "dashed" | "dotted";
export type DrawingStyleTemplateId = "standard" | "focus-zone" | "execution" | "muted";

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
  id: DrawingStyleTemplateId;
  label: string;
  style: Partial<ChartDrawingStyle>;
}

export interface ChartDrawingAnchor {
  time: UTCTimestamp;
  price: number;
}

export interface ChartDrawing {
  id: string;
  tool: DrawableChartTool;
  color: string;
  style?: ChartDrawingStyle;
  points: ChartDrawingAnchor[];
  text?: string;
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

interface DrawingToolDefinition {
  id: ChartDrawingTool;
  label: string;
  icon: typeof MousePointer2;
  requiresSecondPoint: boolean;
}

const DRAWING_TOOL_GROUPS: DrawingToolDefinition[][] = [
  [
    { id: "cursor", label: "Cursor", icon: MousePointer2, requiresSecondPoint: false },
    { id: "crosshair", label: "Crosshair", icon: Crosshair, requiresSecondPoint: false },
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
    { id: "measure", label: "Measure", icon: Ruler, requiresSecondPoint: true },
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
    watchlist: [],
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

  const nearestCandle = chartCandles.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(Number(nearest.time) - Number(anchor.time));
    const candidateDistance = Math.abs(Number(candidate.time) - Number(anchor.time));
    return candidateDistance < nearestDistance ? candidate : nearest;
  }, chartCandles[0]);

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
  const logicalRange = timeScale.getVisibleLogicalRange();

  let timeParams = null;
  let priceParams = null;

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
  timeToCoordinate,
  priceToCoordinate,
}: {
  drawing: ChartDrawing;
  width: number;
  height: number;
  timeToCoordinate: (time: UTCTimestamp) => number | null;
  priceToCoordinate: (price: number) => number | null;
}): PositionedChartDrawing | null {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const points = drawing.points.reduce<PositionedChartDrawing["points"]>((result, point) => {
    const x = timeToCoordinate(point.time);
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function renderDrawingLabel({
  x,
  y,
  text,
  color,
  fontSize,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize?: number;
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
        className: "pointer-events-auto cursor-pointer",
        onPointerDown: (event: ReactPointerEvent<SVGGElement>) => {
          event.preventDefault();
          event.stopPropagation();
          onSelect(drawing.id);
        },
      }
    : {};
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
          {selectionHandles}
        </g>
      );
    }
    case "horizontal-line":
      return (
        <g key={drawing.id} {...interactiveProps}>
          <line x1={0} y1={start.y} x2={width} y2={start.y} {...commonLineProps} />
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
          {selectionHandles}
        </g>
      );
    case "rectangle": {
      if (!end) return null;
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const rectWidth = Math.abs(end.x - start.x);
      const rectHeight = Math.abs(end.y - start.y);

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
  const drawingIdRef = useRef(0);
  const previousCandleCountRef = useRef(0);
  const [orderMarkerPositions, setOrderMarkerPositions] = useState<PositionedOrderMarkerOverlay[]>([]);
  const [chartDrawings, setChartDrawings] = useState<ChartDrawing[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [drawingDraft, setDrawingDraft] = useState<ChartDrawingDraft | null>(null);
  const [activeTool, setActiveTool] = useState<ChartDrawingTool>("cursor");
  const [activeDrawingStyle, setActiveDrawingStyle] = useState<ChartDrawingStyle>(DEFAULT_DRAWING_STYLE);
  const [drawingText, setDrawingText] = useState("Note");
  const [isMagnetEnabled, setIsMagnetEnabled] = useState(true);
  const [areDrawingsLocked, setAreDrawingsLocked] = useState(false);
  const [areDrawingsVisible, setAreDrawingsVisible] = useState(true);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [overlayRevision, setOverlayRevision] = useState(0);
  const chartData = useMemo(() => mapBacktestCandlesToChartData(candles), [candles]);
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
  const styleEditorValue = selectedDrawingStyle ?? activeDrawingStyle;
  const styleTargetLabel = selectedDrawing
    ? (getDrawingToolDefinition(selectedDrawing.tool)?.label ?? "Drawing")
    : "New drawings";
  const isDrawingMode = isDrawableChartTool(activeTool) && !areDrawingsLocked;

  const syncOrderMarkerPositions = useCallback(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chart || !candleSeries || orderMarkerOverlays.length === 0) {
      setOrderMarkerPositions([]);
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

    setOrderMarkerPositions(nextPositions);
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
    setOverlayRevision((revision) => revision + 1);
  }, [syncChartSize]);

  const syncViewportOverlays = useCallback(() => {
    syncOrderMarkerPositions();
    syncDrawingProjection();
  }, [syncDrawingProjection, syncOrderMarkerPositions]);

  const scheduleOrderMarkerSync = useCallback(() => {
    if (typeof window === "undefined") {
      syncViewportOverlays();
      return;
    }

    if (orderMarkerSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(orderMarkerSyncFrameRef.current);
    }

    orderMarkerSyncFrameRef.current = window.requestAnimationFrame(() => {
      orderMarkerSyncFrameRef.current = null;
      syncViewportOverlays();
    });
  }, [syncViewportOverlays]);

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

  const applyTemplateToCurrentTarget = useCallback((templateId: DrawingStyleTemplateId) => {
    const template = getDrawingStyleTemplate(templateId);
    if (!template) {
      return;
    }

    if (selectedDrawingId) {
      setChartDrawings((drawings) => drawings.map((drawing) => (
        drawing.id === selectedDrawingId ? applyChartDrawingTemplate(drawing, templateId) : drawing
      )));
      return;
    }

    setActiveDrawingStyle((currentStyle) => applyDrawingStylePatch(currentStyle, template.style));
  }, [selectedDrawingId]);

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
    let time = chart.timeScale().coordinateToTime(x);
    let price: number | null = candleSeries.coordinateToPrice(y) as number | null;

    // Extrapolate when the pointer lands outside the chart's data range,
    // so drawings can be placed anywhere on the canvas — not just on candles.
    if (time === null || typeof time !== "number") {
      const extrapolated = extrapolateTimeFromCoordinate(chart, x);
      if (extrapolated !== null) {
        time = extrapolated;
      }
    }

    if (price === null) {
      const surfaceHeight = surface.getBoundingClientRect().height;
      const extrapolated = extrapolatePriceFromCoordinate(candleSeries, y, surfaceHeight);
      if (extrapolated !== null) {
        price = extrapolated;
      }
    }

    if (typeof time !== "number" || price == null || !Number.isFinite(Number(price))) {
      return null;
    }

    const anchor: ChartDrawingAnchor = {
      time: time as UTCTimestamp,
      price: Number(price),
    };
    const snappedAnchor = isMagnetEnabled ? snapDrawingAnchorToCandles(anchor, chartData.candles) : anchor;

    return {
      ...snappedAnchor,
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
    if (!isDrawableChartTool(activeTool) || areDrawingsLocked) {
      return;
    }

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
        setChartDrawings((drawings) => [...drawings, drawing]);
        setSelectedDrawingId(drawingId);
      }

      setDrawingDraft(null);
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
      setDrawingDraft(null);
      setChartDrawings((drawings) => [...drawings, drawing]);
      setSelectedDrawingId(drawingId);
    }
  }, [activeDrawingStyle, activeTool, areDrawingsLocked, drawingDraft, drawingText, getChartAnchorFromPointer]);

  const handleDrawingPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drawingDraft) {
      return;
    }

    const anchor = getChartAnchorFromPointer(event);
    if (!anchor) {
      return;
    }

    event.preventDefault();
    setDrawingDraft((currentDraft) => currentDraft
      ? updateChartDrawingDraftEnd(currentDraft, anchor)
      : currentDraft);
  }, [drawingDraft, getChartAnchorFromPointer]);

  const handleDrawingPointerCancel = useCallback(() => {
    setDrawingDraft(null);
  }, []);

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

    fitLatestCandles(chart, chartData.candles.length);
    scheduleOrderMarkerSync();
  }, [chartData.candles.length, scheduleOrderMarkerSync]);

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

    candleSeries.setData(chartData.candles);
    volumeSeries.setData(chartData.volumes);

    if (
      previousCandleCountRef.current === 0 ||
      chartData.candles.length < previousCandleCountRef.current ||
      chartData.candles.length - previousCandleCountRef.current > 5
    ) {
      fitLatestCandles(chart, chartData.candles.length);
    } else if (chartData.candles.length > previousCandleCountRef.current) {
      chart.timeScale().scrollToRealTime();
    }

    previousCandleCountRef.current = chartData.candles.length;
    scheduleOrderMarkerSync();
  }, [chartData, scheduleOrderMarkerSync]);

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

  const renderToolbarButton = ({
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
  );

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-background", className)} data-testid="tradingview-platform">
      <div ref={containerRef} aria-label={`${asset} replay chart`} className="h-full w-full" />

      <div
        ref={drawingSurfaceRef}
        aria-hidden={!isDrawingMode}
        className={cn(
          "absolute inset-0 z-10",
          isDrawingMode ? "pointer-events-auto cursor-crosshair" : "pointer-events-none",
        )}
        onPointerDown={handleDrawingPointerDown}
        onPointerMove={handleDrawingPointerMove}
        onPointerCancel={handleDrawingPointerCancel}
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
          label: "Magnet",
          icon: Magnet,
          pressed: isMagnetEnabled,
          onClick: () => setIsMagnetEnabled((value) => !value),
        })}
        {renderToolbarButton({
          label: "Lock drawings",
          icon: Lock,
          pressed: areDrawingsLocked,
          onClick: () => setAreDrawingsLocked((value) => !value),
        })}
        {renderToolbarButton({
          label: areDrawingsVisible ? "Hide drawings" : "Show drawings",
          icon: areDrawingsVisible ? Eye : EyeOff,
          pressed: !areDrawingsVisible,
          onClick: () => setAreDrawingsVisible((value) => !value),
        })}
        {renderToolbarButton({
          label: "Undo drawing",
          icon: RotateCcw,
          disabled: chartDrawings.length === 0,
          onClick: undoLastDrawing,
        })}
        {renderToolbarButton({
          label: "Delete selected drawing",
          icon: X,
          disabled: !selectedDrawingId,
          onClick: deleteSelectedDrawing,
        })}
        {renderToolbarButton({
          label: "Clear drawings",
          icon: Trash2,
          disabled: chartDrawings.length === 0,
          onClick: clearDrawings,
        })}

        <div className="my-0.5 h-px w-6 bg-border/80" />
        {renderToolbarButton({
          label: "Zoom in",
          icon: ZoomIn,
          onClick: () => zoomChart(0.72),
        })}
        {renderToolbarButton({
          label: "Zoom out",
          icon: ZoomOut,
          onClick: () => zoomChart(1.35),
        })}
        {renderToolbarButton({
          label: "Reset view",
          icon: Maximize2,
          onClick: resetChartView,
        })}
      </div>

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

        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-md border border-border/70 bg-background/90 px-2 py-1.5 shadow-sm backdrop-blur">
          <Select
            value={selectedDrawingId ?? "new"}
            onValueChange={(value) => {
              setDrawingDraft(null);
              setSelectedDrawingId(value === "new" ? null : value);
              if (value !== "new") {
                setActiveTool("cursor");
              }
            }}
          >
            <SelectTrigger className="h-8 w-[136px] rounded-md text-xs font-semibold" aria-label="Select drawing object">
              <FilePenLine className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="New drawings" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="new">New drawings</SelectItem>
              {chartDrawings.map((drawing, index) => (
                <SelectItem key={drawing.id} value={drawing.id}>
                  {index + 1}. {getDrawingToolDefinition(drawing.tool)?.label ?? "Drawing"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(value) => applyTemplateToCurrentTarget(value as DrawingStyleTemplateId)}>
            <SelectTrigger className="h-8 w-[118px] rounded-md text-xs font-semibold" aria-label="Apply drawing style template">
              <SelectValue placeholder="Template" />
            </SelectTrigger>
            <SelectContent align="start">
              {DRAWING_STYLE_TEMPLATES.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="max-w-28 truncate text-[11px] font-semibold text-muted-foreground">
            {styleTargetLabel}
          </span>
          <div className="flex items-center gap-1">
            {DRAWING_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color} drawing color for ${styleTargetLabel}`}
                className={cn(
                  "h-4 w-4 rounded-full border border-background shadow-sm ring-offset-background transition",
                  styleEditorValue.strokeColor === color && "ring-2 ring-ring ring-offset-1",
                )}
                style={{ backgroundColor: color }}
                onClick={() => applyStyleToCurrentTarget({ strokeColor: color })}
              />
            ))}
          </div>

          <Select
            value={styleEditorValue.lineStyle}
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
            value={String(styleEditorValue.strokeWidth)}
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
              value={[Math.round(styleEditorValue.fillOpacity * 100)]}
              min={0}
              max={45}
              step={1}
              onValueChange={([value]) => applyStyleToCurrentTarget({ fillOpacity: (value ?? 0) / 100 })}
            />
          </div>

          {(activeTool === "text" || selectedDrawing?.tool === "text") ? (
            <Input
              value={selectedDrawing?.tool === "text" ? selectedDrawing.text ?? "" : drawingText}
              onChange={(event) => updateSelectedDrawingText(event.target.value)}
              className="h-7 w-32 rounded-md px-2 text-xs"
              aria-label="Drawing text"
            />
          ) : null}

          {(activeTool === "text" || selectedDrawing?.tool === "text") ? (
            <Select
              value={String(styleEditorValue.textSize)}
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
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{chartDrawings.length}</span>
        </div>
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
      </div>

      {chartData.candles.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <div className="rounded-md border border-border/70 bg-background/95 px-4 py-3 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur">
            Waiting for historical candles
          </div>
        </div>
      ) : null}
    </div>
  );
}

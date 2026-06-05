"use client";

import type {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Loader2,
  Maximize2,
  Minimize2,
  Move,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { api, type ApiResponse, type CreateTradeRequest } from "@/lib/api";
import { PositionType } from "@/lib/enum/PositionType";
import { TradeStatus } from "@/lib/enum/TradeStatus";
import { formatTradePrice, TRADE_PRICE_INPUT_STEP } from "@/lib/trade-price-format";
import type {
  ChecklistModelApi,
  ChecklistModelDetailApi,
  PreTradeChecklistApi,
} from "@/lib/trade-store";
import { cn } from "@/lib/utils";

// ── Asset resolution (reused from tradingview-platform) ──

const FOREX_CODES = new Set([
  "AUD", "CAD", "CHF", "CNH", "EUR", "GBP", "JPY", "NZD", "USD",
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

function resolveTradingViewSymbol(raw: string): string {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (DIRECT_SYMBOL_MAP[upper]) return DIRECT_SYMBOL_MAP[upper];
  if (DIRECT_SYMBOL_MAP[trimmed]) return DIRECT_SYMBOL_MAP[trimmed];

  if (upper.length === 6) {
    const base = upper.slice(0, 3);
    const quote = upper.slice(3, 6);
    if (FOREX_CODES.has(base) && FOREX_CODES.has(quote)) {
      return `OANDA:${upper}`;
    }
  }

  return `NASDAQ:${upper}`;
}

// ── Types ──

export type TVInterval = "1" | "5" | "15" | "60" | "240" | "D" | "W";

const INTERVAL_OPTIONS: Array<{ value: TVInterval; label: string }> = [
  { value: "1", label: "1m" },
  { value: "5", label: "5m" },
  { value: "15", label: "15m" },
  { value: "60", label: "1H" },
  { value: "240", label: "4H" },
  { value: "D", label: "1D" },
  { value: "W", label: "1W" },
];

export type LiveChartTimeZone =
  | "America/New_York"
  | "Etc/UTC"
  | "Europe/London"
  | "Asia/Bangkok";

const DEFAULT_LIVE_CHART_TIME_ZONE: LiveChartTimeZone = "America/New_York";

export const LIVE_CHART_TIME_ZONES: Array<{
  value: LiveChartTimeZone;
  label: string;
}> = [
  { value: "America/New_York", label: "NY" },
  { value: "Etc/UTC", label: "UTC" },
  { value: "Europe/London", label: "LDN" },
  { value: "Asia/Bangkok", label: "BKK" },
];

const DEFAULT_VISIBLE_SECONDS_BY_INTERVAL: Record<TVInterval, number> = {
  "1": 6 * 60 * 60,
  "5": 24 * 60 * 60,
  "15": 3 * 24 * 60 * 60,
  "60": 7 * 24 * 60 * 60,
  "240": 30 * 24 * 60 * 60,
  D: 180 * 24 * 60 * 60,
  W: 730 * 24 * 60 * 60,
};

export interface LiveKillzoneDefinition {
  id: string;
  label: string;
  shortLabel: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  color: string;
}

export interface LiveKillzoneRange {
  from: number;
  to: number;
  source: "default" | "widget";
}

export interface LiveKillzoneSegment {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  start: number;
  end: number;
  leftPct: number;
  widthPct: number;
}

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export const LIVE_CHART_KILLZONES: readonly LiveKillzoneDefinition[] = [
  {
    id: "asian-range",
    label: "Asian Range",
    shortLabel: "Asia",
    startHour: 20,
    startMinute: 0,
    endHour: 0,
    endMinute: 0,
    color: "#eab308",
  },
  {
    id: "london-open",
    label: "London Open",
    shortLabel: "London",
    startHour: 2,
    startMinute: 0,
    endHour: 5,
    endMinute: 0,
    color: "#38bdf8",
  },
  {
    id: "new-york-am",
    label: "New York AM",
    shortLabel: "NY AM",
    startHour: 7,
    startMinute: 0,
    endHour: 10,
    endMinute: 0,
    color: "#f97316",
  },
  {
    id: "london-close",
    label: "London Close",
    shortLabel: "Close",
    startHour: 10,
    startMinute: 0,
    endHour: 12,
    endMinute: 0,
    color: "#a78bfa",
  },
  {
    id: "new-york-pm",
    label: "New York PM",
    shortLabel: "NY PM",
    startHour: 13,
    startMinute: 30,
    endHour: 16,
    endMinute: 0,
    color: "#22c55e",
  },
];

const zonedDateFormatters = new Map<string, Intl.DateTimeFormat>();

function getZonedDateFormatter(timeZone: LiveChartTimeZone) {
  const existing = zonedDateFormatters.get(timeZone);
  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });

  zonedDateFormatters.set(timeZone, formatter);

  return formatter;
}

function getZonedDateParts(
  date: Date,
  timeZone: LiveChartTimeZone = DEFAULT_LIVE_CHART_TIME_ZONE,
): ZonedDateParts {
  const zonedDateFormatter = getZonedDateFormatter(timeZone);
  const parts = zonedDateFormatter.formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(byType.get("year")),
    month: Number(byType.get("month")),
    day: Number(byType.get("day")),
    hour: Number(byType.get("hour")) % 24,
    minute: Number(byType.get("minute")),
  };
}

function addCalendarDays(
  parts: Pick<ZonedDateParts, "year" | "month" | "day">,
  days: number,
): Pick<ZonedDateParts, "year" | "month" | "day"> {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function localTimeToMinuteOfDay(hour: number, minute: number) {
  return hour * 60 + minute;
}

function zonedTimeToUtcSeconds(
  parts: ZonedDateParts,
  timeZone: LiveChartTimeZone = DEFAULT_LIVE_CHART_TIME_ZONE,
): number {
  let utc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );

  for (let i = 0; i < 2; i += 1) {
    const actual = getZonedDateParts(new Date(utc), timeZone);
    const intendedLocalAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    const actualLocalAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );

    utc += intendedLocalAsUtc - actualLocalAsUtc;
  }

  return Math.floor(utc / 1000);
}

function getCandidateSessionDates(
  range: LiveKillzoneRange,
  timeZone: LiveChartTimeZone,
) {
  const dates = new Map<string, Pick<ZonedDateParts, "year" | "month" | "day">>();
  const stepSeconds = 6 * 60 * 60;
  const start = range.from - 2 * 24 * 60 * 60;
  const end = range.to + 2 * 24 * 60 * 60;

  for (let timestamp = start; timestamp <= end; timestamp += stepSeconds) {
    const parts = getZonedDateParts(new Date(timestamp * 1000), timeZone);
    dates.set(`${parts.year}-${parts.month}-${parts.day}`, {
      year: parts.year,
      month: parts.month,
      day: parts.day,
    });
  }

  return Array.from(dates.values());
}

function getKillzoneSessionBounds(
  killzone: LiveKillzoneDefinition,
  date: Pick<ZonedDateParts, "year" | "month" | "day">,
  timeZone: LiveChartTimeZone = DEFAULT_LIVE_CHART_TIME_ZONE,
) {
  const start = zonedTimeToUtcSeconds({
    ...date,
    hour: killzone.startHour,
    minute: killzone.startMinute,
  }, timeZone);
  const endDate =
    localTimeToMinuteOfDay(killzone.endHour, killzone.endMinute) <=
    localTimeToMinuteOfDay(killzone.startHour, killzone.startMinute)
      ? addCalendarDays(date, 1)
      : date;
  const end = zonedTimeToUtcSeconds({
    ...endDate,
    hour: killzone.endHour,
    minute: killzone.endMinute,
  }, timeZone);

  return { start, end };
}

export function getDefaultLiveKillzoneRange(
  interval: TVInterval,
  now = new Date(),
): LiveKillzoneRange {
  const visibleSeconds = DEFAULT_VISIBLE_SECONDS_BY_INTERVAL[interval];
  const to = Math.floor(now.getTime() / 1000) + 60 * 60;

  return {
    from: to - visibleSeconds,
    to,
    source: "default",
  };
}

export function buildLiveKillzoneSegments(
  range: LiveKillzoneRange,
  killzones = LIVE_CHART_KILLZONES,
  timeZone: LiveChartTimeZone = DEFAULT_LIVE_CHART_TIME_ZONE,
): LiveKillzoneSegment[] {
  if (!Number.isFinite(range.from) || !Number.isFinite(range.to) || range.to <= range.from) {
    return [];
  }

  const rangeSeconds = range.to - range.from;

  return getCandidateSessionDates(range, timeZone)
    .flatMap((date) =>
      killzones.map((killzone) => {
        const { start, end } = getKillzoneSessionBounds(killzone, date, timeZone);
        const clippedStart = Math.max(start, range.from);
        const clippedEnd = Math.min(end, range.to);

        if (clippedEnd <= clippedStart) {
          return null;
        }

        return {
          id: killzone.id,
          label: killzone.label,
          shortLabel: killzone.shortLabel,
          color: killzone.color,
          start,
          end,
          leftPct: ((clippedStart - range.from) / rangeSeconds) * 100,
          widthPct: ((clippedEnd - clippedStart) / rangeSeconds) * 100,
        } satisfies LiveKillzoneSegment;
      }),
    )
    .filter((segment): segment is LiveKillzoneSegment => segment !== null)
    .sort((a, b) => a.start - b.start);
}

export function getActiveLiveKillzone(
  now = new Date(),
  killzones = LIVE_CHART_KILLZONES,
  timeZone: LiveChartTimeZone = DEFAULT_LIVE_CHART_TIME_ZONE,
) {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const today = getZonedDateParts(now, timeZone);
  const yesterday = addCalendarDays(today, -1);

  for (const date of [yesterday, today]) {
    for (const killzone of killzones) {
      const { start, end } = getKillzoneSessionBounds(killzone, date, timeZone);
      if (nowSeconds >= start && nowSeconds < end) {
        return killzone;
      }
    }
  }

  return null;
}

interface LiveTradingViewWidgetProps {
  className?: string;
}

export type LiveOrderSide = "long" | "short";

interface LiveOrderFormState {
  asset: string;
  entryPrice: string;
  stopLoss: string;
  targetTier1: string;
  tradingZoneId: string;
  checkedChecklistIds: string[];
  confidenceLevel: string;
  notes: string;
}

export interface LiveTradingZone {
  id: number;
  name: string;
  description: string | null;
  fromTime: string;
  toTime: string;
}

export interface LivePendingOrder {
  id: string;
  asset: string;
  side: LiveOrderSide;
  entryPrice: number;
  stopLoss: number;
  targetTier1: number;
  notes: string;
  confidenceLevel: number;
  tradeHistoryChecklists: number[];
  tradingZoneId: number;
  tradingZoneName: string | null;
  checklistModelId: number | null;
  createdAt: string;
}

export interface LiveActiveOrder extends LivePendingOrder {
  tradeHistoryId: number;
  triggerPrice: number;
  triggeredAt: string;
}

interface LiveOrderTicketRequest {
  id: number;
  side: LiveOrderSide;
  entryPrice: number | null;
}

interface LiveOrderTicketPosition {
  x: number;
  y: number;
}

interface LiveOrderTicketDragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  maxX: number;
  maxY: number;
}

export interface LiveOrderContextMenuItem {
  position: "top" | "bottom";
  text: string;
  click: () => void;
}

type LiveOrderContextMenuCallback = (
  unixTime: number,
  price?: number,
) => LiveOrderContextMenuItem[];

interface LiveOrderContextMenuWidget {
  onContextMenu?(callback: LiveOrderContextMenuCallback): void;
}

function normalizeLiveOrderContextPrice(value: unknown): number | null {
  const price =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(/,/g, ""))
        : Number.NaN;

  return Number.isFinite(price) && price > 0 ? price : null;
}

function formatLiveOrderInputPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return "";
  }

  return Number(value.toFixed(5)).toString();
}

function clampLiveOrderTicketPosition(
  position: LiveOrderTicketPosition,
  maxX: number,
  maxY: number,
): LiveOrderTicketPosition {
  return {
    x: Math.min(Math.max(position.x, 0), maxX),
    y: Math.min(Math.max(position.y, 0), maxY),
  };
}

export function bindLiveOrderContextMenu(
  widget: LiveOrderContextMenuWidget,
  onPlaceOrder: (side: LiveOrderSide, entryPrice: number | null) => void,
) {
  if (!widget.onContextMenu) {
    return () => {};
  }

  let active = true;

  try {
    widget.onContextMenu((_unixTime, price) => {
      if (!active) {
        return [];
      }

      const entryPrice = normalizeLiveOrderContextPrice(price);
      const priceText = entryPrice ? ` @ ${formatTradePrice(entryPrice)}` : "";

      return [
        {
          position: "top",
          text: `Place long order${priceText}`,
          click: () => onPlaceOrder("long", entryPrice),
        },
        {
          position: "top",
          text: `Place short order${priceText}`,
          click: () => onPlaceOrder("short", entryPrice),
        },
      ];
    });
  } catch {
    return () => {};
  }

  return () => {
    active = false;
  };
}

function getInitialLiveOrderForm(
  symbol: string,
  entryPrice: number | null = null,
): LiveOrderFormState {
  return {
    asset: symbol.toUpperCase(),
    entryPrice: formatLiveOrderInputPrice(entryPrice),
    stopLoss: "",
    targetTier1: "",
    tradingZoneId: "",
    checkedChecklistIds: [],
    confidenceLevel: "3",
    notes: "",
  };
}

function parseLiveOrderPrice(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function calculateLiveOrderRiskReward(
  side: LiveOrderSide,
  entryPrice: number | null,
  stopLoss: number | null,
  targetTier1: number | null,
) {
  if (!entryPrice || !stopLoss || !targetTier1) {
    return null;
  }

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(targetTier1 - entryPrice);

  if (risk <= 0 || reward <= 0) {
    return null;
  }

  const targetIsValid =
    side === "long" ? targetTier1 > entryPrice : targetTier1 < entryPrice;
  const stopIsValid =
    side === "long" ? stopLoss < entryPrice : stopLoss > entryPrice;

  if (!targetIsValid || !stopIsValid) {
    return null;
  }

  return reward / risk;
}

function buildLiveOrderValidationError(
  form: LiveOrderFormState,
  side: LiveOrderSide,
) {
  const asset = form.asset.trim().toUpperCase();
  const entryPrice = parseLiveOrderPrice(form.entryPrice);
  const stopLoss = parseLiveOrderPrice(form.stopLoss);
  const targetTier1 = parseLiveOrderPrice(form.targetTier1);

  if (!asset) {
    return "Enter the asset before placing the order.";
  }

  if (!entryPrice) {
    return "Enter a valid entry price.";
  }

  if (!stopLoss) {
    return "Enter a valid stop loss.";
  }

  if (side === "long" && stopLoss >= entryPrice) {
    return "Long stop loss must be below entry.";
  }

  if (side === "short" && stopLoss <= entryPrice) {
    return "Short stop loss must be above entry.";
  }

  if (!targetTier1) {
    return "Enter a valid target price.";
  }

  if (side === "long" && targetTier1 <= entryPrice) {
    return "Long target must be above entry.";
  }

  if (side === "short" && targetTier1 >= entryPrice) {
    return "Short target must be below entry.";
  }

  if (!Number.parseInt(form.tradingZoneId, 10)) {
    return "Select a trading zone.";
  }

  if (form.checkedChecklistIds.length === 0) {
    return "Check at least one pre-trade item.";
  }

  return null;
}

// ── TV widget type ──

interface TVWidget {
  remove(): void;
  onChartReady(cb: () => void): void;
  onContextMenu?(callback: LiveOrderContextMenuCallback): void;
  activeChart(): TVChartApi;
  chart?(): TVChartApi;
}

interface TVVisibleRange {
  from: number;
  to: number;
}

interface TVVisibleRangeSubscription {
  subscribe(owner: unknown, callback: (range?: TVVisibleRange) => void): void;
  unsubscribe(owner: unknown, callback: (range?: TVVisibleRange) => void): void;
}

interface TVChartApi {
  setSymbol?(symbol: string, cb: () => void): void;
  getVisibleRange?(): TVVisibleRange | null;
  onVisibleRangeChanged?(): TVVisibleRangeSubscription;
}

// Module-level counter so each widget div gets a unique, stable id.
let widgetIdCounter = 0;
let liveOrderIdCounter = 0;

const LIVE_ORDER_STORAGE_KEY = "trading-journal-live-orders-v1";

interface LiveOrdersStorageState {
  pendingOrders: LivePendingOrder[];
  activeOrders: LiveActiveOrder[];
}

const emptyLiveOrdersStorageState = (): LiveOrdersStorageState => ({
  pendingOrders: [],
  activeOrders: [],
});

function createLiveOrderId() {
  liveOrderIdCounter += 1;
  return `live-order-${Date.now()}-${liveOrderIdCounter}`;
}

function isLivePendingOrder(value: unknown): value is LivePendingOrder {
  const order = value as Partial<LivePendingOrder>;

  return (
    typeof order?.id === "string" &&
    typeof order.asset === "string" &&
    (order.side === "long" || order.side === "short") &&
    typeof order.entryPrice === "number" &&
    Number.isFinite(order.entryPrice) &&
    typeof order.stopLoss === "number" &&
    Number.isFinite(order.stopLoss) &&
    typeof order.targetTier1 === "number" &&
    Number.isFinite(order.targetTier1) &&
    Array.isArray(order.tradeHistoryChecklists) &&
    typeof order.tradingZoneId === "number" &&
    Number.isFinite(order.tradingZoneId) &&
    typeof order.createdAt === "string"
  );
}

function isLiveActiveOrder(value: unknown): value is LiveActiveOrder {
  const order = value as Partial<LiveActiveOrder>;

  return (
    isLivePendingOrder(value) &&
    typeof order.tradeHistoryId === "number" &&
    Number.isFinite(order.tradeHistoryId) &&
    typeof order.triggerPrice === "number" &&
    Number.isFinite(order.triggerPrice) &&
    typeof order.triggeredAt === "string"
  );
}

function loadLiveOrdersFromStorage(): LiveOrdersStorageState {
  if (typeof window === "undefined") {
    return emptyLiveOrdersStorageState();
  }

  try {
    const raw = window.localStorage.getItem(LIVE_ORDER_STORAGE_KEY);
    if (!raw) {
      return emptyLiveOrdersStorageState();
    }

    const parsed = JSON.parse(raw) as Partial<LiveOrdersStorageState>;

    return {
      pendingOrders: Array.isArray(parsed.pendingOrders)
        ? parsed.pendingOrders.filter(isLivePendingOrder)
        : [],
      activeOrders: Array.isArray(parsed.activeOrders)
        ? parsed.activeOrders.filter(isLiveActiveOrder)
        : [],
    };
  } catch {
    return emptyLiveOrdersStorageState();
  }
}

function saveLiveOrdersToStorage({
  pendingOrders,
  activeOrders,
}: LiveOrdersStorageState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    LIVE_ORDER_STORAGE_KEY,
    JSON.stringify({ pendingOrders, activeOrders }),
  );
}

export function doesLivePriceTriggerPendingOrder(
  order: Pick<LivePendingOrder, "side" | "entryPrice">,
  currentPrice: number | null,
  previousPrice: number | null = null,
) {
  if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
    return false;
  }

  if (!Number.isFinite(order.entryPrice) || order.entryPrice <= 0) {
    return false;
  }

  if (previousPrice && Number.isFinite(previousPrice) && previousPrice > 0) {
    const low = Math.min(previousPrice, currentPrice);
    const high = Math.max(previousPrice, currentPrice);

    if (order.entryPrice >= low && order.entryPrice <= high) {
      return true;
    }
  }

  return order.side === "long"
    ? currentPrice <= order.entryPrice
    : currentPrice >= order.entryPrice;
}

export function buildLiveTradeHistoryPayload(
  order: LivePendingOrder,
  triggeredAt = new Date(),
  triggerPrice = order.entryPrice,
): CreateTradeRequest {
  const notes = order.notes.trim()
    || `Live pending order triggered at ${formatTradePrice(triggerPrice)}.`;

  return {
    asset: order.asset,
    position: order.side === "long" ? PositionType.Long : PositionType.Short,
    entryPrice: order.entryPrice,
    targetTier1: order.targetTier1,
    targetTier2: null,
    targetTier3: null,
    stopLoss: order.stopLoss,
    notes,
    date: triggeredAt.toISOString(),
    status: TradeStatus.Open,
    exitPrice: null,
    pnl: null,
    closedDate: null,
    screenshots: null,
    tradeTechnicalAnalysisTags: null,
    emotionTags: null,
    confidenceLevel: order.confidenceLevel,
    psychologyNotes: null,
    tradeHistoryChecklists: order.tradeHistoryChecklists,
    tradingZoneId: order.tradingZoneId,
    tradingSessionId: null,
    riskGuardrail: null,
  };
}

function normalizeVisibleRange(range: TVVisibleRange | null | undefined): LiveKillzoneRange | null {
  if (!range || !Number.isFinite(range.from) || !Number.isFinite(range.to)) {
    return null;
  }

  const from = range.from > 10_000_000_000 ? range.from / 1000 : range.from;
  const to = range.to > 10_000_000_000 ? range.to / 1000 : range.to;

  if (to <= from) {
    return null;
  }

  return { from, to, source: "widget" };
}

function getWidgetChartApi(widget: TVWidget): TVChartApi | null {
  try {
    const activeChart = widget.activeChart?.();
    if (activeChart) return activeChart;
  } catch {
    // Some hosted-widget builds expose chart methods only after chart ready.
  }

  try {
    const chart = widget.chart?.();
    if (chart) return chart;
  } catch {
    // ignore
  }

  return null;
}

function subscribeToWidgetVisibleRange(
  widget: TVWidget,
  onRangeChange: (range: LiveKillzoneRange) => void,
) {
  const chart = getWidgetChartApi(widget);
  const initialRange = normalizeVisibleRange(chart?.getVisibleRange?.());

  if (initialRange) {
    onRangeChange(initialRange);
  }

  const source = chart?.onVisibleRangeChanged?.();

  if (!source) {
    return () => {};
  }

  const handler = (range?: TVVisibleRange) => {
    const nextRange = normalizeVisibleRange(range ?? chart?.getVisibleRange?.());
    if (nextRange) {
      onRangeChange(nextRange);
    }
  };

  try {
    source.subscribe(null, handler);
  } catch {
    return () => {};
  }

  return () => {
    try {
      source.unsubscribe(null, handler);
    } catch {
      // ignore
    }
  };
}

function LiveKillzoneOverlay({
  segments,
  now,
  source,
  timeZone,
}: {
  segments: LiveKillzoneSegment[];
  now: Date;
  source: LiveKillzoneRange["source"];
  timeZone: LiveChartTimeZone;
}) {
  const nowSeconds = Math.floor(now.getTime() / 1000);

  return (
    <div
      aria-label="ICT kill zone overlay"
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      data-sync-source={source}
      data-time-zone={timeZone}
    >
      {segments.map((segment) => {
        const isActive = nowSeconds >= segment.start && nowSeconds < segment.end;

        return (
          <div
            key={`${segment.id}-${segment.start}`}
            className={cn(
              "absolute bottom-0 top-0 border-x transition-[left,width,opacity] duration-200",
              isActive ? "opacity-80" : "opacity-45",
            )}
            style={{
              left: `${segment.leftPct}%`,
              width: `${segment.widthPct}%`,
              minWidth: "2px",
              borderColor: segment.color,
              backgroundColor: `${segment.color}24`,
            }}
          >
            <div
              className="absolute left-1 top-12 max-w-[88px] truncate rounded-sm border bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur"
              style={{
                borderColor: `${segment.color}88`,
                color: segment.color,
              }}
            >
              {segment.shortLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getLiveOrderLevelTopPct(
  price: number,
  allPrices: number[],
) {
  const validPrices = allPrices.filter((value) => Number.isFinite(value) && value > 0);

  if (validPrices.length < 2) {
    return 50;
  }

  const minPrice = Math.min(...validPrices);
  const maxPrice = Math.max(...validPrices);
  const range = maxPrice - minPrice;

  if (range <= 0) {
    return 50;
  }

  const rawPct = ((maxPrice - price) / range) * 100;

  return Math.min(Math.max(rawPct, 8), 92);
}

function LiveOrderPriceOverlay({
  pendingOrders,
  activeOrders,
  lastPrice,
  triggeringOrderIds,
  onCancelPendingOrder,
}: {
  pendingOrders: LivePendingOrder[];
  activeOrders: LiveActiveOrder[];
  lastPrice: number | null;
  triggeringOrderIds: Set<string>;
  onCancelPendingOrder: (orderId: string) => void;
}) {
  const orders = [...pendingOrders, ...activeOrders];

  if (orders.length === 0) {
    return null;
  }

  const priceRange = orders.flatMap((order) => [
    order.entryPrice,
    order.stopLoss,
    order.targetTier1,
  ]);
  if (lastPrice) {
    priceRange.push(lastPrice);
  }

  return (
    <div
      aria-label="Live order overlay"
      className="pointer-events-none absolute inset-0 z-[7] overflow-hidden"
    >
      {pendingOrders.map((order) => {
        const topPct = getLiveOrderLevelTopPct(order.entryPrice, priceRange);
        const isTriggering = triggeringOrderIds.has(order.id);
        const tone =
          order.side === "long"
            ? "border-blue-500 text-blue-600 dark:text-blue-300"
            : "border-amber-500 text-amber-600 dark:text-amber-300";

        return (
          <div
            key={order.id}
            aria-label={`Pending order ${order.asset} ${order.side} at ${formatTradePrice(order.entryPrice)}`}
            className={cn("absolute left-0 right-0 border-t border-dashed", tone)}
            style={{ top: `${topPct}%` }}
          >
            <div className="pointer-events-auto absolute left-3 top-0 flex -translate-y-1/2 items-center overflow-hidden rounded-sm border bg-background/95 text-[11px] font-semibold shadow-sm backdrop-blur">
              <span
                className={cn(
                  "px-2 py-1 text-white",
                  order.side === "long" ? "bg-blue-600" : "bg-amber-500",
                )}
              >
                Pending
              </span>
              <span className="px-2 py-1 tabular-nums">
                {order.asset} {order.side} @ {formatTradePrice(order.entryPrice)}
              </span>
              <button
                type="button"
                className="border-l border-border/70 px-2 py-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                disabled={isTriggering}
                onClick={() => onCancelPendingOrder(order.id)}
                aria-label={`Cancel pending ${order.asset} ${order.side} order at ${formatTradePrice(order.entryPrice)}`}
                title="Cancel pending order"
              >
                {isTriggering ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        );
      })}

      {activeOrders.map((order) => {
        const topPct = getLiveOrderLevelTopPct(order.entryPrice, priceRange);
        const tone =
          order.side === "long"
            ? "border-blue-500 text-blue-600 dark:text-blue-300"
            : "border-emerald-500 text-emerald-600 dark:text-emerald-300";

        return (
          <div
            key={order.id}
            aria-label={`Active order ${order.asset} ${order.side} at ${formatTradePrice(order.entryPrice)}`}
            className={cn("absolute left-0 right-0 border-t", tone)}
            style={{ top: `${topPct}%` }}
          >
            <div className="absolute left-3 top-0 flex -translate-y-1/2 items-center overflow-hidden rounded-sm border bg-background/95 text-[11px] font-semibold shadow-sm backdrop-blur">
              <span
                className={cn(
                  "px-2 py-1 text-white",
                  order.side === "long" ? "bg-blue-600" : "bg-emerald-600",
                )}
              >
                Active
              </span>
              <span className="px-2 py-1 tabular-nums">
                {order.asset} {order.side} @ {formatTradePrice(order.entryPrice)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Component ──

function LiveOrderTicket({
  symbol,
  request,
  onClose,
  onPlacePendingOrder,
}: {
  symbol: string;
  request: LiveOrderTicketRequest;
  onClose: () => void;
  onPlacePendingOrder: (order: LivePendingOrder) => void;
}) {
  const { toast } = useToast();
  const [side, setSide] = useState<LiveOrderSide>(request.side);
  const [form, setForm] = useState<LiveOrderFormState>(() =>
    getInitialLiveOrderForm(symbol, request.entryPrice),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReferenceLoading, setIsReferenceLoading] = useState(false);
  const [tradingZones, setTradingZones] = useState<LiveTradingZone[]>([]);
  const [checklistModels, setChecklistModels] = useState<ChecklistModelApi[]>([]);
  const [selectedChecklistModelId, setSelectedChecklistModelId] = useState("");
  const [selectedModelDetail, setSelectedModelDetail] =
    useState<ChecklistModelDetailApi | null>(null);
  const [ticketPosition, setTicketPosition] = useState<LiveOrderTicketPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const ticketRef = useRef<HTMLFormElement>(null);
  const dragStateRef = useRef<LiveOrderTicketDragState | null>(null);
  const checklistDetailRequestRef = useRef(0);

  function getTicketDragBounds() {
    const ticket = ticketRef.current;
    const chartContainer = ticket?.parentElement;

    if (!ticket || !chartContainer) {
      return null;
    }

    const ticketRect = ticket.getBoundingClientRect();
    const containerRect = chartContainer.getBoundingClientRect();
    const currentX = ticketPosition?.x ?? ticketRect.left - containerRect.left;
    const currentY = ticketPosition?.y ?? ticketRect.top - containerRect.top;

    return {
      currentX,
      currentY,
      maxX: Math.max(0, containerRect.width - ticketRect.width),
      maxY: Math.max(0, containerRect.height - ticketRect.height),
    };
  }

  function handleDragPointerMove(event: PointerEvent) {
    const dragState = dragStateRef.current;

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    event.preventDefault();
    setTicketPosition(
      clampLiveOrderTicketPosition(
        {
          x: dragState.startX + event.clientX - dragState.startClientX,
          y: dragState.startY + event.clientY - dragState.startClientY,
        },
        dragState.maxX,
        dragState.maxY,
      ),
    );
  }

  function handleDragPointerEnd(event: PointerEvent) {
    const dragState = dragStateRef.current;

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);
    window.removeEventListener("pointermove", handleDragPointerMove);
    window.removeEventListener("pointerup", handleDragPointerEnd);
    window.removeEventListener("pointercancel", handleDragPointerEnd);
  }

  function handleDragPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 && event.pointerType !== "touch" && event.pointerType !== "pen") {
      return;
    }

    const bounds = getTicketDragBounds();
    if (!bounds) {
      return;
    }

    event.preventDefault();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: bounds.currentX,
      startY: bounds.currentY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
    };
    setTicketPosition(
      clampLiveOrderTicketPosition(
        { x: bounds.currentX, y: bounds.currentY },
        bounds.maxX,
        bounds.maxY,
      ),
    );
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", handleDragPointerMove);
    window.addEventListener("pointerup", handleDragPointerEnd);
    window.addEventListener("pointercancel", handleDragPointerEnd);
  }

  function handleDragHandleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 48 : 16;
    const deltas: Record<string, LiveOrderTicketPosition> = {
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
    };
    const delta = deltas[event.key];

    if (!delta) {
      return;
    }

    const bounds = getTicketDragBounds();
    if (!bounds) {
      return;
    }

    event.preventDefault();
    setTicketPosition(
      clampLiveOrderTicketPosition(
        {
          x: bounds.currentX + delta.x,
          y: bounds.currentY + delta.y,
        },
        bounds.maxX,
        bounds.maxY,
      ),
    );
  }

  useEffect(() => {
    return () => {
      dragStateRef.current = null;
      window.removeEventListener("pointermove", handleDragPointerMove);
      window.removeEventListener("pointerup", handleDragPointerEnd);
      window.removeEventListener("pointercancel", handleDragPointerEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      asset: symbol.toUpperCase(),
    }));
  }, [symbol]);

  useEffect(() => {
    setSide(request.side);
    setForm((current) => ({
      ...current,
      asset: symbol.toUpperCase(),
      entryPrice: formatLiveOrderInputPrice(request.entryPrice),
    }));
  }, [request.id, request.entryPrice, request.side, symbol]);

  useEffect(() => {
    let isActive = true;

    const loadReferenceData = async () => {
      setIsReferenceLoading(true);

      const [zonesResult, modelsResult] = await Promise.allSettled([
        api.get<ApiResponse<LiveTradingZone[]>>("/v1/trading-zones"),
        api.get<ApiResponse<ChecklistModelApi[]>>("/v1/checklist-models"),
      ]);

      if (!isActive) {
        return;
      }

      const failedResources: string[] = [];

      if (zonesResult.status === "fulfilled" && zonesResult.value.data.isSuccess) {
        setTradingZones(zonesResult.value.data.value);
      } else {
        failedResources.push("trading zones");
      }

      if (modelsResult.status === "fulfilled" && modelsResult.value.data.isSuccess) {
        const models = modelsResult.value.data.value;
        setChecklistModels(models);

        if (models.length > 0) {
          setSelectedChecklistModelId((currentValue) =>
            currentValue || String(models[0].id),
          );
        }
      } else {
        failedResources.push("checklist models");
      }

      setIsReferenceLoading(false);

      if (failedResources.length > 0) {
        toast({
          variant: "destructive",
          title: "Live order setup data unavailable",
          description: `Unavailable: ${failedResources.join(", ")}.`,
        });
      }
    };

    void loadReferenceData();

    return () => {
      isActive = false;
    };
  }, [toast]);

  useEffect(() => {
    checklistDetailRequestRef.current += 1;
    const requestId = checklistDetailRequestRef.current;
    let isActive = true;

    setSelectedModelDetail(null);
    if (!selectedChecklistModelId) {
      return () => {
        isActive = false;
      };
    }

    const loadChecklistDetail = async () => {
      try {
        const response = await api.get<ApiResponse<ChecklistModelDetailApi>>(
          `/v1/checklist-models/${selectedChecklistModelId}`,
        );

        if (!isActive || requestId !== checklistDetailRequestRef.current) {
          return;
        }

        if (response.data.isSuccess) {
          setSelectedModelDetail(response.data.value);
          return;
        }

        toast({
          variant: "destructive",
          title: "Checklist model unavailable",
          description: "Choose another model or refresh the page.",
        });
      } catch {
        if (!isActive || requestId !== checklistDetailRequestRef.current) {
          return;
        }

        toast({
          variant: "destructive",
          title: "Checklist model unavailable",
          description: "Choose another model or refresh the page.",
        });
      }
    };

    void loadChecklistDetail();

    return () => {
      isActive = false;
    };
  }, [selectedChecklistModelId, toast]);

  const entryPrice = parseLiveOrderPrice(form.entryPrice);
  const stopLoss = parseLiveOrderPrice(form.stopLoss);
  const targetTier1 = parseLiveOrderPrice(form.targetTier1);
  const riskReward = calculateLiveOrderRiskReward(
    side,
    entryPrice,
    stopLoss,
    targetTier1,
  );
  const directionLabel = side === "long" ? "Long" : "Short";
  const submitLabel = `Place ${side} order`;

  const handleFieldChange = (
    field: Exclude<keyof LiveOrderFormState, "checkedChecklistIds">,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: field === "asset" ? value.toUpperCase() : value,
    }));
  };

  const handleChecklistToggle = (checklistId: string) => {
    setForm((current) => ({
      ...current,
      checkedChecklistIds: current.checkedChecklistIds.includes(checklistId)
        ? current.checkedChecklistIds.filter((id) => id !== checklistId)
        : [...current.checkedChecklistIds, checklistId],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = buildLiveOrderValidationError(form, side);
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Order not placed",
        description: validationError,
      });
      return;
    }

    const asset = form.asset.trim().toUpperCase();
    const parsedEntry = parseLiveOrderPrice(form.entryPrice) ?? 0;
    const parsedStopLoss = parseLiveOrderPrice(form.stopLoss) ?? 0;
    const parsedTargetTier1 = parseLiveOrderPrice(form.targetTier1) ?? 0;
    const tradingZoneId = Number.parseInt(form.tradingZoneId, 10);
    const checklistIds = form.checkedChecklistIds
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isFinite(id));
    const confidenceLevel = Number.parseInt(form.confidenceLevel, 10) || 0;
    const checklistModelId = Number.parseInt(selectedChecklistModelId, 10);
    const selectedTradingZone = tradingZones.find((zone) => zone.id === tradingZoneId);

    setIsSubmitting(true);

    try {
      onPlacePendingOrder({
        id: createLiveOrderId(),
        asset,
        side,
        entryPrice: parsedEntry,
        stopLoss: parsedStopLoss,
        targetTier1: parsedTargetTier1,
        notes: form.notes.trim(),
        confidenceLevel,
        tradeHistoryChecklists: checklistIds,
        tradingZoneId,
        tradingZoneName: selectedTradingZone?.name ?? null,
        checklistModelId: Number.isFinite(checklistModelId) ? checklistModelId : null,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "Pending order saved",
        description: `${asset} ${side} order is waiting for ${formatTradePrice(parsedEntry)}.`,
      });
      setForm(getInitialLiveOrderForm(asset));
      onClose();
    } catch {
      toast({
        variant: "destructive",
        title: "Order not placed",
        description: "Could not stage the pending order. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      ref={ticketRef}
      aria-label="Live order ticket"
      className={cn(
        "absolute right-3 top-3 z-20 flex max-h-[calc(100%-1.5rem)] w-[min(380px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-lg border border-border/70 bg-card/95 text-sm shadow-xl backdrop-blur-md",
        isDragging && "select-none shadow-2xl",
      )}
      style={
        ticketPosition
          ? {
              left: `${ticketPosition.x}px`,
              top: `${ticketPosition.y}px`,
              right: "auto",
            }
          : undefined
      }
      onSubmit={handleSubmit}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-3 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0 rounded-md cursor-grab touch-none",
            isDragging && "cursor-grabbing bg-primary/10 text-primary",
          )}
          onPointerDown={handleDragPointerDown}
          onKeyDown={handleDragHandleKeyDown}
          aria-label="Drag live order ticket"
          title="Drag live order ticket"
        >
          <Move className="h-3.5 w-3.5" />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {form.asset || symbol}
            </span>
            <span
              className={cn(
                "rounded-sm border px-2 py-0.5 text-xs font-semibold",
                side === "long"
                  ? "border-blue-500/35 bg-blue-500/10 text-blue-600 dark:text-blue-300"
                  : "border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-300",
              )}
            >
              {directionLabel}
            </span>
          </div>
          <h2 className="mt-2 text-base font-semibold leading-none">
            Live order ticket
          </h2>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={onClose}
          aria-label="Close live order ticket"
          title="Close live order ticket"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="space-y-3 overflow-y-auto px-3 py-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={side === "long" ? "default" : "outline"}
            className={cn(
              "h-11 justify-start gap-2 rounded-md",
              side === "long" && "bg-blue-600 text-white hover:bg-blue-700",
            )}
            aria-pressed={side === "long"}
            onClick={() => setSide("long")}
          >
            <ArrowUpRight className="h-4 w-4" />
            Long
          </Button>
          <Button
            type="button"
            variant={side === "short" ? "default" : "outline"}
            className={cn(
              "h-11 justify-start gap-2 rounded-md",
              side === "short" && "bg-rose-600 text-white hover:bg-rose-700",
            )}
            aria-pressed={side === "short"}
            onClick={() => setSide("short")}
          >
            <ArrowDownRight className="h-4 w-4" />
            Short
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="live-order-asset" className="text-xs text-muted-foreground">
              Asset
            </Label>
            <Input
              id="live-order-asset"
              value={form.asset}
              onChange={(event) => handleFieldChange("asset", event.target.value)}
              className="h-9 rounded-md bg-background/80 text-sm font-semibold uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="live-order-entry-price" className="text-xs text-muted-foreground">
              Entry price
            </Label>
            <Input
              id="live-order-entry-price"
              type="number"
              inputMode="decimal"
              step={TRADE_PRICE_INPUT_STEP}
              value={form.entryPrice}
              onChange={(event) => handleFieldChange("entryPrice", event.target.value)}
              className="h-9 rounded-md bg-background/80 text-sm tabular-nums"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="live-order-stop-loss" className="text-xs text-muted-foreground">
              Stop loss
            </Label>
            <Input
              id="live-order-stop-loss"
              type="number"
              inputMode="decimal"
              step={TRADE_PRICE_INPUT_STEP}
              value={form.stopLoss}
              onChange={(event) => handleFieldChange("stopLoss", event.target.value)}
              className="h-9 rounded-md bg-background/80 text-sm tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="live-order-target-tier-1" className="text-xs text-muted-foreground">
              Target T1
            </Label>
            <Input
              id="live-order-target-tier-1"
              type="number"
              inputMode="decimal"
              step={TRADE_PRICE_INPUT_STEP}
              value={form.targetTier1}
              onChange={(event) => handleFieldChange("targetTier1", event.target.value)}
              className="h-9 rounded-md bg-background/80 text-sm tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
            <div className="text-[11px] text-muted-foreground">Entry</div>
            <div className="mt-1 truncate text-xs font-semibold tabular-nums">
              {formatTradePrice(entryPrice)}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
            <div className="text-[11px] text-muted-foreground">Risk</div>
            <div className="mt-1 truncate text-xs font-semibold tabular-nums">
              {entryPrice && stopLoss ? formatTradePrice(Math.abs(entryPrice - stopLoss)) : "-"}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2">
            <div className="text-[11px] text-muted-foreground">R:R</div>
            <div className="mt-1 truncate text-xs font-semibold tabular-nums">
              {riskReward ? `1:${riskReward.toFixed(2)}` : "-"}
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 bg-background/55 px-2.5 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              Trading zone
            </span>
            {isReferenceLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          {tradingZones.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {tradingZones.map((zone) => {
                const isSelected = form.tradingZoneId === String(zone.id);

                return (
                  <button
                    key={zone.id}
                    type="button"
                    className={cn(
                      "rounded-sm border px-2 py-1.5 text-left text-[11px] transition-colors",
                      isSelected
                        ? "border-amber-500/60 bg-amber-500/15 text-amber-600 dark:text-amber-300"
                        : "border-border/70 bg-card/70 text-muted-foreground hover:border-amber-500/40 hover:text-foreground",
                    )}
                    onClick={() => handleFieldChange("tradingZoneId", String(zone.id))}
                  >
                    <span className="block truncate font-semibold">{zone.name}</span>
                    <span className="mt-0.5 block truncate tabular-nums opacity-80">
                      {zone.fromTime} - {zone.toTime}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No trading zones loaded.
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-md border border-border/60 bg-background/55 px-2.5 py-2.5">
          <div className="grid gap-2 sm:grid-cols-[1fr_112px]">
            <div className="space-y-1.5">
              <Label htmlFor="live-order-checklist-model" className="text-xs text-muted-foreground">
                Checklist
              </Label>
              <Select
                value={selectedChecklistModelId}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setSelectedChecklistModelId(value);
                  setForm((current) => ({
                    ...current,
                    checkedChecklistIds: [],
                  }));
                }}
              >
                <SelectTrigger
                  id="live-order-checklist-model"
                  className="h-8 rounded-md bg-background/80 text-xs"
                >
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent align="start">
                  {checklistModels.map((model) => (
                    <SelectItem key={model.id} value={String(model.id)}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="live-order-confidence" className="text-xs text-muted-foreground">
                Confidence
              </Label>
              <Select
                value={form.confidenceLevel}
                onValueChange={(value) => handleFieldChange("confidenceLevel", value)}
              >
                <SelectTrigger
                  id="live-order-confidence"
                  className="h-8 rounded-md bg-background/80 text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="1">Very low</SelectItem>
                  <SelectItem value="2">Low</SelectItem>
                  <SelectItem value="3">Neutral</SelectItem>
                  <SelectItem value="4">High</SelectItem>
                  <SelectItem value="5">Very high</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedModelDetail?.criteria.length ? (
            <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
              {selectedModelDetail.criteria.map((item: PreTradeChecklistApi) => {
                const checklistId = String(item.id);
                const isChecked = form.checkedChecklistIds.includes(checklistId);

                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-sm border px-2 py-1.5 text-xs transition-colors",
                      isChecked
                        ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "border-border/70 bg-card/70 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Checkbox
                      aria-label={item.name}
                      checked={isChecked}
                      onCheckedChange={() => handleChecklistToggle(checklistId)}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Select a checklist model to load criteria.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border/70 bg-card px-3 py-3">
        <Button
          type="submit"
          className={cn(
            "h-11 w-full rounded-md text-white",
            side === "long"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-rose-600 hover:bg-rose-700",
          )}
          aria-label={submitLabel}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function LiveTradingViewWidget({ className }: LiveTradingViewWidgetProps) {
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<TVWidget | null>(null);
  const scriptLoadedRef = useRef(false);
  const mountedRef = useRef(true);
  const creationSeqRef = useRef(0);
  const visibleRangeCleanupRef = useRef<(() => void) | null>(null);
  const contextMenuCleanupRef = useRef<(() => void) | null>(null);

  const [symbol, setSymbol] = useState("NAS100");
  const [interval, setInterval] = useState<TVInterval>("60");
  const [searchInput, setSearchInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [showKillzones, setShowKillzones] = useState(true);
  const [showOrderTicket, setShowOrderTicket] = useState(false);
  const [orderTicketRequest, setOrderTicketRequest] = useState<LiveOrderTicketRequest>({
    id: 0,
    side: "long",
    entryPrice: null,
  });
  const [clockNow, setClockNow] = useState(() => new Date());
  const [livePriceInput, setLivePriceInput] = useState("");
  const [lastLivePrice, setLastLivePrice] = useState<number | null>(null);
  const [pendingOrders, setPendingOrders] = useState<LivePendingOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<LiveActiveOrder[]>([]);
  const [triggeringOrderIds, setTriggeringOrderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [ordersHydrated, setOrdersHydrated] = useState(false);
  const [chartTimeZone, setChartTimeZone] = useState<LiveChartTimeZone>(
    DEFAULT_LIVE_CHART_TIME_ZONE,
  );
  const [killzoneRange, setKillzoneRange] = useState<LiveKillzoneRange>(() =>
    getDefaultLiveKillzoneRange("60"),
  );

  // Keep latest symbol/interval/theme in refs so doCreate always reads fresh
  // values without needing to be recreated as a useCallback.
  const symbolRef = useRef(symbol);
  const intervalRef = useRef(interval);
  const themeRef = useRef(resolvedTheme);
  const chartTimeZoneRef = useRef(chartTimeZone);
  symbolRef.current = symbol;
  intervalRef.current = interval;
  themeRef.current = resolvedTheme;
  chartTimeZoneRef.current = chartTimeZone;

  useEffect(() => {
    const storedOrders = loadLiveOrdersFromStorage();
    setPendingOrders(storedOrders.pendingOrders);
    setActiveOrders(storedOrders.activeOrders);
    setOrdersHydrated(true);
  }, []);

  useEffect(() => {
    if (!ordersHydrated) {
      return;
    }

    saveLiveOrdersToStorage({ pendingOrders, activeOrders });
  }, [activeOrders, ordersHydrated, pendingOrders]);

  const openOrderTicket = (
    side: LiveOrderSide = "long",
    entryPrice: number | null = null,
  ) => {
    setOrderTicketRequest((current) => ({
      id: current.id + 1,
      side,
      entryPrice,
    }));
    setShowOrderTicket(true);
  };

  const handlePlacePendingOrder = (order: LivePendingOrder) => {
    setPendingOrders((current) => [order, ...current]);
  };

  const handleCancelPendingOrder = (orderId: string) => {
    setPendingOrders((current) => current.filter((order) => order.id !== orderId));
  };

  const triggerPendingOrdersAtPrice = async (
    currentPrice: number,
    previousPrice: number | null,
  ) => {
    const ordersToTrigger = pendingOrders.filter((order) =>
      doesLivePriceTriggerPendingOrder(order, currentPrice, previousPrice),
    );

    if (ordersToTrigger.length === 0) {
      return;
    }

    const orderIds = new Set(ordersToTrigger.map((order) => order.id));
    setTriggeringOrderIds((current) => new Set([...current, ...orderIds]));

    const activatedOrders: LiveActiveOrder[] = [];
    const failedOrders: LivePendingOrder[] = [];

    for (const order of ordersToTrigger) {
      try {
        const triggeredAt = new Date();
        const response = await api.post<ApiResponse<number>>(
          "/v1/trade-histories",
          buildLiveTradeHistoryPayload(order, triggeredAt, currentPrice),
        );

        if (!response.data.isSuccess) {
          throw new Error("API error");
        }

        activatedOrders.push({
          ...order,
          tradeHistoryId: response.data.value,
          triggerPrice: currentPrice,
          triggeredAt: triggeredAt.toISOString(),
        });
      } catch {
        failedOrders.push(order);
      }
    }

    if (activatedOrders.length > 0) {
      const activatedIds = new Set(activatedOrders.map((order) => order.id));
      setPendingOrders((current) =>
        current.filter((order) => !activatedIds.has(order.id)),
      );
      setActiveOrders((current) => [...activatedOrders, ...current]);
    }

    setTriggeringOrderIds((current) => {
      const next = new Set(current);
      orderIds.forEach((orderId) => next.delete(orderId));
      return next;
    });

    if (activatedOrders.length > 0) {
      toast({
        title: "Pending order triggered",
        description: `${activatedOrders.length} live order${activatedOrders.length === 1 ? "" : "s"} moved to trade history.`,
      });
    }

    if (failedOrders.length > 0) {
      toast({
        variant: "destructive",
        title: "Order trigger failed",
        description: `${failedOrders.length} pending order${failedOrders.length === 1 ? "" : "s"} could not be created in trade history.`,
      });
    }
  };

  const handleLivePriceUpdate = () => {
    const currentPrice = parseLiveOrderPrice(livePriceInput);

    if (!currentPrice) {
      toast({
        variant: "destructive",
        title: "Live price not updated",
        description: "Enter a valid current price.",
      });
      return;
    }

    const previousPrice = lastLivePrice;
    setLastLivePrice(currentPrice);
    void triggerPendingOrdersAtPrice(currentPrice, previousPrice);
  };

  const bindVisibleRangeSync = (widget: TVWidget, seq: number) => {
    visibleRangeCleanupRef.current?.();
    visibleRangeCleanupRef.current = subscribeToWidgetVisibleRange(widget, (range) => {
      if (mountedRef.current && seq === creationSeqRef.current) {
        setKillzoneRange(range);
      }
    });
  };

  const bindOrderContextMenu = (widget: TVWidget, seq: number) => {
    contextMenuCleanupRef.current?.();
    contextMenuCleanupRef.current = bindLiveOrderContextMenu(widget, (side, entryPrice) => {
      if (mountedRef.current && seq === creationSeqRef.current) {
        openOrderTicket(side, entryPrice);
      }
    });
  };

  // ── Create / recreate widget ──

  const createWidget = () => {
    const container = containerRef.current;
    if (!container || !mountedRef.current) return;

    // Destroy existing widget
    if (widgetRef.current) {
      contextMenuCleanupRef.current?.();
      contextMenuCleanupRef.current = null;
      try {
        widgetRef.current.remove();
      } catch {
        // ignore
      }
      widgetRef.current = null;
    }

    visibleRangeCleanupRef.current?.();
    visibleRangeCleanupRef.current = null;
    contextMenuCleanupRef.current?.();
    contextMenuCleanupRef.current = null;

    // Remove any previous children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Reset loading state for recreation
    setWidgetReady(false);

    // Bump the creation seq so any stale async callbacks bail out
    const seq = ++creationSeqRef.current;

    // Read current values from refs (not closure-captured)
    const tvSymbol = resolveTradingViewSymbol(symbolRef.current);
    const theme = themeRef.current === "dark" ? "dark" : "light";

    // Create a fresh container div for the widget. The free tv.js embed widget
    // only renders into an element referenced by `container_id` (a string id),
    // so we must give the div a unique id rather than passing the element.
    const widgetDiv = document.createElement("div");
    widgetDiv.id = `tv-live-widget-${++widgetIdCounter}`;
    widgetDiv.style.width = "100%";
    widgetDiv.style.height = "100%";
    container.appendChild(widgetDiv);

    const doCreate = () => {
      // Bail if unmounted, container gone, or a newer creation started
      if (!mountedRef.current || !widgetDiv.isConnected || seq !== creationSeqRef.current) return;

      const TV = (window as unknown as Record<string, unknown>).TradingView as
        | { widget?: new (opts: Record<string, unknown>) => TVWidget }
        | undefined;

      if (!TV?.widget) {
        // Script not ready yet — retry on next frame
        if (mountedRef.current && seq === creationSeqRef.current) {
          requestAnimationFrame(doCreate);
        }
        return;
      }

      try {
        widgetRef.current = new TV.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: intervalRef.current,
          timezone: chartTimeZoneRef.current,
          theme,
          style: "1",
          locale: "en",
          toolbar_bg: theme === "dark" ? "#0f172a" : "#f8fafc",
          enable_publishing: false,
          allow_symbol_change: false,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          hide_volume: false,
          watchlist: [],
          container_id: widgetDiv.id,
          studies: [],
          withdateranges: false,
          details: false,
          hotlist: false,
          calendar: false,
        });

        // The free tv.js embed widget doesn't reliably expose onChartReady
        // (it's a Charting Library method), so calling it may throw. Guard it
        // on its own and don't let a failure here abort the rest of setup.
        try {
          widgetRef.current.onChartReady(() => {
            if (mountedRef.current && seq === creationSeqRef.current) {
              setWidgetReady(true);
              if (widgetRef.current) {
                bindVisibleRangeSync(widgetRef.current, seq);
                bindOrderContextMenu(widgetRef.current, seq);
              }
            }
          });
        } catch {
          // ignore — fallback below clears the overlay
        }
      } catch {
        if (mountedRef.current && seq === creationSeqRef.current) {
          setWidgetReady(false);
        }
        return;
      }

      // Fallback: the embedded iframe renders the chart on its own even if
      // onChartReady is slow, missing, or never fires — clear the overlay
      // after a short delay so it can't get stuck. Scheduled unconditionally
      // (outside the onChartReady try) and guarded against stale recreations.
      setTimeout(() => {
        if (mountedRef.current && seq === creationSeqRef.current) {
          setWidgetReady(true);
          if (widgetRef.current) {
            bindVisibleRangeSync(widgetRef.current, seq);
            bindOrderContextMenu(widgetRef.current, seq);
          }
        }
      }, 1500);
    };

    // If script already loaded, create widget immediately
    if (scriptLoadedRef.current && (window as unknown as Record<string, unknown>).TradingView) {
      // Double rAF to let the DOM settle after removing old widget + appending new div
      requestAnimationFrame(() => {
        requestAnimationFrame(doCreate);
      });
      return;
    }

    if (scriptLoadedRef.current) {
      // Script was loaded but TradingView not on window — poll with rAF
      requestAnimationFrame(() => {
        requestAnimationFrame(doCreate);
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(doCreate);
      });
    };
    script.onerror = () => {
      if (mountedRef.current && seq === creationSeqRef.current) {
        setWidgetReady(false);
      }
    };

    document.head.appendChild(script);
  };

  // ── Single effect: create on mount, recreate when deps change ──

  useEffect(() => {
    mountedRef.current = true;

    // Small delay so the container ref is attached
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        createWidget();
      }
    }, 0);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch {
          // ignore
        }
        widgetRef.current = null;
      }
      visibleRangeCleanupRef.current?.();
      visibleRangeCleanupRef.current = null;
      contextMenuCleanupRef.current?.();
      contextMenuCleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, resolvedTheme, chartTimeZone]);

  // ── Handle search submit ──

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (trimmed) {
      setSymbol(trimmed.toUpperCase());
      setSearchInput("");
    }
  };

  // ── Toggle fullscreen ──

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;

    if (!isFullscreen) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsFullscreen(!isFullscreen);
  };

  // ── Listen for fullscreen change ──

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const refresh = () => {
      const now = new Date();
      setClockNow(now);
      setKillzoneRange((currentRange) =>
        currentRange.source === "widget"
          ? currentRange
          : getDefaultLiveKillzoneRange(intervalRef.current, now),
      );
    };

    refresh();
    const timer = window.setInterval(refresh, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const now = new Date();
    setClockNow(now);
    setKillzoneRange(getDefaultLiveKillzoneRange(interval, now));
  }, [interval, chartTimeZone]);

  const activeKillzone = getActiveLiveKillzone(
    clockNow,
    LIVE_CHART_KILLZONES,
    chartTimeZone,
  );
  const killzoneSegments = showKillzones
    ? buildLiveKillzoneSegments(killzoneRange, LIVE_CHART_KILLZONES, chartTimeZone)
    : [];

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-border/70 bg-card/80 shadow-sm backdrop-blur-md",
        className,
      )}
    >
      {/* ── Toolbar ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-md border border-border/70 bg-background/75">
            <Search className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Symbol (e.g. XAUUSD, ES, BTCUSDT)..."
              className="h-8 w-48 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={handleSearch}
            aria-label="Search symbol"
            title="Search symbol"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {symbol}
          </span>

          {activeKillzone ? (
            <span
              className="hidden rounded-sm border px-2 py-0.5 text-xs font-semibold sm:inline-flex"
              style={{
                borderColor: `${activeKillzone.color}88`,
                color: activeKillzone.color,
                backgroundColor: `${activeKillzone.color}18`,
              }}
            >
              {activeKillzone.shortLabel}
            </span>
          ) : null}

          <div className="flex items-center rounded-md border border-border/70 bg-background/75">
            <Input
              id="live-price-input"
              aria-label="Last price"
              value={livePriceInput}
              onChange={(event) => setLivePriceInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleLivePriceUpdate();
                }
              }}
              type="number"
              inputMode="decimal"
              step={TRADE_PRICE_INPUT_STEP}
              placeholder="Last price"
              className="h-8 w-28 border-0 bg-transparent text-xs tabular-nums shadow-none focus-visible:ring-0"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md"
              onClick={handleLivePriceUpdate}
              aria-label="Update live price"
              title="Update live price"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            variant={showOrderTicket ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => {
              if (showOrderTicket) {
                setShowOrderTicket(false);
              } else {
                openOrderTicket();
              }
            }}
            aria-label={
              showOrderTicket
                ? "Close live order ticket"
                : "Open live order ticket"
            }
            aria-pressed={showOrderTicket}
            title={
              showOrderTicket
                ? "Close live order ticket"
                : "Open live order ticket"
            }
          >
            <Send className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant={showKillzones ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={() => setShowKillzones((value) => !value)}
            aria-label="Toggle ICT kill zones"
            aria-pressed={showKillzones}
            title="Toggle ICT kill zones"
          >
            <Clock className="h-3.5 w-3.5" />
          </Button>

          <Select
            value={chartTimeZone}
            onValueChange={(v) => setChartTimeZone(v as LiveChartTimeZone)}
          >
            <SelectTrigger
              aria-label="Kill zone timezone"
              className="h-8 w-[78px] rounded-md text-xs font-semibold"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {LIVE_CHART_TIME_ZONES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={interval}
            variant="outline"
            aria-label="Chart timeframe"
            className="flex shrink-0 gap-1 rounded-md bg-muted/25 p-0.5"
            onValueChange={(nextValue) => {
              if (nextValue) {
                setInterval(nextValue as TVInterval);
              }
            }}
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                aria-label={`Switch to ${opt.label} timeframe`}
                className="h-7 min-w-9 flex-none rounded-sm border-border/70 bg-background/75 px-2 text-xs font-medium shadow-sm data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* ── Chart container ── */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={containerRef}
          className="absolute inset-0"
        />

        {showKillzones ? (
          <LiveKillzoneOverlay
            segments={killzoneSegments}
            now={clockNow}
            source={killzoneRange.source}
            timeZone={chartTimeZone}
          />
        ) : null}

        <LiveOrderPriceOverlay
          pendingOrders={pendingOrders}
          activeOrders={activeOrders}
          lastPrice={lastLivePrice}
          triggeringOrderIds={triggeringOrderIds}
          onCancelPendingOrder={handleCancelPendingOrder}
        />

        {showOrderTicket ? (
          <LiveOrderTicket
            symbol={symbol}
            request={orderTicketRequest}
            onClose={() => setShowOrderTicket(false)}
            onPlacePendingOrder={handlePlacePendingOrder}
          />
        ) : null}

        {!widgetReady ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm font-medium text-muted-foreground">
                Loading TradingView chart...
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

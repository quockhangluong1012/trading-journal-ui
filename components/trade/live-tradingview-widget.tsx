"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Clock3, Search, Maximize2, Minimize2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface LiveTradingViewWidgetProps {
  className?: string;
}

type LiveChartKillzoneId = "asian" | "london" | "new-york";

export interface LiveChartKillzoneDefinition {
  id: LiveChartKillzoneId;
  label: string;
  startHourUtc: number;
  endHourUtc: number;
  color: string;
  fillColor: string;
}

export interface LiveChartKillzoneSegment {
  id: string;
  killzoneId: LiveChartKillzoneId;
  label: string;
  leftPercent: number;
  widthPercent: number;
  timeLabel: string;
  color: string;
  fillColor: string;
  showLabel: boolean;
}

export const LIVE_CHART_KILLZONES: LiveChartKillzoneDefinition[] = [
  {
    id: "asian",
    label: "Asian",
    startHourUtc: 23,
    endHourUtc: 5,
    color: "#0ea5e9",
    fillColor: "rgba(14, 165, 233, 0.13)",
  },
  {
    id: "london",
    label: "London",
    startHourUtc: 7,
    endHourUtc: 10,
    color: "#f59e0b",
    fillColor: "rgba(245, 158, 11, 0.14)",
  },
  {
    id: "new-york",
    label: "New York",
    startHourUtc: 12,
    endHourUtc: 15,
    color: "#ef4444",
    fillColor: "rgba(239, 68, 68, 0.13)",
  },
];

function hourToPercent(hour: number): number {
  return (hour / 24) * 100;
}

function formatUtcHour(hour: number): string {
  if (hour === 24) return "24:00";
  return `${Math.floor(hour).toString().padStart(2, "0")}:00`;
}

function formatUtcTime(date: Date): string {
  return `${date.getUTCHours().toString().padStart(2, "0")}:${date
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")} UTC`;
}

function getUtcDecimalHour(date: Date): number | null {
  const time = date.getTime();
  if (!Number.isFinite(time)) {
    return null;
  }

  return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
}

function createLiveKillzoneSegment({
  zone,
  startHourUtc,
  endHourUtc,
  suffix,
  showLabel,
}: {
  zone: LiveChartKillzoneDefinition;
  startHourUtc: number;
  endHourUtc: number;
  suffix?: string;
  showLabel: boolean;
}): LiveChartKillzoneSegment {
  return {
    id: suffix ? `${zone.id}-${suffix}` : zone.id,
    killzoneId: zone.id,
    label: zone.label,
    leftPercent: hourToPercent(startHourUtc),
    widthPercent: hourToPercent(endHourUtc - startHourUtc),
    timeLabel: `${formatUtcHour(startHourUtc)}-${formatUtcHour(endHourUtc)} UTC`,
    color: zone.color,
    fillColor: zone.fillColor,
    showLabel,
  };
}

export function buildLiveKillzoneSegments(
  zones: LiveChartKillzoneDefinition[] = LIVE_CHART_KILLZONES,
): LiveChartKillzoneSegment[] {
  return zones.flatMap((zone) => {
    if (zone.endHourUtc > zone.startHourUtc) {
      return [
        createLiveKillzoneSegment({
          zone,
          startHourUtc: zone.startHourUtc,
          endHourUtc: zone.endHourUtc,
          showLabel: true,
        }),
      ];
    }

    return [
      createLiveKillzoneSegment({
        zone,
        startHourUtc: zone.startHourUtc,
        endHourUtc: 24,
        suffix: "late",
        showLabel: false,
      }),
      createLiveKillzoneSegment({
        zone,
        startHourUtc: 0,
        endHourUtc: zone.endHourUtc,
        suffix: "early",
        showLabel: true,
      }),
    ];
  });
}

export function getActiveLiveKillzone(
  date: Date,
  zones: LiveChartKillzoneDefinition[] = LIVE_CHART_KILLZONES,
): LiveChartKillzoneDefinition | null {
  const currentHour = getUtcDecimalHour(date);
  if (currentHour == null) {
    return null;
  }

  return zones.find((zone) => {
    if (zone.endHourUtc > zone.startHourUtc) {
      return currentHour >= zone.startHourUtc && currentHour < zone.endHourUtc;
    }

    return currentHour >= zone.startHourUtc || currentHour < zone.endHourUtc;
  }) ?? null;
}

// ── TV widget type ──

interface TVWidget {
  remove(): void;
  onChartReady(cb: () => void): void;
  activeChart(): { setSymbol(symbol: string, cb: () => void): void };
}

// Module-level counter so each widget div gets a unique, stable id.
let widgetIdCounter = 0;

function LiveKillzoneOverlay({ currentTime }: { currentTime: Date }) {
  const segments = buildLiveKillzoneSegments();
  const activeKillzone = getActiveLiveKillzone(currentTime);
  const currentHour = getUtcDecimalHour(currentTime);
  const currentPercent = currentHour == null ? 0 : hourToPercent(currentHour);

  return (
    <div
      aria-label="Live chart killzones"
      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
    >
      {segments.map((segment) => {
        const isActive = activeKillzone?.id === segment.killzoneId;

        return (
          <div
            key={segment.id}
            aria-label={`${segment.label} killzone ${segment.timeLabel}`}
            className={cn(
              "absolute inset-y-0 border-x transition-opacity duration-300",
              isActive ? "opacity-95" : "opacity-60",
            )}
            style={{
              left: `${segment.leftPercent}%`,
              width: `${segment.widthPercent}%`,
              backgroundColor: segment.fillColor,
              borderColor: segment.color,
            }}
          >
            {segment.showLabel ? (
              <span
                className="absolute left-2 top-3 rounded-sm border bg-background/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-normal shadow-sm backdrop-blur-sm"
                style={{
                  borderColor: segment.color,
                  color: segment.color,
                }}
              >
                {segment.label}
              </span>
            ) : null}
          </div>
        );
      })}

      <div
        aria-hidden="true"
        className="absolute inset-y-0 w-px bg-primary/80 shadow-[0_0_10px_hsl(var(--primary)/0.65)]"
        style={{ left: `${currentPercent}%` }}
      >
        <span className="absolute left-1 top-12 whitespace-nowrap rounded-sm border border-primary/50 bg-background/90 px-1.5 py-0.5 text-[10px] font-bold text-primary shadow-sm backdrop-blur-sm">
          {formatUtcTime(currentTime)}
        </span>
      </div>

      <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-background/85 px-2 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur-sm">
        <span className="text-foreground">Killzones</span>
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-muted-foreground/60" />
        <span>
          {activeKillzone ? `${activeKillzone.label} KZ active` : "Outside KZ"}
        </span>
      </div>

      <div className="absolute inset-x-4 bottom-1 flex justify-between text-[9px] font-semibold text-muted-foreground/80">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24 UTC</span>
      </div>
    </div>
  );
}

// ── Component ──

export function LiveTradingViewWidget({ className }: LiveTradingViewWidgetProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<TVWidget | null>(null);
  const scriptLoadedRef = useRef(false);
  const mountedRef = useRef(true);
  const creationSeqRef = useRef(0);

  const [symbol, setSymbol] = useState("XAUUSD");
  const [interval, setInterval] = useState<TVInterval>("60");
  const [searchInput, setSearchInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [showKillzones, setShowKillzones] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Keep latest symbol/interval/theme in refs so doCreate always reads fresh
  // values without needing to be recreated as a useCallback.
  const symbolRef = useRef(symbol);
  const intervalRef = useRef(interval);
  const themeRef = useRef(resolvedTheme);
  symbolRef.current = symbol;
  intervalRef.current = interval;
  themeRef.current = resolvedTheme;

  // ── Create / recreate widget ──

  const createWidget = () => {
    const container = containerRef.current;
    if (!container || !mountedRef.current) return;

    // Destroy existing widget
    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch {
        // ignore
      }
      widgetRef.current = null;
    }

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
          timezone: "Etc/UTC",
          theme,
          style: "1",
          locale: "en",
          toolbar_bg: theme === "dark" ? "#0f172a" : "#f8fafc",
          enable_publishing: false,
          allow_symbol_change: false,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: true,
          hide_volume: false,
          watchlist: [],
          container_id: widgetDiv.id,
          studies: [],
          withdateranges: true,
          details: true,
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, resolvedTheme]);

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
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  const activeKillzone = getActiveLiveKillzone(currentTime);

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-border/70 bg-card/80 shadow-sm backdrop-blur-md",
        className,
      )}
    >
      {/* ── Toolbar ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2">
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

        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {symbol}
          </span>

          <Select
            value={interval}
            onValueChange={(v) => setInterval(v as TVInterval)}
          >
            <SelectTrigger className="h-8 w-[68px] rounded-md text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {INTERVAL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-md",
              showKillzones ? "bg-primary/10 text-primary" : "",
            )}
            onClick={() => setShowKillzones((value) => !value)}
            aria-label={showKillzones ? "Hide killzones" : "Show killzones"}
            title={showKillzones ? "Hide killzones" : "Show killzones"}
          >
            <Clock3 className="h-3.5 w-3.5" />
          </Button>

          <span
            className="hidden rounded-sm border px-2 py-0.5 text-xs font-semibold sm:inline-flex"
            style={{
              borderColor: activeKillzone?.color ?? "hsl(var(--border))",
              color: activeKillzone?.color ?? "hsl(var(--muted-foreground))",
              backgroundColor: activeKillzone?.fillColor ?? "hsl(var(--muted) / 0.3)",
            }}
          >
            {activeKillzone ? `${activeKillzone.label} KZ` : "No KZ"}
          </span>

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

        {showKillzones ? <LiveKillzoneOverlay currentTime={currentTime} /> : null}

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

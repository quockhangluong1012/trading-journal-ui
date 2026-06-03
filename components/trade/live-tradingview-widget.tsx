"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Search, Maximize2, Minimize2 } from "lucide-react";
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

// ── TV widget type ──

interface TVWidget {
  remove(): void;
  onChartReady(cb: () => void): void;
  activeChart(): { setSymbol(symbol: string, cb: () => void): void };
}

// Module-level counter so each widget div gets a unique, stable id.
let widgetIdCounter = 0;

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

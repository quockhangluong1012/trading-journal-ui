"use client";

import { useEffect, useRef, use, useMemo, useState } from "react";
import { useBacktestStore, type Timeframe } from "@/lib/backtest-store";
import { KLineChartPro, DatafeedSubscribeCallback, SymbolInfo, Period, ChartPro } from '@klinecharts/pro';
import { init as klineInit, dispose as klineDispose, registerOverlay, LineType, type OverlayCreate } from 'klinecharts';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import { useTheme } from "next-themes";
import { Play, Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { OrderPanel } from "@/components/backtest/order-panel";
import { PositionsPanel } from "@/components/backtest/positions-panel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Header } from "@/components/header";
import { TooltipProvider } from "@/components/ui/tooltip";

// Register custom order marker overlay (arrow + label)
let _orderMarkerRegistered = false;
const CHART_TIMEZONE = "Etc/UTC";
const TIMEFRAME_OPTIONS: Array<{ value: Timeframe; label: string }> = [
  { value: "M1", label: "1m" },
  { value: "M5", label: "5m" },
  { value: "M15", label: "15m" },
  { value: "H1", label: "1H" },
  { value: "H4", label: "4H" },
  { value: "D1", label: "1D" },
];

function getTimeframeMs(tf: Timeframe) {
  if (tf === 'M1') return 60000;
  if (tf === 'M5') return 5 * 60000;
  if (tf === 'M15') return 15 * 60000;
  if (tf === 'H1') return 60 * 60000;
  if (tf === 'H4') return 240 * 60000;
  if (tf === 'D1') return 1440 * 60000;
  return 60000;
}

function floorTimestamp(timestamp: string | number, tf: Timeframe) {
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const ms = getTimeframeMs(tf);
  return Math.floor(time / ms) * ms;
}

function toChartPeriod(timeframe: Timeframe): Period {
  if (timeframe.startsWith("M")) {
    return { multiplier: parseInt(timeframe.slice(1), 10), timespan: "minute", text: timeframe };
  }

  if (timeframe.startsWith("H")) {
    return { multiplier: parseInt(timeframe.slice(1), 10), timespan: "hour", text: timeframe };
  }

  if (timeframe.startsWith("D")) {
    return { multiplier: parseInt(timeframe.slice(1), 10), timespan: "day", text: timeframe };
  }

  throw new Error(`Unsupported timeframe: ${timeframe}`);
}

function formatSessionTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "Waiting for candles";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Waiting for candles";
  }

  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  return `${datePart} ${timePart} UTC`;
}

function ensureOrderMarkerRegistered() {
  if (_orderMarkerRegistered) return;
  try {
    registerOverlay({
      name: 'orderMarker',
      totalStep: 1,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures: ({ overlay, coordinates }) => {
        if (!coordinates?.length) return [];
        const coord = coordinates[0];
        const data = overlay.extendData as { isBuy: boolean; label: string } | null;
        if (!data) return [];
        const { isBuy, label } = data;
        const color = isBuy ? '#2962FF' : '#F23645';
        const s = 7;
        // Upward triangle for Long, downward for Short
        const tri = isBuy
          ? [
              { x: coord.x, y: coord.y - s },
              { x: coord.x - s * 0.75, y: coord.y + s * 0.5 },
              { x: coord.x + s * 0.75, y: coord.y + s * 0.5 }
            ]
          : [
              { x: coord.x, y: coord.y + s },
              { x: coord.x - s * 0.75, y: coord.y - s * 0.5 },
              { x: coord.x + s * 0.75, y: coord.y - s * 0.5 }
            ];
        return [
          {
            type: 'polygon',
            attrs: { coordinates: tri },
            styles: { style: 'fill', color, borderColor: color },
            ignoreEvent: true
          },
          {
            type: 'text',
            attrs: {
              x: coord.x + s + 4,
              y: coord.y + (isBuy ? s * 0.25 : -s * 0.25),
              text: label,
              align: 'left',
              baseline: 'middle'
            },
            styles: { 
              color, 
              size: 11, 
              weight: 'bold', 
              family: 'Arial, sans-serif',
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              paddingLeft: 0,
              paddingRight: 0,
              paddingTop: 0,
              paddingBottom: 0
            },
            ignoreEvent: true
          }
        ];
      }
    });
  } catch { /* already registered */ }
  _orderMarkerRegistered = true;
}

export default function BacktestWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ChartPro | null>(null);
  const klineChartRef = useRef<ReturnType<typeof klineInit>>(null);
  const orderOverlayIdsRef = useRef<string[]>([]);
  const [chartReadyVersion, setChartReadyVersion] = useState(0);
  const [isSwitchingTimeframe, setIsSwitchingTimeframe] = useState(false);
  const { theme } = useTheme();

  // Datafeed state
  const datafeedCallbackRef = useRef<DatafeedSubscribeCallback | null>(null);
  const candlesRef = useRef<any[]>([]);
  const previousCandlesLengthRef = useRef(0);

  if (isNaN(sessionId)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive">Invalid Session ID</h2>
          <p className="text-muted-foreground">The backtest session ID provided in the URL is invalid. Please navigate back to the Backtest Dashboard.</p>
        </div>
      </div>
    );
  }

  const {
    session,
    candles,
    resumeSession,
    isPlaying,
    startPlayback,
    pausePlayback,
    playbackSpeed,
    setPlaybackSpeed,
    activeTimeframe,
    switchTimeframe,
    advanceCandle,
    currentTimestamp,
    balance,
    equity,
    unrealizedPnl,
    pendingOrders,
    activePositions,
    closedPositions,
    loadTradingZones
  } = useBacktestStore();
  const hasLoadedCandles = candles.length > 0;

  const mappedCandles = useMemo(() => {
    return candles.map((c) => ({
      timestamp: new Date(c.timestamp).getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume || 0
    }));
  }, [candles]);

  const lastCandleTimestamp = candles.length > 0 ? candles[candles.length - 1].timestamp : null;
  const displayedTimestamp = lastCandleTimestamp;
  const formattedTimestamp = formatSessionTimestamp(displayedTimestamp);

  // Keep a ref of candles for the datafeed
  useEffect(() => {
    const prevLen = previousCandlesLengthRef.current;
    candlesRef.current = candles;

    if (datafeedCallbackRef.current && prevLen > 0 && candles.length === prevLen + 1) {
      const latest = candles[candles.length - 1];
      datafeedCallbackRef.current({
        timestamp: new Date(latest.timestamp).getTime(),
        open: latest.open,
        high: latest.high,
        low: latest.low,
        close: latest.close,
        volume: latest.volume || 0
      });
    }

    previousCandlesLengthRef.current = candles.length;
  }, [candles]);

  // Hydrate checkpoint candles after async resume/timeframe load completes.
  useEffect(() => {
    const chartApi = klineChartRef.current;
    if (!chartApi) return;

    if (mappedCandles.length === 0) {
      chartApi.clearData();
      return;
    }

    const currentChartData = chartApi.getDataList();
    const lastTimestamp = mappedCandles[mappedCandles.length - 1].timestamp;
    const chartLastTimestamp = currentChartData.length > 0 ? currentChartData[currentChartData.length - 1].timestamp : null;
    const needsHydration = currentChartData.length !== mappedCandles.length || chartLastTimestamp !== lastTimestamp;
    if (!needsHydration) return;

    chartApi.applyNewData(mappedCandles);
    chartApi.setOffsetRightDistance(60);
    chartApi.scrollToTimestamp(lastTimestamp);
  }, [activeTimeframe, chartReadyVersion, mappedCandles]);

  const datafeed = useMemo(() => {
    return {
      searchSymbols: async (search?: string) => {
        if (!session?.asset) return [];
        return [{
          ticker: session.asset,
          name: session.asset,
          shortName: session.asset,
          exchange: 'Backtest',
          market: 'Backtest',
          pricePrecision: 5,
          volumePrecision: 2,
          priceCurrency: 'USD',
          type: 'forex'
        }];
      },
      getHistoryKLineData: async (symbol: SymbolInfo, period: Period, from: number, to: number) => {
        if (!session?.asset || !candlesRef.current.length) return [];

        const rangeStart = Math.min(from, to);
        const rangeEnd = Math.max(from, to);

        return candlesRef.current
          .map(c => ({
            timestamp: new Date(c.timestamp).getTime(),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || 0
          }))
          .filter((c) => c.timestamp >= rangeStart && c.timestamp <= rangeEnd);
      },
      subscribe: (symbol: SymbolInfo, period: Period, callback: DatafeedSubscribeCallback) => {
        datafeedCallbackRef.current = callback;
      },
      unsubscribe: (symbol: SymbolInfo, period: Period) => {
        datafeedCallbackRef.current = null;
      }
    };
  }, [session?.asset]);

  // Initial load
  useEffect(() => {
    resumeSession(sessionId);
    loadTradingZones();
    return () => {
      pausePlayback();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Init chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !session?.asset) return;
    
    // Clear previous elements inside container if KLineChart doesn't clean itself up perfectly
    container.innerHTML = '';
    
    const isDark = theme === "dark";

    const chart = new KLineChartPro({
      container: container,
      theme: isDark ? 'dark' : 'light',
      locale: 'en-US',
      timezone: CHART_TIMEZONE,
      drawingBarVisible: true,
      periods: [],
      mainIndicators: [],
      subIndicators: [],
      symbol: {
        ticker: session.asset,
        name: session.asset,
        shortName: session.asset
      },
      period: toChartPeriod(activeTimeframe),
      datafeed: datafeed
    });

    chartInstanceRef.current = chart;

    // Cache the underlying klinecharts chart for overlay management.
    // @klinecharts/pro doesn't expose createOverlay/removeOverlay publicly,
    // but it shares the same klinecharts module, so we can retrieve the instance
    // by temporarily setting the element's HTML id to match the stored key.
    const inner = container.querySelector<HTMLElement>('[k-line-chart-id]');
    if (inner) {
      const chartId = inner.getAttribute('k-line-chart-id');
      if (chartId) {
        inner.id = chartId;
        klineChartRef.current = klineInit(inner);
        setChartReadyVersion((version) => version + 1);
        inner.id = '';
      }
    }

    return () => {
      if (klineChartRef.current) {
        klineDispose(klineChartRef.current);
      }
      // Cleanup KLineChartPro if needed
      if (container) {
         container.innerHTML = '';
      }
      chartInstanceRef.current = null;
      klineChartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, session?.asset, datafeed]);

  // Handle timeframe change gracefully without unmounting the whole chart
  useEffect(() => {
    if (chartInstanceRef.current && activeTimeframe) {
      chartInstanceRef.current.setPeriod(toChartPeriod(activeTimeframe));
    }
  }, [activeTimeframe]);

  // Render order overlays on the chart
  useEffect(() => {
    const chartApi = klineChartRef.current;
    if (!chartApi || !lastCandleTimestamp) return;

    ensureOrderMarkerRegistered();

    // Remove previous overlays
    orderOverlayIdsRef.current.forEach(id => chartApi.removeOverlay(id));
    const newIds: string[] = [];
    const lastTs = new Date(lastCandleTimestamp).getTime();

    const add = (config: Omit<OverlayCreate, 'id' | 'lock'>, id: string) => {
      chartApi.createOverlay({ ...config, id, lock: true });
      newIds.push(id);
    };

    // Active positions: arrow marker at fill point + dashed SL/TP lines
    activePositions.forEach((order) => {
      if (order.filledAt && order.filledPrice) {
        const isBuy = order.side === "Long";
        const ts = floorTimestamp(order.filledAt, activeTimeframe);
        add({
          name: 'orderMarker',
          points: [{ timestamp: ts, value: order.filledPrice }],
          extendData: { isBuy, label: `${order.positionSize} @ ${order.filledPrice.toFixed(2)}` }
        }, `activeEntry_${order.id}`);
      }
      if (order.stopLoss && order.stopLoss > 0) {
        add({
          name: 'horizontalRayLine',
          points: [{ timestamp: lastTs, value: order.stopLoss }],
          styles: { line: { color: '#F23645', style: LineType.Dashed, size: 1 } }
        }, `activeSl_${order.id}`);
      }
      if (order.takeProfit && order.takeProfit > 0) {
        add({
          name: 'horizontalRayLine',
          points: [{ timestamp: lastTs, value: order.takeProfit }],
          styles: { line: { color: '#089981', style: LineType.Dashed, size: 1 } }
        }, `activeTp_${order.id}`);
      }
    });

    // Pending orders: dashed entry line + optional SL/TP
    pendingOrders.forEach((order) => {
      const isBuy = order.side === "Long";
      add({
        name: 'horizontalRayLine',
        points: [{ timestamp: lastTs, value: order.entryPrice }],
        styles: { line: { color: isBuy ? '#2962FF' : '#F23645', style: LineType.Dashed, size: 1 } }
      }, `pendingEntry_${order.id}`);
      if (order.stopLoss && order.stopLoss > 0) {
        add({
          name: 'horizontalRayLine',
          points: [{ timestamp: lastTs, value: order.stopLoss }],
          styles: { line: { color: '#FF9800', style: LineType.Dashed, size: 1 } }
        }, `pendingSl_${order.id}`);
      }
      if (order.takeProfit && order.takeProfit > 0) {
        add({
          name: 'horizontalRayLine',
          points: [{ timestamp: lastTs, value: order.takeProfit }],
          styles: { line: { color: '#089981', style: LineType.Dashed, size: 1 } }
        }, `pendingTp_${order.id}`);
      }
    });

    // Closed positions: arrow markers at entry and exit
    closedPositions.forEach((order) => {
      if (order.filledAt && order.filledPrice) {
        const isBuy = order.side === "Long";
        const ts = floorTimestamp(order.filledAt, activeTimeframe);
        add({
          name: 'orderMarker',
          points: [{ timestamp: ts, value: order.filledPrice }],
          extendData: { isBuy, label: `${order.positionSize} @ ${order.filledPrice.toFixed(2)}` }
        }, `closedEntry_${order.id}`);
      }
      if (order.closedAt && order.exitPrice) {
        const isBuy = order.side === "Long";
        const ts = floorTimestamp(order.closedAt, activeTimeframe);
        add({
          name: 'orderMarker',
          points: [{ timestamp: ts, value: order.exitPrice }],
          extendData: { isBuy: !isBuy, label: `${order.positionSize} @ ${order.exitPrice.toFixed(2)}` }
        }, `closedExit_${order.id}`);
      }
    });

    orderOverlayIdsRef.current = newIds;
  }, [activePositions, closedPositions, lastCandleTimestamp, pendingOrders, activeTimeframe]);

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

  const togglePlayback = () => {
    if (isPlaying) pausePlayback();
    else startPlayback(sessionId);
  };

  const handleSkip = () => {
    advanceCandle(sessionId);
  };

  const handleTimeframeChange = async (nextTimeframe: Timeframe) => {
    if (nextTimeframe === activeTimeframe || isSwitchingTimeframe) {
      return;
    }

    setIsSwitchingTimeframe(true);
    try {
      await switchTimeframe(sessionId, nextTimeframe);
    } finally {
      setIsSwitchingTimeframe(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, sessionId, startPlayback, pausePlayback, advanceCandle]);

  const formatCurrency = (val: number) => {
    const absVal = Math.abs(val);
    const maxDigits = absVal > 0 && absVal < 0.01 ? 5 : 2;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: maxDigits }).format(val);
  };

  if (!session) return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <div className="flex flex-col items-center gap-4 text-center animate-pulse">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <h2 className="text-xl font-semibold text-muted-foreground">Loading Workspace...</h2>
      </div>
    </div>
  );

  return (
    <TooltipProvider disableHoverableContent>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-3 bg-card shadow-sm z-10 transition-all">
        <div className="flex items-center gap-4">
          <div className="font-bold text-xl tracking-tight">{session.asset}</div>
          <div className="flex items-center gap-3 rounded-lg border bg-secondary/35 px-2 py-1 shadow-sm">
            <ToggleGroup
              type="single"
              value={activeTimeframe}
              variant="outline"
              size="sm"
              className="flex-wrap"
              onValueChange={(value) => {
                if (value) {
                  void handleTimeframeChange(value as Timeframe);
                }
              }}
            >
              {TIMEFRAME_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  disabled={isSwitchingTimeframe}
                  aria-label={`Switch to ${option.label} timeframe`}
                  className="min-w-12"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="h-6 w-px bg-border/70" />

            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Candle Time</span>
              <span className="text-sm font-semibold tabular-nums">{formattedTimestamp}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-border mx-3" />

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-secondary/80 rounded-lg p-1.5 gap-1 shadow-inner border border-secondary">
              <Button
                variant={isPlaying ? "default" : "ghost"}
                size="sm"
                className={`h-8 w-8 p-0 rounded-md transition-all ${isPlaying ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-primary/20'}`}
                onClick={togglePlayback}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-primary/20 transition-colors" onClick={handleSkip} title="Forward 1 Candle">
                <SkipForward className="h-4 w-4" />
              </Button>
              
              <div className="h-5 w-px bg-border/50 mx-1" />

              <Select
                value={playbackSpeed.toString()}
                onValueChange={(v) => setPlaybackSpeed(parseInt(v) as any)}
              >
                <SelectTrigger className="h-8 w-16.25 text-xs font-semibold border-none bg-transparent hover:bg-black/5 dark:hover:bg-white/5 focus:ring-0 focus:ring-offset-0 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                  <SelectItem value="10">10x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

          <div className="flex items-center gap-6">
            <div className="flex bg-secondary/30 rounded-lg p-1.5 border border-border shadow-sm">
              <div className="flex flex-col items-start px-3 border-r border-border">
                <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Balance</span>
                <span className="font-bold text-sm leading-tight">{formatCurrency(balance)}</span>
              </div>
              <div className="flex flex-col items-start px-3 border-r border-border">
                <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Equity</span>
                <span className="font-bold text-sm leading-tight">{formatCurrency(equity)}</span>
              </div>
              <div className="flex flex-col items-start px-3">
                <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Open PnL</span>
                <span className={`font-bold text-sm leading-tight ${unrealizedPnl > 0 ? "text-emerald-500" : unrealizedPnl < 0 ? "text-rose-500" : ""}`}>
                  {unrealizedPnl > 0 ? "+" : ""}{formatCurrency(unrealizedPnl)}
                </span>
              </div>
            </div>
            <Badge variant={session.status === "Liquidated" ? "destructive" : "default"} className="px-3 py-1.5 text-xs uppercase tracking-wider font-bold shadow-sm">
              {session.status}
            </Badge>
          </div>
        </div>

      <div className="flex flex-1 overflow-hidden relative w-full" style={{ height: 'calc(100vh - 140px)' }}>
        <ResizablePanelGroup direction="vertical" className="w-full h-full">
          <ResizablePanel defaultSize={70} minSize={30} className="flex relative z-0 w-full h-full">
            <ResizablePanelGroup direction="horizontal" className="w-full h-full">
              <ResizablePanel defaultSize={75} minSize={30} className="relative bg-background shadow-inner overflow-hidden w-full h-full">
                <div className="backtest-chart-shell w-full h-full">
                  <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" style={{ minHeight: '400px' }} />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={15} maxSize={40} collapsible={true} collapsedSize={0} className="border-l bg-card hidden md:block z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] h-full">
                <OrderPanel sessionId={sessionId} currentPrice={currentPrice} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={30} minSize={10} maxSize={60} collapsible={true} collapsedSize={0} className="flex flex-col bg-card z-10 border-t h-full w-full">
            <PositionsPanel sessionId={sessionId} currentPrice={currentPrice} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      </div>
    </div>
    <style jsx global>{`
      .backtest-chart-shell .klinecharts-pro-period-bar {
        display: none !important;
      }

      .backtest-chart-shell .klinecharts-pro-content {
        height: 100% !important;
      }
    `}</style>
    </TooltipProvider>
  );
}

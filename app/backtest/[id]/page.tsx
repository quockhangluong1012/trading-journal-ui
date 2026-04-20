"use client";

import { useCallback, useEffect, useRef, use, useMemo, useState } from "react";
import { useBacktestStore, type Timeframe } from "@/lib/backtest-store";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { KLineChartPro, DatafeedSubscribeCallback, SymbolInfo, Period, ChartPro } from '@klinecharts/pro';
import { init as klineInit, dispose as klineDispose, registerOverlay, LineType, type OverlayCreate } from 'klinecharts';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import { useTheme } from "next-themes";
import { Flag, PanelRightOpen, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BacktestWorkspaceHeader } from "../../../components/backtest/backtest-workspace-header";
import { OrderPanel } from "@/components/backtest/order-panel";
import { PositionsPanel } from "@/components/backtest/positions-panel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Header } from "@/components/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Register custom order marker overlay (arrow + label)
let _orderMarkerRegistered = false;
const CHART_TIMEZONE = "Etc/UTC";

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
  const router = useRouter();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ChartPro | null>(null);
  const klineChartRef = useRef<ReturnType<typeof klineInit>>(null);
  const orderOverlayIdsRef = useRef<string[]>([]);
  const [chartReadyVersion, setChartReadyVersion] = useState(0);
  const [isSwitchingTimeframe, setIsSwitchingTimeframe] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isOrderPanelCollapsed, setIsOrderPanelCollapsed] = useState(false);
  const [isPositionsPanelCollapsed, setIsPositionsPanelCollapsed] = useState(false);
  const { theme } = useTheme();
  const orderPanelRef = useRef<ImperativePanelHandle | null>(null);
  const positionsPanelRef = useRef<ImperativePanelHandle | null>(null);
  const chartResizeFrameRef = useRef<number | null>(null);

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
    loadTradingZones,
    finishSession,
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
  const previousPrice = candles.length > 1 ? candles[candles.length - 2].close : null;

  const togglePlayback = useCallback(() => {
    if (isPlaying) pausePlayback();
    else startPlayback(sessionId);
  }, [isPlaying, pausePlayback, sessionId, startPlayback]);

  const handleSkip = useCallback(() => {
    advanceCandle(sessionId);
  }, [advanceCandle, sessionId]);

  const requestChartResize = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (chartResizeFrameRef.current !== null) {
      window.cancelAnimationFrame(chartResizeFrameRef.current);
    }

    chartResizeFrameRef.current = window.requestAnimationFrame(() => {
      chartResizeFrameRef.current = null;

      const chartApi = klineChartRef.current as (ReturnType<typeof klineInit> & { resize?: () => void }) | null;
      chartApi?.resize?.();
    });
  }, []);

  const handleCollapseOrderPanel = () => {
    orderPanelRef.current?.collapse();
  };

  const handleExpandOrderPanel = () => {
    orderPanelRef.current?.expand(22);
  };

  const handleCollapsePositionsPanel = () => {
    positionsPanelRef.current?.collapse();
  };

  const handleExpandPositionsPanel = () => {
    positionsPanelRef.current?.expand();
  };

  const handleOrderPanelCollapsed = useCallback(() => {
    setIsOrderPanelCollapsed(true);
    requestChartResize();
  }, [requestChartResize]);

  const handleOrderPanelExpanded = useCallback(() => {
    setIsOrderPanelCollapsed(false);
    requestChartResize();
  }, [requestChartResize]);

  const handlePositionsPanelCollapsed = useCallback(() => {
    setIsPositionsPanelCollapsed(true);
    requestChartResize();
  }, [requestChartResize]);

  const handlePositionsPanelExpanded = useCallback(() => {
    setIsPositionsPanelCollapsed(false);
    requestChartResize();
  }, [requestChartResize]);

  const handleTimeframeChange = async (nextTimeframe: Timeframe) => {
    if (nextTimeframe === activeTimeframe || isSwitchingTimeframe) {
      return;
    }

    setIsSwitchingTimeframe(true);
    try {
      await switchTimeframe(sessionId, nextTimeframe);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to switch timeframe.";
      toast.error(message);
    } finally {
      setIsSwitchingTimeframe(false);
    }
  };

  const handleFinishSession = async () => {
    setIsFinishing(true);

    try {
      await finishSession(sessionId, currentPrice > 0 ? currentPrice : null);
      toast.success("Backtest session finished.");
      router.push(`/backtest/${sessionId}/results`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to finish session.";
      toast.error(message);
    } finally {
      setIsFinishing(false);
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
  }, [handleSkip, togglePlayback]);

  useEffect(() => {
    return () => {
      if (chartResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(chartResizeFrameRef.current);
      }
    };
  }, []);

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
          <BacktestWorkspaceHeader
            asset={session.asset}
            sessionStatus={session.status}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            activeTimeframe={activeTimeframe}
            isSwitchingTimeframe={isSwitchingTimeframe}
            formattedTimestamp={formattedTimestamp}
            activePositionsCount={activePositions.length}
            pendingOrdersCount={pendingOrders.length}
            closedPositionsCount={closedPositions.length}
            balance={balance}
            equity={equity}
            unrealizedPnl={unrealizedPnl}
            onTogglePlayback={togglePlayback}
            onSkip={handleSkip}
            onPlaybackSpeedChange={setPlaybackSpeed}
            onTimeframeChange={(nextTimeframe: Timeframe) => {
              void handleTimeframeChange(nextTimeframe);
            }}
            finishAction={session.status === "InProgress" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-8 rounded-md border-amber-500/40 bg-amber-500/5 px-2.5 text-xs font-semibold shadow-sm hover:bg-amber-500/10" title="Close open positions and cancel pending orders now.">
                    <Flag className="mr-2 h-4 w-4 text-amber-600" />
                    Finish Early
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finish this backtest now?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Any open positions will be closed at the visible market price and pending orders will be cancelled before sending you to the results page.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isFinishing}>Keep Session Running</AlertDialogCancel>
                    <AlertDialogAction disabled={isFinishing} onClick={() => void handleFinishSession()}>
                      {isFinishing ? "Finishing..." : "Finish Session"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          />

      <div className="flex min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-1.5">
        <ResizablePanelGroup direction="vertical" className="h-full w-full min-h-0 flex-1 overflow-hidden rounded-2xl border bg-background shadow-sm">
          <ResizablePanel defaultSize={70} minSize={30} onResize={requestChartResize} className="relative z-0 flex min-h-0 w-full">
            <ResizablePanelGroup direction="horizontal" className="w-full min-h-0">
              <ResizablePanel
                defaultSize={75}
                minSize={30}
                onResize={requestChartResize}
                className="relative min-h-0 w-full overflow-hidden bg-background shadow-inner"
              >
                <div className="backtest-chart-shell w-full h-full">
                  <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" style={{ minHeight: '400px' }} />
                </div>

                {isOrderPanelCollapsed && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute right-3 top-3 z-20 h-10 w-10 rounded-xl bg-background/90 shadow-sm backdrop-blur"
                    onClick={handleExpandOrderPanel}
                    title="Expand order ticket"
                    aria-label="Expand order ticket"
                  >
                    <PanelRightOpen className="h-4 w-4" />
                  </Button>
                )}

                {isPositionsPanelCollapsed && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute bottom-3 right-3 z-20 h-10 w-10 rounded-xl bg-background/90 shadow-sm backdrop-blur"
                    onClick={handleExpandPositionsPanel}
                    title="Expand positions and orders panel"
                    aria-label="Expand positions and orders panel"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                )}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel
                ref={orderPanelRef}
                defaultSize={24}
                minSize={18}
                maxSize={36}
                collapsible={true}
                collapsedSize={0}
                onCollapse={handleOrderPanelCollapsed}
                onExpand={handleOrderPanelExpanded}
                className="z-10 hidden min-h-0 border-l bg-card shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] md:block"
              >
                <OrderPanel
                  sessionId={sessionId}
                  currentPrice={currentPrice}
                  previousPrice={previousPrice}
                  onCollapse={handleCollapseOrderPanel}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            ref={positionsPanelRef}
            defaultSize={30}
            minSize={10}
            maxSize={60}
            collapsible={true}
            collapsedSize={0}
            onCollapse={handlePositionsPanelCollapsed}
            onExpand={handlePositionsPanelExpanded}
            className="z-10 flex min-h-0 w-full flex-col border-t bg-card"
          >
            <PositionsPanel sessionId={sessionId} currentPrice={currentPrice} onCollapse={handleCollapsePositionsPanel} />
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

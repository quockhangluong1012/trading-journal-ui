"use client";

import { useCallback, useEffect, useRef, use, useState } from "react";
import { useBacktestStore, type Timeframe, type ChartDrawing as StoredChartDrawing } from "@/lib/backtest-store";
import { useTheme } from "next-themes";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BacktestOrderTicket,
  isBacktestOrderTicketShortcut,
  type BacktestOrderTicketOpenRequest,
} from "@/components/backtest/backtest-order-ticket";
import { isInteractiveEventTarget } from "@/components/backtest/keyboard-shortcuts";
import { PositionsPanel } from "@/components/backtest/positions-panel";
import { TradingViewPlatform, type ChartDrawing } from "@/components/backtest/tradingview-platform";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { Header } from "@/components/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import Link from "next/link";
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

const sessionDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const sessionTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatSessionTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "Waiting for candles";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Waiting for candles";
  }

  const datePart = sessionDateFormatter.format(date);
  const timePart = sessionTimeFormatter.format(date);

  return `${datePart} ${timePart} UTC`;
}

export default function BacktestWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);
  const router = useRouter();
  const [isSwitchingTimeframe, setIsSwitchingTimeframe] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const positionsPanelRef = useRef<ImperativePanelHandle>(null);
  const [isPositionsPanelCollapsed, setIsPositionsPanelCollapsed] = useState(true);
  const [orderTicketOpenRequest, setOrderTicketOpenRequest] = useState<BacktestOrderTicketOpenRequest>({
    id: 0,
    price: null,
  });
  const { resolvedTheme } = useTheme();

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

  const session = useBacktestStore((state) => state.session);
  const candles = useBacktestStore((state) => state.candles);
  const resumeSession = useBacktestStore((state) => state.resumeSession);
  const isPlaying = useBacktestStore((state) => state.isPlaying);
  const startPlayback = useBacktestStore((state) => state.startPlayback);
  const pausePlayback = useBacktestStore((state) => state.pausePlayback);
  const playbackSpeed = useBacktestStore((state) => state.playbackSpeed);
  const setPlaybackSpeed = useBacktestStore((state) => state.setPlaybackSpeed);
  const activeTimeframe = useBacktestStore((state) => state.activeTimeframe);
  const switchTimeframe = useBacktestStore((state) => state.switchTimeframe);
  const advanceCandle = useBacktestStore((state) => state.advanceCandle);
  const pendingOrders = useBacktestStore((state) => state.pendingOrders);
  const activePositions = useBacktestStore((state) => state.activePositions);
  const closedPositions = useBacktestStore((state) => state.closedPositions);
  const loadTradingZones = useBacktestStore((state) => state.loadTradingZones);
  const finishSession = useBacktestStore((state) => state.finishSession);
  const drawings = useBacktestStore((state) => state.drawings);
  const setDrawings = useBacktestStore((state) => state.setDrawings);
  const saveDrawings = useBacktestStore((state) => state.saveDrawings);

  const displayedTimestamp = candles.length > 0
    ? candles[candles.length - 1].timestamp
    : session?.currentTimestamp ?? null;
  const formattedTimestamp = formatSessionTimestamp(displayedTimestamp);

  const loadWorkspace = useCallback(async () => {
    setLoadError(false);
    try {
      await resumeSession(sessionId);
    } catch {
      setLoadError(true);
    }
  }, [resumeSession, sessionId]);

  // Initial load
  useEffect(() => {
    void loadWorkspace();
    loadTradingZones();
    return () => {
      pausePlayback();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const previousPrice = candles.length > 1 ? candles[candles.length - 2].close : null;

  const togglePlayback = useCallback(() => {
    if (isPlaying) pausePlayback();
    else startPlayback(sessionId);
  }, [isPlaying, pausePlayback, sessionId, startPlayback]);

  const handleSkip = useCallback(() => {
    advanceCandle(sessionId);
  }, [advanceCandle, sessionId]);

  const openOrderTicket = useCallback((price: number | null = null) => {
    setOrderTicketOpenRequest((current) => ({
      id: current.id + 1,
      price,
    }));
  }, []);

  // Persist chart drawings with a short debounce so rapid edits (e.g. dragging)
  // coalesce into a single save once the user pauses.
  const drawingsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDrawingsChange = useCallback((next: ChartDrawing[]) => {
    setDrawings(next as unknown as StoredChartDrawing[]);
    if (drawingsSaveTimerRef.current) {
      clearTimeout(drawingsSaveTimerRef.current);
    }
    drawingsSaveTimerRef.current = setTimeout(() => {
      void saveDrawings(sessionId).catch(() => {
        toast.error("Failed to save chart drawings.");
      });
    }, 800);
  }, [saveDrawings, sessionId, setDrawings]);

  useEffect(() => () => {
    if (drawingsSaveTimerRef.current) {
      clearTimeout(drawingsSaveTimerRef.current);
    }
  }, []);

  const requestChartResize = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  }, []);

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
      // Bail if the user is typing in a field or operating any interactive
      // control, so e.g. Space on a focused button doesn't also toggle replay.
      if (isInteractiveEventTarget(e.target)) return;

      if (isBacktestOrderTicketShortcut(e)) {
        e.preventDefault();
        openOrderTicket(currentPrice > 0 && Number.isFinite(currentPrice) ? currentPrice : null);
      } else if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPrice, handleSkip, openOrderTicket, togglePlayback]);

  if (loadError) return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <h2 className="text-xl font-semibold text-destructive">Couldn&apos;t load workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t resume this backtest session. It may have expired, been removed, or the connection dropped.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button onClick={() => void loadWorkspace()}>Retry</Button>
          <Button variant="outline" asChild>
            <Link href="/backtest">Back to Sessions</Link>
          </Button>
        </div>
      </div>
    </div>
  );

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
          <div className="flex min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
            <ResizablePanelGroup direction="vertical" className="h-full w-full min-h-0 flex-1 overflow-hidden rounded-lg border border-border/70 bg-card/80 shadow-sm backdrop-blur-md">
              <ResizablePanel
                defaultSize={94}
                minSize={45}
                onResize={requestChartResize}
                className="relative min-h-0 w-full overflow-hidden bg-background"
              >
                <TradingViewPlatform
                  key={sessionId}
                  asset={session.asset}
                  timeframe={activeTimeframe}
                  candles={candles}
                  pendingOrders={pendingOrders}
                  activePositions={activePositions}
                  closedPositions={closedPositions}
                  theme={resolvedTheme}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  formattedTimestamp={formattedTimestamp}
                  startDate={session.startDate}
                  endDate={session.endDate}
                  currentTimestamp={displayedTimestamp}
                  initialDrawings={drawings as unknown as ChartDrawing[]}
                  onDrawingsChange={handleDrawingsChange}
                  activeTimeframe={activeTimeframe}
                  isSwitchingTimeframe={isSwitchingTimeframe}
                  onTimeframeChange={(nextTimeframe: Timeframe) => {
                    void handleTimeframeChange(nextTimeframe);
                  }}
                  finishAction={session.status === "InProgress" ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="h-7 rounded-md border-amber-500/40 bg-amber-500/5 px-2 text-xs font-semibold shadow-sm hover:bg-amber-500/10" title="Close open positions and cancel pending orders now.">
                          <Flag className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                          Finish
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
                  onOpenOrderTicket={openOrderTicket}
                  onTogglePlayback={togglePlayback}
                  onSkip={handleSkip}
                  onPlaybackSpeedChange={setPlaybackSpeed}
                  className="absolute inset-0"
                />

                <BacktestOrderTicket
                  sessionId={sessionId}
                  currentPrice={currentPrice}
                  previousPrice={previousPrice}
                  openRequest={orderTicketOpenRequest}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel
                ref={positionsPanelRef}
                collapsible
                collapsedSize={6}
                defaultSize={6}
                minSize={16}
                maxSize={45}
                onCollapse={() => setIsPositionsPanelCollapsed(true)}
                onExpand={() => setIsPositionsPanelCollapsed(false)}
                onResize={requestChartResize}
                className="z-10 min-h-0 border-t border-border/70 bg-card"
              >
                <PositionsPanel
                  sessionId={sessionId}
                  currentPrice={currentPrice}
                  isCollapsed={isPositionsPanelCollapsed}
                  onCollapse={() => positionsPanelRef.current?.collapse()}
                  onExpand={() => positionsPanelRef.current?.expand()}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

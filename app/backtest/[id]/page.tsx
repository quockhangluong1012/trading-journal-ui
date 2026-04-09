"use client";

import { useEffect, useRef, useState } from "react";
import { useBacktestStore } from "@/lib/backtest-store";
import { init, dispose, Chart, KLineData } from "klinecharts";
import { useTheme } from "next-themes";
import { Play, Pause, FastForward, SkipForward, Maximize2, Settings2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OrderPanel } from "@/components/backtest/order-panel";
import { Header } from "@/components/header";

export default function BacktestWorkspace({ params }: { params: { id: string } }) {
  const sessionId = parseInt(params.id, 10);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const { theme } = useTheme();

  const {
    session,
    loadSession,
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
    balance,
    equity,
    unrealizedPnl
  } = useBacktestStore();

  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    resumeSession(sessionId);
    return () => {
      pausePlayback();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Init chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chart = init(chartContainerRef.current, {
      styles: {
        grid: {
          horizontal: { color: theme === 'dark' ? '#333' : '#eee' },
          vertical: { color: theme === 'dark' ? '#333' : '#eee' }
        },
        candle: {
          type: 'candle_solid'
        }
      }
    });
    
    chartInstanceRef.current = chart;

    return () => {
      if (chartContainerRef.current) {
        dispose(chartContainerRef.current);
      }
    };
  }, [theme]);

  // Update chart data
  useEffect(() => {
    if (chartInstanceRef.current && candles.length > 0) {
      const dataList: KLineData[] = candles.map(c => ({
        timestamp: new Date(c.timestamp).getTime(),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));
      chartInstanceRef.current.applyNewData(dataList);
    }
  }, [candles]);

  const togglePlayback = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback(sessionId);
    }
  };

  const handleSkip = () => {
    advanceCandle(sessionId);
  };

  const handleTimeframeChange = (val: string) => {
    // Requires mapping MTF logic over current timestamp
    switchTimeframe(sessionId, val as any);
  };

  const setDrawingMode = (tool: string) => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.createOverlay({
        name: tool,
        lock: false,
      });
    }
    setActiveDrawingTool(null);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  if (!session) return <div className="p-8 text-center animate-pulse">Loading Workspace...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-card">
        <div className="flex items-center gap-4">
          <div className="font-semibold text-lg">{session.asset}</div>
          <Select value={activeTimeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M5">5m</SelectItem>
              <SelectItem value="M15">15m</SelectItem>
              <SelectItem value="H1">1H</SelectItem>
              <SelectItem value="H4">4H</SelectItem>
              <SelectItem value="D1">1D</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-border mx-2" />

          {/* Playback Controls */}
          <div className="flex flex-col text-xs text-muted-foreground mr-2">
            <span>Playback Engine</span>
          </div>
          <div className="flex items-center bg-secondary rounded-md p-1 gap-1">
            <Button
              variant={isPlaying ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={togglePlayback}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSkip} title="Next Candle">
              <SkipForward className="h-4 w-4" />
            </Button>
            
            <Select
              value={playbackSpeed.toString()}
              onValueChange={(v) => setPlaybackSpeed(parseInt(v) as any)}
            >
              <SelectTrigger className="h-7 w-[60px] text-xs border-none bg-transparent focus:ring-0">
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

        {/* Account Info */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground text-xs">Balance</span>
            <span className="font-semibold">{formatCurrency(balance)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground text-xs">Equity</span>
            <span className="font-semibold">{formatCurrency(equity)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground text-xs">Unrealized PnL</span>
            <span className={unrealizedPnl >= 0 ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>
              {unrealizedPnl >= 0 ? "+" : ""}{formatCurrency(unrealizedPnl)}
            </span>
          </div>
          <Badge variant={session.status === "Liquidated" ? "destructive" : "default"}>
            {session.status}
          </Badge>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Drawing Tools Sidebar */}
        <div className="w-12 border-r bg-card flex flex-col items-center py-2 gap-2">
          <Button variant="ghost" size="icon" title="Trend Line" onClick={() => setDrawingMode('rayLine')}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Fibonacci" onClick={() => setDrawingMode('fibonacciLine')}>
            <span className="font-bold font-serif text-sm">F</span>
          </Button>
          <Button variant="ghost" size="icon" title="Rectangle" onClick={() => setDrawingMode('rect')}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div className="h-px bg-border w-8 my-2" />
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" title="Clear All Drawings" onClick={() => chartInstanceRef.current?.removeOverlay()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Chart Area */}
        <div className="flex-1 relative">
          <div ref={chartContainerRef} className="absolute inset-0" />
        </div>

        {/* Order Panel Sidebar */}
        <div className="w-[300px] border-l bg-card overflow-y-auto hidden md:block">
           <OrderPanel sessionId={sessionId} currentPrice={candles.length > 0 ? candles[candles.length - 1].close : 0} />
        </div>
      </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, use } from "react";
import { useBacktestStore } from "@/lib/backtest-store";
import { init, dispose, Chart, KLineData } from "klinecharts";
import { registerCustomOverlays } from "@/lib/kline-plugins";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Play, Pause, FastForward, SkipForward, Maximize2, Settings2, Pencil, Trash2, ArrowRight, Minus, Square, Grid3x3, MousePointer2, MoveUpRight, ArrowUpRight, Crosshair, Target, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OrderPanel } from "@/components/backtest/order-panel";
import { Header } from "@/components/header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BacktestWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const { theme } = useTheme();

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
    unrealizedPnl,
    pendingOrders,
    activePositions,
    closedPositions,
    cancelOrder,
    closeOrder
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
    
    registerCustomOverlays();

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
    chart?.setPriceVolumePrecision(5, 2);

    return () => {
      if (chartContainerRef.current) {
        dispose(chartContainerRef.current);
      }
    };
  }, [theme]);

  // Update chart data
  const prevCandlesLenRef = useRef<number>(0);
  useEffect(() => {
    if (chartInstanceRef.current && candles) {
      if (candles.length === 0) {
        chartInstanceRef.current.applyNewData([]);
        prevCandlesLenRef.current = 0;
        return;
      }

      // If just one new candle is added (or updated), use updateData
      if (candles.length === prevCandlesLenRef.current + 1 || candles.length === prevCandlesLenRef.current) {
        const lastCandle = candles[candles.length - 1];
        chartInstanceRef.current.updateData({
          timestamp: new Date(lastCandle.timestamp).getTime(),
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
          volume: lastCandle.volume,
        });
      } else {
        // Full reload
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
      prevCandlesLenRef.current = candles.length;
    }
  }, [candles]);

  // Render order overlays
  useEffect(() => {
    if (!chartInstanceRef.current) return;
    const chart = chartInstanceRef.current;

    chart.removeOverlay({ groupId: "orders" });
    chart.removeOverlay({ groupId: "markers" });

    const allOrders = [...pendingOrders, ...activePositions];
    const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
    
    allOrders.forEach((order) => {
      const isBuy = order.side === "Long";
      const entryColor = isBuy ? "#2962FF" : "#F23645"; 
      const orderTypeStr = order.orderType; 
      
      const price = order.status === "Pending" ? order.entryPrice : order.filledPrice || order.entryPrice;

      let quantityText = order.positionSize.toString();
      if (order.status === "Active" && currentPrice > 0) {
        const pnlValue = isBuy 
          ? ((currentPrice - price) * order.positionSize) 
          : ((price - currentPrice) * order.positionSize);
        quantityText = `${order.positionSize} | ${pnlValue >= 0 ? "+" : ""}${pnlValue.toFixed(2)} USD`;
      }

      chart.createOverlay({
        groupId: "orders",
        name: "tradingViewOrder",
        extendData: {
          color: entryColor,
          isDashed: true,
          segments: [
            { text: quantityText, color: entryColor, bgColor: "transparent", borderColor: entryColor },
          ]
        },
        points: [{ value: price }],
        onClick: () => {
          (async () => {
             try {
                if (order.status === "Pending") await cancelOrder(order.id);
                else await closeOrder(order.id, currentPrice);
                toast.success(order.status === "Pending" ? "Order cancelled" : "Position closed");
             } catch (err: any) {
                toast.error(err?.response?.data?.error?.message || err.message || "Action failed");
             }
          })();
          return true;
        }
      });

      if (order.stopLoss) {
        const slDiff = isBuy ? (order.stopLoss - price) : (price - order.stopLoss);
        const slPnl = slDiff * order.positionSize;
        const slColor = "#FF9800"; 

        chart.createOverlay({
          groupId: "orders",
          name: "tradingViewOrder",
          extendData: {
            color: slColor,
            isDashed: true,
            segments: [
              { text: order.positionSize.toString(), color: slColor, bgColor: "transparent", borderColor: slColor },
              { text: `${slPnl >= 0 ? "+" : ""}${slPnl.toFixed(2)} USD`, color: slColor, bgColor: "transparent", borderColor: "transparent" },
              { text: "X", color: slColor, bgColor: "transparent", borderColor: slColor },
            ]
          },
          points: [{ value: order.stopLoss }],
          onClick: () => {
            (async () => {
               try {
                  if (order.status === "Pending") await cancelOrder(order.id);
                  else await closeOrder(order.id, currentPrice);
                  toast.success(order.status === "Pending" ? "Order cancelled" : "Position closed");
               } catch (err: any) {
                  toast.error(err?.response?.data?.error?.message || err.message || "Action failed");
               }
            })();
            return true;
          }
        });
      }

      if (order.takeProfit) {
        const tpDiff = isBuy ? (order.takeProfit - price) : (price - order.takeProfit);
        const tpPnl = tpDiff * order.positionSize;
        const tpColor = "#089981"; 

        chart.createOverlay({
          groupId: "orders",
          name: "tradingViewOrder",
          extendData: {
            color: tpColor,
            isDashed: true,
            segments: [
              { text: order.positionSize.toString(), color: tpColor, bgColor: "transparent", borderColor: tpColor },
              { text: `${tpPnl >= 0 ? "+" : ""}${tpPnl.toFixed(2)} USD`, color: tpColor, bgColor: "transparent", borderColor: "transparent" },
              { text: "X", color: tpColor, bgColor: "transparent", borderColor: tpColor },
            ]
          },
          points: [{ value: order.takeProfit }],
          onClick: () => {
            (async () => {
               try {
                  if (order.status === "Pending") await cancelOrder(order.id);
                  else await closeOrder(order.id, currentPrice);
                  toast.success(order.status === "Pending" ? "Order cancelled" : "Position closed");
               } catch (err: any) {
                  toast.error(err?.response?.data?.error?.message || err.message || "Action failed");
               }
            })();
            return true;
          }
        });
      }
    });

    // Render historical trade markers
    closedPositions.forEach((order) => {
      // Entry marker (Filled)
      if (order.filledAt && order.filledPrice) {
        chart.createOverlay({
          groupId: "markers",
          name: "tradeMarker",
          extendData: {
            type: order.side === "Long" ? "buy" : "sell",
            text: `${order.positionSize} @ ${order.filledPrice}`
          },
          points: [{ timestamp: new Date(order.filledAt).getTime(), value: order.filledPrice }]
        });
      }

      // Exit marker (Closed)
      if (order.closedAt && order.exitPrice) {
        chart.createOverlay({
          groupId: "markers",
          name: "tradeMarker",
          extendData: {
            type: order.side === "Long" ? "sell" : "buy", 
            text: `${order.positionSize} @ ${order.exitPrice} (PnL: ${order.pnl?.toFixed(2)})`
          },
          points: [{ timestamp: new Date(order.closedAt).getTime(), value: order.exitPrice }]
        });
      }
    });

  }, [pendingOrders, activePositions, closedPositions, currentPrice]);

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
          {/* Lines Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Lines">
                <Pencil className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem onClick={() => setDrawingMode('segment')}>
                <Minus className="h-4 w-4 mr-2" /> Trend Line
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('rayLine')}>
                <ArrowRight className="h-4 w-4 mr-2" /> Ray
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('horizontalLine')}>
                <Minus className="h-4 w-4 mr-2" /> Horizontal Line
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('horizontalRayLine')}>
                <ArrowRight className="h-4 w-4 mr-2" /> Horizontal Ray
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('verticalLine')}>
                <Minus className="h-4 w-4 mr-2 rotate-90" /> Vertical Line
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('crossLine')}>
                <Crosshair className="h-4 w-4 mr-2" /> Cross Line
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fibonacci & Gann Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Fibonacci & Gann">
                <span className="font-bold font-serif text-sm">F</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem onClick={() => setDrawingMode('fibonacciLine')}>
                <span className="font-bold font-serif text-sm mr-2 w-4 text-center">F</span> Fib Retracement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('gannBox')}>
                <Grid3x3 className="h-4 w-4 mr-2" /> Gann Box
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Shapes & Measurers Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Shapes & Measurers">
                <Square className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem onClick={() => setDrawingMode('rect')}>
                <Square className="h-4 w-4 mr-2" /> Rectangle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('parallelogram')}>
                <Target className="h-4 w-4 mr-2" /> Rotated Rectangle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('priceLine')}>
                <ArrowUpRight className="h-4 w-4 mr-2" /> Price Range
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('arrow')}>
                <MoveUpRight className="h-4 w-4 mr-2" /> Arrow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Text & Notes Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Text & Notes">
                <Type className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem onClick={() => setDrawingMode('text')}>
                <Type className="h-4 w-4 mr-2" /> Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('simpleAnnotation')}>
                <Type className="h-4 w-4 mr-2" /> Anchored Text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

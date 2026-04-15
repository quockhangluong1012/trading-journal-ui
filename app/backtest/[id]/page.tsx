"use client";

import { useEffect, useRef, useState, use } from "react";
import { useBacktestStore } from "@/lib/backtest-store";
import { init, dispose, Chart, KLineData, CandleType } from "klinecharts";
import { registerCustomOverlays } from "@/lib/kline-plugins";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Play, Pause, FastForward, SkipForward, Maximize2, Settings2, Pencil, Trash2, ArrowRight, Minus, Square, Grid3x3, MousePointer2, MoveUpRight, ArrowUpRight, Crosshair, Target, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { OrderPanel } from "@/components/backtest/order-panel";
import { PositionsPanel } from "@/components/backtest/positions-panel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Header } from "@/components/header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    closeOrder,
    tradingZones,
    loadTradingZones
  } = useBacktestStore();

  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    resumeSession(sessionId);
    loadTradingZones();
    return () => {
      pausePlayback();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const getChartStyles = (): any => {
    const isDark = theme === "dark";
    const textColor = isDark ? '#9CA3AF' : '#76808F';
    const gridColor = isDark ? '#374151' : '#F2F3F5';
    const axisLineColor = isDark ? '#4B5563' : '#E0E3E7';
    const crosshairColor = isDark ? '#9CA3AF' : '#8A8A8A';
    const crosshairBgColor = isDark ? '#374151' : '#686D76';

    return {
      grid: {
        show: true,
        horizontal: {
          show: true,
          size: 1,
          color: gridColor,
          style: 'solid',
        },
        vertical: {
          show: true,
          size: 1,
          color: gridColor,
          style: 'solid',
        },
      },
      candle: {
        type: CandleType.CandleSolid,
        bar: {
          upColor: '#26A69A',
          downColor: '#EF5350',
          noChangeColor: '#888888',
          upBorderColor: '#26A69A',
          downBorderColor: '#EF5350',
          noChangeBorderColor: '#888888',
          upWickColor: '#26A69A',
          downWickColor: '#EF5350',
          noChangeWickColor: '#888888',
        },
        tooltip: {
          showRule: 'always',
          showType: 'standard',
          labels: ['O: ', 'C: ', 'H: ', 'L: ', 'V: '],
          text: {
            size: 12,
            family: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            weight: 'bold',
            color: textColor,
            marginLeft: 8,
            marginTop: 6,
            marginRight: 8,
            marginBottom: 0
          }
        }
      },
      xAxis: {
        show: true,
        size: 'auto',
        axisLine: {
          show: true,
          color: axisLineColor,
          size: 1
        },
        tickText: {
          show: true,
          color: textColor,
          family: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          weight: 'normal',
          size: 12,
          paddingTop: 3,
          paddingBottom: 6
        },
        tickLine: {
          show: true,
          size: 1,
          length: 3,
          color: axisLineColor
        }
      },
      yAxis: {
        show: true,
        size: 'auto',
        position: 'right',
        type: 'normal',
        inside: false,
        reverse: false,
        axisLine: {
          show: true,
          color: axisLineColor,
          size: 1
        },
        tickText: {
          show: true,
          color: textColor,
          family: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          weight: 'normal',
          size: 12,
          paddingLeft: 3,
          paddingRight: 6
        },
        tickLine: {
          show: true,
          size: 1,
          length: 3,
          color: axisLineColor
        }
      },
      crosshair: {
        show: true,
        horizontal: {
          show: true,
          line: {
            show: true,
            style: 'dashed',
            dashedValue: [4, 2],
            size: 1,
            color: crosshairColor
          },
          text: {
            show: true,
            color: '#FFFFFF',
            size: 12,
            family: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            weight: 'normal',
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 4,
            paddingBottom: 4,
            borderSize: 1,
            borderColor: crosshairBgColor,
            borderRadius: 4,
            backgroundColor: crosshairBgColor
          }
        },
        vertical: {
          show: true,
          line: {
            show: true,
            style: 'dashed',
            dashedValue: [4, 2],
            size: 1,
            color: crosshairColor
          },
          text: {
            show: true,
            color: '#FFFFFF',
            size: 12,
            family: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            weight: 'normal',
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 4,
            paddingBottom: 4,
            borderSize: 1,
            borderColor: crosshairBgColor,
            borderRadius: 4,
            backgroundColor: crosshairBgColor
          }
        }
      }
    };
  };

  // Init chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    registerCustomOverlays();

    const chart = init(chartContainerRef.current, {
      styles: getChartStyles()
    });
    chartInstanceRef.current = chart;
    chart?.setPriceVolumePrecision(5, 2);

    return () => {
      if (chartContainerRef.current) {
        dispose(chartContainerRef.current);
      }
      chartInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update chart styles when theme changes
  useEffect(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.setStyles(getChartStyles());
    }
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

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

  // Render order overlays
  useEffect(() => {
    if (!chartInstanceRef.current) return;
    const chart = chartInstanceRef.current;

    chart.removeOverlay({ groupId: "orders" });
    chart.removeOverlay({ groupId: "markers" });

    const allOrders = [...pendingOrders, ...activePositions];
    
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
        lock: true,
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
          lock: true,
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
          lock: true,
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
          lock: true,
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
          lock: true,
          extendData: {
            type: order.side === "Long" ? "sell" : "buy", 
            text: `${order.positionSize} @ ${order.exitPrice} (PnL: ${order.pnl?.toFixed(2)})`
          },
          points: [{ timestamp: new Date(order.closedAt).getTime(), value: order.exitPrice }]
        });
      }
    });

  }, [pendingOrders, activePositions, closedPositions, currentPrice]);

  // Render Trading Zones
  useEffect(() => {
    if (!chartInstanceRef.current || !candles.length || !tradingZones.length) return;
    const chart = chartInstanceRef.current;

    chart.removeOverlay({ groupId: "tradingZones" });

    const colors: Record<string, { color: string; bg: string }> = {
      "New York Killzone": {
        color: "rgba(255, 152, 0, 0.2)",
        bg: "rgba(255, 152, 0, 0.03)",
      },
      "London Killzone": {
        color: "rgba(33, 150, 243, 0.2)",
        bg: "rgba(33, 150, 243, 0.03)",
      },
      "Asian Killzone": {
        color: "rgba(233, 30, 99, 0.2)",
        bg: "rgba(233, 30, 99, 0.03)",
      },
      "Overnight / Off-Hours": {
        color: "rgba(76, 175, 80, 0.2)",
        bg: "rgba(76, 175, 80, 0.03)",
      }
    };

    const parseTimeToMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    tradingZones.forEach(zone => {
      const startMins = parseTimeToMinutes(zone.fromTime);
      const endMins = parseTimeToMinutes(zone.toTime);
      
      const zoneInstances = new Map<string, typeof candles>();

      candles.forEach(c => {
         const d = new Date(c.timestamp);
         const m = d.getHours() * 60 + d.getMinutes();
         
         let inZone = false;
         let isNextDayPortion = false;

         if (startMins < endMins) {
            inZone = m >= startMins && m <= endMins;
         } else {
            if (m >= startMins) {
               inZone = true;
            } else if (m <= endMins) {
               inZone = true;
               isNextDayPortion = true;
            }
         }

         if (inZone) {
            const logicalDate = new Date(d.getTime());
            if (isNextDayPortion) {
               logicalDate.setDate(logicalDate.getDate() - 1);
            }
            const dateStr = `${logicalDate.getFullYear()}-${String(logicalDate.getMonth() + 1).padStart(2, '0')}-${String(logicalDate.getDate()).padStart(2, '0')}`;
            
            if (!zoneInstances.has(dateStr)) {
               zoneInstances.set(dateStr, []);
            }
            zoneInstances.get(dateStr)!.push(c);
         }
      });

      zoneInstances.forEach((matchingCandles) => {
         if (matchingCandles.length > 0) {
            const firstCandle = matchingCandles[0];
            const lastCandle = matchingCandles[matchingCandles.length - 1];
            const maxPrice = Math.max(...matchingCandles.map(c => c.high));
            const minPrice = Math.min(...matchingCandles.map(c => c.low));

            let styling = colors[zone.name];
            if (!styling) {
              const found = Object.keys(colors).find(k => zone.name.toLowerCase().includes(k.toLowerCase()));
              if (found) styling = colors[found];
              else {
                const fallbackInt = Array.from(zone.name).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
                styling = { color: `hsla(${fallbackInt}, 80%, 50%, 0.2)`, bg: `hsla(${fallbackInt}, 80%, 50%, 0.03)` };
              }
            }

            chart.createOverlay({
              name: 'sessionBox',
              groupId: 'tradingZones',
              lock: true,
              extendData: {
                name: zone.name,
                color: styling.color,
                bgColor: styling.bg
              },
              points: [
                { timestamp: new Date(firstCandle.timestamp).getTime(), value: maxPrice },
                { timestamp: new Date(lastCandle.timestamp).getTime(), value: minPrice }
              ]
            });
         }
      });
    });
  }, [candles, tradingZones]);

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
      if (tool === 'customRect') {
        let lastClickTime = 0;
        chartInstanceRef.current.createOverlay({
          name: 'customRect',
          lock: false,
          onClick: ({ overlay }) => {
            const now = Date.now();
            if (now - lastClickTime < 300) {
              const currentText = (overlay.extendData as any)?.text ?? "FVG";
              const newText = window.prompt("Enter text for this rectangle:", currentText);
              if (newText !== null) {
                chartInstanceRef.current?.overrideOverlay({
                  id: overlay.id,
                  extendData: { ...overlay.extendData, text: newText }
                });
              }
              lastClickTime = 0;
            } else {
              lastClickTime = now;
            }
            return true;
          }
        });
      } else {
        chartInstanceRef.current.createOverlay(tool);
      }
    }
    setActiveDrawingTool(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

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
        {/* Top Toolbar */}
        <div className="flex items-center justify-between border-b px-6 py-3 bg-card shadow-sm z-10 transition-all">
        <div className="flex items-center gap-4">
          <div className="font-bold text-xl tracking-tight">{session.asset}</div>
          <Select value={activeTimeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-[80px] h-9 font-medium bg-secondary/50 border-secondary hover:bg-secondary transition-colors">
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

          <div className="h-8 w-px bg-border mx-3" />

          {/* Playback Controls */}
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
                <SelectTrigger className="h-8 w-[65px] text-xs font-semibold border-none bg-transparent hover:bg-black/5 dark:hover:bg-white/5 focus:ring-0 focus:ring-offset-0 transition-colors">
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

          {/* Account Info */}
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

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        <ResizablePanelGroup direction="vertical" className="flex-1 w-full">
          <ResizablePanel defaultSize={70} minSize={30} className="flex relative z-0">
        {/* Drawing Tools Sidebar */}
        <div className="w-14 border-r bg-card/95 backdrop-blur flex flex-col items-center py-4 gap-4 shadow-sm z-10 transition-all min-w-[56px]">
          {/* Lines Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="group rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-200">
                    <Pencil className="h-[18px] w-[18px] group-hover:scale-110 transition-transform duration-200" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">Lines & Trends</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" className="w-48 shadow-lg border-border/40">
              <DropdownMenuItem onClick={() => setDrawingMode('segment')}>
                <Minus className="h-4 w-4 mr-2" /> Trend Line
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('rayLine')}>
                <ArrowRight className="h-4 w-4 mr-2" /> Ray
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('horizontalStraightLine')}>
                <Minus className="h-4 w-4 mr-2" /> Horizontal Line
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('horizontalRayLine')}>
                <ArrowRight className="h-4 w-4 mr-2" /> Horizontal Ray
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('verticalStraightLine')}>
                <Minus className="h-4 w-4 mr-2 rotate-90" /> Vertical Line
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('straightLine')}>
                <Crosshair className="h-4 w-4 mr-2" /> Straight Line
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fibonacci & Gann Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="group rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-200">
                    <span className="font-bold font-serif text-[18px] group-hover:scale-110 transition-transform duration-200">F</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">Fibonacci & Projections</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" className="w-48 shadow-lg border-border/40">
              <DropdownMenuItem onClick={() => setDrawingMode('fibonacciLine')}>
                <span className="font-bold font-serif text-sm mr-2 w-4 text-center">F</span> Fib Retracement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('priceChannelLine')}>
                <Grid3x3 className="h-4 w-4 mr-2" /> Price Channel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Shapes & Measurers Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="group rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-200">
                    <Square className="h-[18px] w-[18px] group-hover:scale-110 transition-transform duration-200" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">Shapes & Zones</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" className="w-48 shadow-lg border-border/40">
              <DropdownMenuItem onClick={() => setDrawingMode('customRect')}>
                <Square className="h-4 w-4 mr-2" /> Rectangle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('customArrow')}>
                <ArrowRight className="h-4 w-4 mr-2" /> Arrow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('customPath')}>
                <Pencil className="h-4 w-4 mr-2" /> Path
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Text & Notes Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="group rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-200">
                    <Type className="h-[18px] w-[18px] group-hover:scale-110 transition-transform duration-200" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">Text & Labels</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" className="w-48 shadow-lg border-border/40">
              <DropdownMenuItem onClick={() => setDrawingMode('simpleTag')}>
                <Type className="h-4 w-4 mr-2" /> Tag
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawingMode('simpleAnnotation')}>
                <Type className="h-4 w-4 mr-2" /> Anchored Text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-px bg-border/60 w-8 my-2 shadow-sm" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="group rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all duration-200" onClick={() => chartInstanceRef.current?.removeOverlay({
                name: [
                  'segment', 'rayLine', 'horizontalStraightLine', 'horizontalRayLine', 
                  'verticalStraightLine', 'straightLine', 'priceChannelLine', 'fibonacciLine', 
                  'customRect', 'customArrow', 'customPath', 
                  'simpleTag', 'simpleAnnotation'
                ]
              })}>
                <Trash2 className="h-[18px] w-[18px] group-hover:scale-110 transition-transform duration-200" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border-none">Clear All Drawings</TooltipContent>
          </Tooltip>
        </div>

        {/* Chart Area */}
        <div className="flex-1 relative bg-background border-l shadow-inner overflow-hidden">
          <div ref={chartContainerRef} className="absolute inset-0" />
        </div>

        {/* Order Panel Sidebar */}
        <div className="w-[300px] border-l bg-card overflow-y-auto hidden md:block z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
           <OrderPanel sessionId={sessionId} currentPrice={currentPrice} />
        </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={30} minSize={15} className="flex flex-col bg-card z-10">
            <PositionsPanel sessionId={sessionId} currentPrice={currentPrice} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      </div>
    </div>
    </TooltipProvider>
  );
}

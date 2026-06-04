"use client";

import { useBacktestStore } from "@/lib/backtest-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Clock3,
  ListOrdered,
  Pencil,
  Sigma,
  Trophy,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState, type ReactNode } from "react";
import type { BacktestOrder } from "@/lib/backtest-store";
import { EditPositionModal } from "./edit-position-modal";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PositionsPanelProps {
  sessionId: number;
  currentPrice: number;
  onCollapse?: () => void;
}

function HistoryStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/70 bg-background/70 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={`mt-1 truncate text-sm font-semibold tabular-nums ${
          tone === "positive" ? "text-emerald-500" : tone === "negative" ? "text-rose-500" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return format(date, "MMM dd, HH:mm");
}

function formatDuration(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return "-";

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return "-";
  }

  const totalMinutes = Math.max(1, Math.round((endTime - startTime) / 60000));

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function PositionsPanel({ currentPrice, onCollapse }: PositionsPanelProps) {
  const { session, activePositions, pendingOrders, closedPositions, closeOrder, cancelOrder } = useBacktestStore();
  const [editModal, setEditModal] = useState<{ isOpen: boolean; order: BacktestOrder | null }>({ isOpen: false, order: null });
  const historySummary = useMemo(() => {
    const totalPnl = closedPositions.reduce((sum, order) => sum + (order.pnl ?? 0), 0);
    const wins = closedPositions.filter((order) => (order.pnl ?? 0) > 0).length;
    const losses = closedPositions.filter((order) => (order.pnl ?? 0) < 0).length;
    const lastClosedOrder = closedPositions.reduce<BacktestOrder | null>((latest, order) => {
      if (!order.closedAt) return latest;
      if (!latest?.closedAt) return order;

      return new Date(order.closedAt).getTime() > new Date(latest.closedAt).getTime() ? order : latest;
    }, null);

    return {
      totalPnl,
      wins,
      losses,
      averagePnl: closedPositions.length > 0 ? totalPnl / closedPositions.length : 0,
      lastClosedOrder,
    };
  }, [closedPositions]);

  const handleClosePosition = async (id: number) => {
    if (!window.confirm("Are you sure you want to close this position?")) return;
    try {
      await closeOrder(id, currentPrice);
      toast.success("Position closed");
    } catch (err) {
      toast.error("Failed to close position");
    }
  };

  const handleCancelOrder = async (id: number) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await cancelOrder(id);
      toast.success("Pending order cancelled");
    } catch (err) {
      toast.error("Failed to cancel order");
    }
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null) return "-";
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 5 }).format(val);
  };

  const formatPnL = (val: number) => {
    const absVal = Math.abs(val);
    const maxDigits = absVal > 0 && absVal < 0.01 ? 5 : 2;
    const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: maxDigits }).format(val);
    return val > 0 ? `+${formatted}` : formatted;
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden text-sm">
      <Tabs defaultValue="positions" className="flex flex-col h-full">
        <div className="border-b bg-secondary/10">
          <div className="flex flex-wrap items-center gap-2 px-3 pt-3 text-xs">
            <Badge variant="outline" className="rounded-full px-2.5 py-1 font-medium">
              Open {activePositions.length}
            </Badge>
            <Badge variant="outline" className="rounded-full px-2.5 py-1 font-medium">
              Pending {pendingOrders.length}
            </Badge>
            <Badge variant="outline" className="rounded-full px-2.5 py-1 font-medium">
              Closed {closedPositions.length}
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-muted-foreground">Last price {formatCurrency(currentPrice)}</span>
              {onCollapse && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full border border-border/60 bg-background shadow-sm"
                  onClick={onCollapse}
                  title="Collapse positions and orders panel"
                  aria-label="Collapse positions and orders panel"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-end px-2 pt-2">
          <TabsList className="h-9 bg-transparent p-0 justify-start space-x-6 border-b-none rounded-none">
            <TabsTrigger 
              value="positions" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 pb-2 pt-1 font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Positions <span className="ml-1.5 text-xs text-muted-foreground font-normal">{activePositions.length}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 pb-2 pt-1 font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Orders <span className="ml-1.5 text-xs text-muted-foreground font-normal">{pendingOrders.length}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 pb-2 pt-1 font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Order History
            </TabsTrigger>
          </TabsList>
          </div>
        </div>

        <TabsContent value="positions" className="flex-1 overflow-auto m-0 outline-none">
          <div className="min-w-250">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-card border-b z-10 text-xs text-muted-foreground font-medium">
                <tr>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Side</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium text-right">Avg Fill Price</th>
                  <th className="px-4 py-3 font-medium text-right">Take Profit</th>
                  <th className="px-4 py-3 font-medium text-right">Stop Loss</th>
                  <th className="px-4 py-3 font-medium text-right">Last Price</th>
                  <th className="px-4 py-3 font-medium text-right">Unrealized P&L</th>
                  <th className="px-4 py-3 font-medium text-right">Unrealized P&L %</th>
                  <th className="px-4 py-3 font-medium text-right">Trade Value</th>
                  <th className="px-4 py-3 font-medium text-center">Leverage</th>
                  <th className="px-4 py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {activePositions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-muted-foreground">No active positions</td>
                  </tr>
                ) : (
                  activePositions.map((pos) => {
                    const price = pos.filledPrice || pos.entryPrice;
                    const isBuy = pos.side === "Long";
                    
                    const pnlValue = currentPrice > 0 
                      ? (isBuy ? (currentPrice - price) * pos.positionSize : (price - currentPrice) * pos.positionSize)
                      : 0;
                      
                    const leverage = session?.leverage || 50;
                    const margin = (pos.positionSize * price) / leverage;
                    const pnlPercent = margin > 0 
                      ? (pnlValue / margin) * 100
                      : 0;

                    const pnlColor = pnlValue > 0 ? "text-emerald-500" : pnlValue < 0 ? "text-rose-500" : "";

                    return (
                      <tr key={pos.id} className="border-b border-border/50 hover:bg-muted/30 group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                               <TrendingUp className="h-3 w-3 text-primary" />
                            </div>
                            <span className="font-medium px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                              {session?.asset || "ASSET"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <span className={isBuy ? "text-blue-500" : "text-rose-500"}>
                            {pos.side}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{pos.positionSize}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(price)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(pos.takeProfit)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(pos.stopLoss)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(currentPrice)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-medium ${pnlColor}`}>
                          {formatPnL(pnlValue)} <span className="text-xs font-normal text-muted-foreground ml-0.5">USD</span>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${pnlColor}`}>
                          {pnlPercent > 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatCurrency(pos.positionSize * price)} <span className="text-xs font-normal text-muted-foreground ml-0.5">USD</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                           {session?.leverage || 50}:1
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-secondary" onClick={() => setEditModal({ isOpen: true, order: pos })}>
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-rose-500/20 hover:text-rose-500" onClick={() => handleClosePosition(pos.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="flex-1 overflow-auto m-0 outline-none">
          <div className="min-w-250">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-card border-b z-10 text-xs text-muted-foreground font-medium">
                <tr>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Side</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium text-right">Order Price</th>
                  <th className="px-4 py-3 font-medium text-right">Take Profit</th>
                  <th className="px-4 py-3 font-medium text-right">Stop Loss</th>
                  <th className="px-4 py-3 font-medium text-right">Current Price</th>
                  <th className="px-4 py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground">No pending orders</td>
                  </tr>
                ) : (
                  pendingOrders.map((ord) => (
                    <tr key={ord.id} className="border-b border-border/50 hover:bg-muted/30 group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                               <TrendingUp className="h-3 w-3 text-primary" />
                            </div>
                            <span className="font-medium px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                              {session?.asset || "ASSET"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{ord.orderType}</td>
                        <td className="px-4 py-3 font-medium">
                          <span className={ord.side === "Long" ? "text-blue-500" : "text-rose-500"}>
                            {ord.side}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{ord.positionSize}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(ord.entryPrice)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(ord.takeProfit)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(ord.stopLoss)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(currentPrice)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-secondary" onClick={() => setEditModal({ isOpen: true, order: ord })}>
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-rose-500/20 hover:text-rose-500" onClick={() => handleCancelOrder(ord.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="history" className="m-0 flex-1 overflow-hidden outline-none">
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-border/60 bg-secondary/5 px-3 py-3">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <HistoryStat
                  icon={<Sigma className="h-3.5 w-3.5 shrink-0" />}
                  label="Realized P&L"
                  value={`${formatPnL(historySummary.totalPnl)} USD`}
                  tone={historySummary.totalPnl > 0 ? "positive" : historySummary.totalPnl < 0 ? "negative" : undefined}
                />
                <HistoryStat
                  icon={<Trophy className="h-3.5 w-3.5 shrink-0" />}
                  label="Wins / losses"
                  value={`${historySummary.wins} / ${historySummary.losses}`}
                />
                <HistoryStat
                  icon={<ListOrdered className="h-3.5 w-3.5 shrink-0" />}
                  label="Average trade"
                  value={`${formatPnL(historySummary.averagePnl)} USD`}
                  tone={historySummary.averagePnl > 0 ? "positive" : historySummary.averagePnl < 0 ? "negative" : undefined}
                />
                <HistoryStat
                  icon={<Clock3 className="h-3.5 w-3.5 shrink-0" />}
                  label="Last closed"
                  value={formatTimestamp(historySummary.lastClosedOrder?.closedAt)}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
              {closedPositions.length === 0 ? (
                <div className="flex h-full min-h-48 items-center justify-center p-6">
                  <div className="flex max-w-sm flex-col items-center text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border/70 bg-background">
                      <ListOrdered className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="mt-3 text-sm font-semibold">No closed orders</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      This session has no realized trades yet.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-w-[900px] p-3">
                  <Table className="border-separate border-spacing-0">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 px-3 text-xs text-muted-foreground">Order</TableHead>
                        <TableHead className="h-9 px-3 text-xs text-muted-foreground">Side</TableHead>
                        <TableHead className="h-9 px-3 text-right text-xs text-muted-foreground">Size</TableHead>
                        <TableHead className="h-9 px-3 text-right text-xs text-muted-foreground">Entry</TableHead>
                        <TableHead className="h-9 px-3 text-right text-xs text-muted-foreground">Exit</TableHead>
                        <TableHead className="h-9 px-3 text-right text-xs text-muted-foreground">Realized P&L</TableHead>
                        <TableHead className="h-9 px-3 text-right text-xs text-muted-foreground">Opened</TableHead>
                        <TableHead className="h-9 px-3 text-right text-xs text-muted-foreground">Closed</TableHead>
                        <TableHead className="h-9 px-3 text-right text-xs text-muted-foreground">Held</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedPositions.map((ord) => {
                        const pnlVal = ord.pnl || 0;
                        const pnlColor = pnlVal > 0 ? "text-emerald-500" : pnlVal < 0 ? "text-rose-500" : "";
                        const isLong = ord.side === "Long";
                        const entryPrice = ord.filledPrice ?? ord.entryPrice;
                        const leverage = session?.leverage || 50;
                        const margin = entryPrice ? (ord.positionSize * entryPrice) / leverage : 0;
                        const pnlPercent = margin > 0 ? (pnlVal / margin) * 100 : 0;

                        return (
                          <TableRow key={ord.id} className="group border-b border-border/50 hover:bg-muted/30">
                            <TableCell className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                                    isLong ? "bg-blue-500/10 text-blue-500" : "bg-rose-500/10 text-rose-500"
                                  }`}
                                >
                                  {isLong ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold">{session?.asset || "ASSET"}</div>
                                  <div className="text-xs text-muted-foreground">Order #{ord.id}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                                    isLong
                                      ? "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300"
                                      : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                                  }`}
                                >
                                  {isLong ? (
                                    <ArrowUpRight className="mr-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDownRight className="mr-1 h-3 w-3" />
                                  )}
                                  {ord.side}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-3 text-right tabular-nums">{ord.positionSize}</TableCell>
                            <TableCell className="px-3 py-3 text-right font-mono">{formatCurrency(entryPrice)}</TableCell>
                            <TableCell className="px-3 py-3 text-right font-mono">{formatCurrency(ord.exitPrice)}</TableCell>
                            <TableCell className={`px-3 py-3 text-right font-mono font-semibold ${pnlColor}`}>
                              <div>{formatPnL(pnlVal)} USD</div>
                              <div className="text-xs font-normal text-muted-foreground">
                                {pnlPercent > 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-3 text-right text-muted-foreground">
                              {formatTimestamp(ord.filledAt)}
                            </TableCell>
                            <TableCell className="px-3 py-3 text-right text-muted-foreground">
                              {formatTimestamp(ord.closedAt)}
                            </TableCell>
                            <TableCell className="px-3 py-3 text-right text-muted-foreground">
                              {formatDuration(ord.filledAt, ord.closedAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <EditPositionModal 
        isOpen={editModal.isOpen} 
        order={editModal.order} 
        onClose={() => setEditModal(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}

"use client";

import { useBacktestStore } from "@/lib/backtest-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, X, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { BacktestOrder } from "@/lib/backtest-store";
import { EditPositionModal } from "./edit-position-modal";

interface PositionsPanelProps {
  sessionId: number;
  currentPrice: number;
}

export function PositionsPanel({ sessionId, currentPrice }: PositionsPanelProps) {
  const { session, activePositions, pendingOrders, closedPositions, closeOrder, cancelOrder } = useBacktestStore();
  const [editModal, setEditModal] = useState<{ isOpen: boolean; order: BacktestOrder | null }>({ isOpen: false, order: null });

  const handleClosePosition = async (id: number) => {
    if (!window.confirm("Are you sure you want to close this position?")) return;
    try {
      await closeOrder(id, currentPrice);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelOrder = async (id: number) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await cancelOrder(id);
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null) return "-";
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 5 }).format(val);
  };

  const formatPnL = (val: number) => {
    const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    return val > 0 ? `+${formatted}` : formatted;
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden text-sm">
      <Tabs defaultValue="positions" className="flex flex-col h-full">
        <div className="border-b px-2 pt-2 bg-secondary/10 flex items-end">
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

        <TabsContent value="positions" className="flex-1 overflow-auto m-0 outline-none">
          <div className="min-w-[1000px]">
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
                      
                    const pnlPercent = currentPrice > 0 
                      ? (pnlValue / pos.positionSize) * 100
                      : 0;

                    const pnlColor = pnlValue > 0 ? "text-emerald-500" : pnlValue < 0 ? "text-rose-500" : "";

                    return (
                      <tr key={pos.id} className="border-b border-border/50 hover:bg-muted/30 group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
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
                          {val => val > 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatCurrency(pos.positionSize)} <span className="text-xs font-normal text-muted-foreground ml-0.5">USD</span>
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
          <div className="min-w-[1000px]">
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
                             <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
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

        <TabsContent value="history" className="flex-1 overflow-auto m-0 outline-none">
          <div className="min-w-[1000px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-card border-b z-10 text-xs text-muted-foreground font-medium">
                <tr>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Side</th>
                  <th className="px-4 py-3 font-medium text-right">Size</th>
                  <th className="px-4 py-3 font-medium text-right">Entry Price</th>
                  <th className="px-4 py-3 font-medium text-right">Exit Price</th>
                  <th className="px-4 py-3 font-medium text-right">Realized P&L</th>
                  <th className="px-4 py-3 font-medium text-right">Filled At</th>
                  <th className="px-4 py-3 font-medium text-right">Closed At</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">No closed orders</td>
                  </tr>
                ) : (
                  closedPositions.map((ord) => {
                    const pnlVal = ord.pnl || 0;
                    const pnlColor = pnlVal > 0 ? "text-emerald-500" : pnlVal < 0 ? "text-rose-500" : "";
                    
                    return (
                      <tr key={ord.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-4 py-3">
                            <span className="font-medium px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                              {session?.asset || "ASSET"}
                            </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <span className={ord.side === "Long" ? "text-blue-500" : "text-rose-500"}>
                            {ord.side}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{ord.positionSize}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(ord.filledPrice)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(ord.exitPrice)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-medium ${pnlColor}`}>
                          {formatPnL(pnlVal)} <span className="text-xs font-normal text-muted-foreground ml-0.5">USD</span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                           {ord.filledAt ? format(new Date(ord.filledAt), "MMM dd, HH:mm:ss") : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                           {ord.closedAt ? format(new Date(ord.closedAt), "MMM dd, HH:mm:ss") : "-"}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
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

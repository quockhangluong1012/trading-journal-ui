"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderPanel } from "@/components/backtest/order-panel";
import { PositionsPanel } from "@/components/backtest/positions-panel";
import { useBacktestStore } from "@/lib/backtest-store";
import { BarChart3, ListOrdered } from "lucide-react";

interface BacktestSidebarProps {
  sessionId: number;
  currentPrice: number;
  previousPrice?: number | null;
}

export function BacktestSidebar({
  sessionId,
  currentPrice,
  previousPrice = null,
}: BacktestSidebarProps) {
  const { activePositions, pendingOrders } = useBacktestStore();
  const indicatorCount = activePositions.length + pendingOrders.length;

  return (
    <Tabs defaultValue="trade" className="flex h-full min-h-0 flex-col bg-card">
      <div className="shrink-0 border-b border-border/60 bg-secondary/10 px-3 pt-2">
        <TabsList className="h-9 w-full bg-transparent p-0 justify-start gap-1 rounded-none">
          <TabsTrigger
            value="trade"
            className="rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Trade
          </TabsTrigger>
          <TabsTrigger
            value="positions"
            className="rounded-none border-b-2 border-transparent px-3 pb-2 pt-1 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            <ListOrdered className="mr-1.5 h-3.5 w-3.5" />
            Positions &amp; Orders
            {indicatorCount > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {indicatorCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="trade" className="flex-1 min-h-0 m-0 outline-none">
        <OrderPanel
          sessionId={sessionId}
          currentPrice={currentPrice}
          previousPrice={previousPrice}
        />
      </TabsContent>

      <TabsContent value="positions" className="flex-1 min-h-0 m-0 outline-none">
        <PositionsPanel
          sessionId={sessionId}
          currentPrice={currentPrice}
        />
      </TabsContent>
    </Tabs>
  );
}

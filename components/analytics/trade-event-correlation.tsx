"use client";

import { useEffect, useState } from "react";
import { scannerApi, TradeEventCorrelationDto } from "@/lib/scanner-api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingDown, TrendingUp, AlertTriangle, Zap, Info } from "lucide-react";

export function TradeEventCorrelation() {
  const [data, setData] = useState<TradeEventCorrelationDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setIsLoading(true);
        const result = await scannerApi.getTradeEventCorrelation(30);
        if (mounted) setData(result);
      } catch (e) {
        console.error("Failed to load correlation data:", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-xl border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.totalTradesAnalyzed === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <Calendar className="h-12 w-12 mb-4 opacity-20" />
        <h3 className="text-lg font-medium mb-1">No Correlation Data</h3>
        <p className="text-sm max-w-md">
          Close some trades to see how your performance correlates with economic events.
        </p>
      </div>
    );
  }

  const fmt = (v: number) => `$${v >= 0 ? "+" : ""}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (v: number) => `${v.toFixed(1)}%`;

  const comparisonData = [
    { label: "Near Events", winRate: data.winRateNearEvents, avgPnl: data.avgPnlNearEvents, trades: data.tradesNearEvents },
    { label: "Away from Events", winRate: data.winRateAwayFromEvents, avgPnl: data.avgPnlAwayFromEvents, trades: data.tradesAwayFromEvents },
  ];

  const winRateDiff = data.winRateNearEvents - data.winRateAwayFromEvents;
  const isNewsHurting = winRateDiff < -5;

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <div className={`relative overflow-hidden rounded-xl border p-5 ${
        isNewsHurting
          ? "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/10"
          : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/10"
      }`}>
        <div className={`absolute top-0 left-0 h-full w-1.5 ${isNewsHurting ? "bg-red-500" : "bg-emerald-500"}`} />
        <div className="flex items-start gap-3 pl-2">
          <Info className={`h-5 w-5 mt-0.5 ${isNewsHurting ? "text-red-500" : "text-emerald-500"}`} />
          <div>
            <h3 className="font-semibold text-sm text-foreground">Correlation Summary</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Comparison */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCompare
          label="Win Rate Near News"
          value={pct(data.winRateNearEvents)}
          compare={pct(data.winRateAwayFromEvents)}
          compareLabel="Away"
          isGood={data.winRateNearEvents >= data.winRateAwayFromEvents}
        />
        <MetricCompare
          label="Avg PnL Near News"
          value={fmt(data.avgPnlNearEvents)}
          compare={fmt(data.avgPnlAwayFromEvents)}
          compareLabel="Away"
          isGood={data.avgPnlNearEvents >= data.avgPnlAwayFromEvents}
        />
        <StatCard
          label="Trades Near Events"
          value={data.tradesNearEvents.toString()}
          sub={`${((data.tradesNearEvents / data.totalTradesAnalyzed) * 100).toFixed(0)}% of total`}
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
        />
        <StatCard
          label="Total Impact"
          value={fmt(data.totalPnlNearEvents)}
          sub={`vs ${fmt(data.totalPnlAwayFromEvents)} away`}
          icon={<Zap className="h-4 w-4 text-primary" />}
        />
      </div>

      {/* Proximity Breakdown Chart */}
      {data.proximityBreakdown.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground">Proximity Impact</CardTitle>
            <CardDescription>Win rate by time distance from high-impact events</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ winRate: { label: "Win Rate %", color: "#22c55e" } }} className="h-48">
              <BarChart data={data.proximityBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={40} domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${(v as number).toFixed(1)}%`} />} />
                <Bar dataKey="winRate" radius={[6, 6, 0, 0]}>
                  {data.proximityBreakdown.map((b, i) => (
                    <Cell key={i} fill={b.winRate >= 50 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Event Type Breakdown */}
      {data.eventTypeBreakdown.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground">Performance by Event Type</CardTitle>
            <CardDescription>How your trades perform around specific economic releases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.eventTypeBreakdown.map((evt) => (
                <div key={evt.eventName} className="flex items-center justify-between rounded-xl bg-secondary/20 px-4 py-3 border border-border/40">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">{evt.eventName}</span>
                    <span className="text-xs text-muted-foreground">{evt.tradeCount} trades · {evt.wins}W/{evt.losses}L</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className={`text-sm font-bold ${evt.winRate >= 50 ? "text-emerald-500" : "text-red-500"}`}>
                        {evt.winRate.toFixed(1)}%
                      </span>
                      <span className="block text-[10px] text-muted-foreground">Win Rate</span>
                    </div>
                    <div>
                      <span className={`text-sm font-bold ${evt.avgPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {fmt(evt.avgPnl)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">Avg PnL</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Currency Breakdown */}
      {data.currencyBreakdown.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground">Performance by Currency Event</CardTitle>
            <CardDescription>How your trades perform around events affecting specific currencies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.currencyBreakdown.map((c) => (
                <div key={c.currency} className="rounded-xl bg-secondary/20 border border-border/40 p-3 text-center">
                  <span className="text-lg font-bold text-foreground">{c.currency}</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className={`font-bold ${c.winRate >= 50 ? "text-emerald-500" : "text-red-500"}`}>
                        {c.winRate.toFixed(1)}%
                      </span>
                      <span className="block text-muted-foreground">Win Rate</span>
                    </div>
                    <div>
                      <span className={`font-bold ${c.avgPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {fmt(c.avgPnl)}
                      </span>
                      <span className="block text-muted-foreground">Avg PnL</span>
                    </div>
                  </div>
                  <span className="mt-1 block text-[10px] text-muted-foreground">{c.tradeCount} trades</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCompare({ label, value, compare, compareLabel, isGood }: {
  label: string; value: string; compare: string; compareLabel: string; isGood: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${isGood ? "text-emerald-500" : "text-red-500"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {compareLabel}: <span className="font-medium text-foreground">{compare}</span>
      </p>
      <div className="mt-2 flex items-center gap-1">
        {isGood ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
        <span className={`text-[10px] font-medium ${isGood ? "text-emerald-500" : "text-red-500"}`}>
          {isGood ? "Better" : "Worse"} near events
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: {
  label: string; value: string; sub: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

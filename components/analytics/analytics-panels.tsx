"use client";

import { useCallback } from "react";
import { Pie, PieChart, Cell, Tooltip as ReTooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, Download, Info } from "lucide-react";
import { fmt, pct } from "./metric-card";
import type { AssetBreakdown, Insight, MonthlyReturn, PerformanceSummary } from "@/lib/analytics-api";

const ASSET_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export function AssetPerformanceChart({ data }: { data: AssetBreakdown[] }) {
  if (data.length === 0) return <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">No asset data</div>;
  return (
    <div className="space-y-4">
      <ChartContainer config={{ pnl: { label: "PnL", color: "#22c55e" } }} className="h-50">
        <PieChart>
          <Pie data={data.map((item) => ({ ...item, absPnl: Math.abs(item.pnl) }))} dataKey="absPnl" nameKey="asset" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={ASSET_COLORS[i % ASSET_COLORS.length]} />)}
          </Pie>
          <ReTooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--popover-foreground)" }}
            formatter={(_v, name) => [fmt(data.find((i) => i.asset === String(name))?.pnl ?? 0), String(name)]} />
        </PieChart>
      </ChartContainer>
      <div className="space-y-1.5">
        {data.map((item, i) => (
          <div key={item.asset} className="flex items-center justify-between rounded-xl bg-secondary/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ASSET_COLORS[i % ASSET_COLORS.length] }} />
              <span className="text-xs font-medium text-foreground">{item.asset}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground">{item.count} trades</span>
              <span className="text-[10px] text-muted-foreground">{item.winRate}% WR</span>
              <span className={`text-xs font-medium ${item.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(item.pnl)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  const iconMap = { success: CheckCircle2, warning: AlertTriangle, info: Info };
  const colorMap = {
    success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };
  return (
    <div className="space-y-3">
      {insights.map((insight, i) => {
        const Icon = iconMap[insight.type]; const colors = colorMap[insight.type];
        return (
          <div key={i} className={`rounded-2xl border px-4 py-3.5 shadow-sm ${colors}`}>
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div><p className="text-sm font-semibold">{insight.title}</p><p className="mt-1 text-xs leading-relaxed opacity-80">{insight.description}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LongShortSplit({ analytics }: { analytics: PerformanceSummary }) {
  const rows = [
    { label: "Longs", value: analytics.longsWinRate, barClassName: "bg-emerald-500/80", textClassName: "text-emerald-400" },
    { label: "Shorts", value: analytics.shortsWinRate, barClassName: "bg-red-500/80", textClassName: "text-red-400" },
  ];
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{row.label}</span>
            <span className={`font-semibold ${row.textClassName}`}>{pct(row.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary/60">
            <div className={`h-full rounded-full ${row.barClassName}`} style={{ width: `${Math.max(0, Math.min(row.value, 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SessionBreakdownPlaceholder() {
  return (
    <div className="flex h-50 flex-col items-center justify-center gap-2 text-center">
      <Clock className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">Session analytics are next.</p>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
        Asia, London, and New York splits will appear here once session-based analytics are exposed from the backend.
      </p>
    </div>
  );
}

export function ExportButton({ analytics, monthlyData, assetData, insightsData }: {
  analytics: PerformanceSummary; monthlyData: MonthlyReturn[]; assetData: AssetBreakdown[]; insightsData: Insight[];
}) {
  const handleExport = useCallback(() => {
    const lines = [
      "TRADING ANALYTICS REPORT", `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, "",
      "=== PERFORMANCE SUMMARY ===",
      `Total P&L: ${fmt(analytics.totalPnl)}`, `Win Rate: ${pct(analytics.winRate)}`,
      `Total Trades: ${analytics.totalClosed} (${analytics.wins}W / ${analytics.losses}L)`,
      `Profit Factor: ${analytics.profitFactor.toFixed(2)}`, `Expectancy: ${fmt(analytics.expectancy)}`,
      `Sharpe Ratio: ${analytics.sharpeRatio.toFixed(2)}`, `Max Drawdown: ${fmt(analytics.maxDrawdown)} (${pct(analytics.maxDrawdownPct)})`,
      `Avg Win: ${fmt(analytics.avgWin)}`, `Avg Loss: ${fmt(analytics.avgLoss)}`,
      `Largest Win: ${fmt(analytics.largestWin)}`, `Largest Loss: ${fmt(analytics.largestLoss)}`,
      `Avg Holding: ${analytics.avgHoldingDays.toFixed(1)} days`, `Avg R:R: ${analytics.avgRiskReward.toFixed(2)}:1`,
      `Consecutive Wins: ${analytics.consecutiveWins}`, `Consecutive Losses: ${analytics.consecutiveLosses}`,
      `Longs Win Rate: ${pct(analytics.longsWinRate)}`, `Shorts Win Rate: ${pct(analytics.shortsWinRate)}`, "",
      "=== MONTHLY RETURNS ===", ...monthlyData.map((i) => `${i.month}: ${fmt(i.pnl)}`), "",
      "=== ASSET BREAKDOWN ===", ...assetData.map((i) => `${i.asset}: ${fmt(i.pnl)} (${i.count} trades, ${i.winRate}% WR)`), "",
      "=== INSIGHTS ===", ...insightsData.map((i) => `[${i.type.toUpperCase()}] ${i.title}: ${i.description}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `trading-analytics-${new Date().toISOString().split("T")[0]}.txt`; a.click();
    URL.revokeObjectURL(url);
  }, [analytics, assetData, insightsData, monthlyData]);

  return <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5"><Download className="h-3.5 w-3.5" />Export report</Button>;
}

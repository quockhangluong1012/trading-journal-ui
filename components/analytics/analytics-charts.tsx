"use client";

import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { fmt } from "./metric-card";
import type { EquityPoint, MonthlyReturn, DayOfWeekBreakdown as DayBreakdownType, PerformanceSummary } from "@/lib/analytics-api";

export function EquityCurveChart({ data }: { data: EquityPoint[] }) {
  if (data.length === 0) return <div className="flex h-70 items-center justify-center text-sm text-muted-foreground">No closed trades in this period</div>;
  return (
    <ChartContainer config={{ profit: { label: "Equity", color: "#22c55e" } }} className="h-70">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(v as number)} labelFormatter={(l) => new Date(l).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />} />
        <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fill="url(#eqGrad)" />
      </AreaChart>
    </ChartContainer>
  );
}

export function MonthlyReturnsChart({ data }: { data: MonthlyReturn[] }) {
  if (data.length === 0) return <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">No monthly data yet</div>;
  return (
    <ChartContainer config={{ pnl: { label: "PnL", color: "#22c55e" } }} className="h-60">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="month" tickFormatter={(v) => { const [y, m] = v.split("-"); return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number.parseInt(m,10)-1]} '${y.slice(2)}`; }} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(v as number)} />} />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]} fill="#22c55e">{data.map((item, i) => <Cell key={i} fill={item.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />)}</Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function DrawdownChart({ equityData }: { equityData: EquityPoint[] }) {
  const data = useMemo(() => { let peak = 0; return equityData.map((p) => { if (p.profit > peak) peak = p.profit; return { date: p.date, drawdown: -(peak - p.profit) }; }); }, [equityData]);
  if (data.length === 0) return <div className="flex h-50 items-center justify-center text-sm text-muted-foreground">No drawdown data</div>;
  return (
    <ChartContainer config={{ drawdown: { label: "Drawdown", color: "#ef4444" } }} className="h-50">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs><linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(v as number)} />} />
        <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} fill="url(#ddGrad)" />
      </AreaChart>
    </ChartContainer>
  );
}

export function WinLossDistribution({ equityData }: { equityData: EquityPoint[] }) {
  const data = useMemo(() => {
    const pnls: number[] = [];
    for (let i = 0; i < equityData.length; i++) pnls.push(i === 0 ? equityData[i].profit : equityData[i].profit - equityData[i - 1].profit);
    const step = 1000; const buckets: Record<string, number> = {};
    pnls.forEach((pnl) => { const b = Math.floor(pnl / step) * step; const key = `${b >= 0 ? "+" : ""}${b}`; buckets[key] = (buckets[key] || 0) + 1; });
    return Object.entries(buckets).map(([range, count]) => ({ range, count, pnl: Number.parseInt(range, 10) })).sort((a, b) => a.pnl - b.pnl);
  }, [equityData]);
  if (data.length === 0) return <div className="flex h-50 items-center justify-center text-sm text-muted-foreground">No distribution data</div>;
  return (
    <ChartContainer config={{ count: { label: "Trades", color: "#22c55e" } }} className="h-50">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="range" tick={{ fill: "#9ca3af", fontSize: 9 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>{data.map((item, i) => <Cell key={i} fill={item.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />)}</Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function DayOfWeekChart({ data }: { data: DayBreakdownType[] }) {
  return (
    <ChartContainer config={{ pnl: { label: "PnL", color: "#22c55e" } }} className="h-50">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#374151" }} />
        <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={55} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(v as number)} />} />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{data.map((item, i) => <Cell key={i} fill={item.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />)}</Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function PerformanceRadar({ analytics }: { analytics: PerformanceSummary }) {
  const data = useMemo(() => [
    { metric: "Win Rate", value: Math.min(analytics.winRate, 100), fullMark: 100 },
    { metric: "Profit Factor", value: Math.min(analytics.profitFactor * 25, 100), fullMark: 100 },
    { metric: "R:R Ratio", value: Math.min(analytics.avgRiskReward * 20, 100), fullMark: 100 },
    { metric: "Sharpe", value: Math.min(Math.max(analytics.sharpeRatio * 25, 0), 100), fullMark: 100 },
    { metric: "Consistency", value: Math.min(100 - analytics.maxDrawdownPct, 100), fullMark: 100 },
    { metric: "Discipline", value: Math.min(analytics.consecutiveWins * 15 + 30, 100), fullMark: 100 },
  ], [analytics]);
  return (
    <ChartContainer config={{ value: { label: "Score", color: "#22c55e" } }} className="h-65">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#374151" /><PolarAngleAxis dataKey="metric" tick={{ fill: "#9ca3af", fontSize: 10 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Performance" dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
      </RadarChart>
    </ChartContainer>
  );
}

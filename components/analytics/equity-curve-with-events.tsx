"use client";

import { useEffect, useMemo, useState } from "react";
import { scannerApi, EquityCurveWithEventsDto, EquityEventOverlayPointDto } from "@/lib/scanner-api";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Calendar, TrendingUp, Newspaper } from "lucide-react";

export function EquityCurveWithEvents() {
  const [data, setData] = useState<EquityCurveWithEventsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setIsLoading(true);
        const result = await scannerApi.getEquityCurveWithEvents();
        if (mounted) setData(result);
      } catch (e) {
        console.error("Failed to load equity curve with events:", e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.equityPoints.map((p) => ({
      date: p.date,
      profit: p.profit,
      hasEvent: p.eventMarkers.length > 0,
      eventCount: p.eventMarkers.length,
      events: p.eventMarkers,
    }));
  }, [data]);

  // Get unique event dates for reference lines
  const eventDates = useMemo(() => {
    if (!data || !showEvents) return [];
    return data.allHighImpactEvents.map((e) => ({
      date: e.eventDateUtc,
      name: e.eventName,
      currency: e.currency,
    }));
  }, [data, showEvents]);

  if (isLoading) {
    return <div className="flex h-70 items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!data || chartData.length === 0) {
    return <div className="flex h-70 items-center justify-center text-sm text-muted-foreground">No data available</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            {data.totalTrades} trades
          </span>
          <span className="flex items-center gap-1.5">
            <Newspaper className="h-3.5 w-3.5 text-amber-500" />
            {data.highImpactEventsInPeriod} high-impact events
          </span>
        </div>
        <button
          onClick={() => setShowEvents(!showEvents)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
            showEvents
              ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
              : "bg-secondary/40 text-muted-foreground border-border/60 hover:bg-secondary/60"
          }`}
        >
          <Calendar className="h-3 w-3" />
          {showEvents ? "Events ON" : "Events OFF"}
        </button>
      </div>

      <ChartContainer
        config={{
          profit: { label: "Equity", color: "#22c55e" },
        }}
        className="h-70"
      >
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eqEvtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
          />
          <YAxis
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            tick={{ fill: "#9ca3af", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <ChartTooltip content={<EventTooltip />} />

          {/* Event reference lines */}
          {showEvents && eventDates.map((evt, i) => (
            <ReferenceLine
              key={`evt-${i}`}
              x={evt.date}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              strokeWidth={1.5}
            />
          ))}

          <Area
            type="monotone"
            dataKey="profit"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#eqEvtGrad)"
            dot={(props: any) => {
              if (!showEvents || !props.payload?.hasEvent) return <></>;
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill="#f59e0b"
                  stroke="#fff"
                  strokeWidth={2}
                  className="drop-shadow-sm"
                />
              );
            }}
          />
        </AreaChart>
      </ChartContainer>

      {/* Legend */}
      {showEvents && (
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground justify-center">
          <span className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-emerald-500 rounded" />
            Equity Curve
          </span>
          <span className="flex items-center gap-1.5">
            <div className="h-3 w-0.5 bg-amber-500 rounded border-dashed" />
            News Event
          </span>
          <span className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500 border border-white" />
            Trade on News Day
          </span>
        </div>
      )}
    </div>
  );
}

function EventTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  const profit = data?.profit ?? 0;
  const events = data?.events ?? [];
  const dateStr = label ? new Date(label).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }) : "";

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg min-w-[200px]">
      <p className="text-xs text-muted-foreground mb-1">{dateStr}</p>
      <p className={`text-sm font-bold ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
        Equity: ${profit >= 0 ? "+" : ""}{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>

      {events.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/60 space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-500 flex items-center gap-1">
            <Newspaper className="h-3 w-3" /> Events on this day
          </p>
          {events.map((evt: any, i: number) => (
            <div key={i} className="text-xs">
              <span className="font-medium text-foreground">{evt.eventName}</span>
              <span className="text-muted-foreground ml-1">({evt.currency})</span>
              {evt.actual != null && (
                <span className="ml-1 text-muted-foreground">
                  A: {evt.actual} {evt.forecast != null && `F: ${evt.forecast}`}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

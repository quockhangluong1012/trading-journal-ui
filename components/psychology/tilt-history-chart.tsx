"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { getTiltHistory, type TiltScore } from "@/lib/tilt-api";

interface ChartDataPoint {
  date: string;
  score: number;
  level: string;
  circuitBreaker: boolean;
}

export function TiltHistoryChart({ days = 30 }: { days?: number }) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const history = await getTiltHistory(days);
        const chartData: ChartDataPoint[] = history.map((s: TiltScore) => ({
          date: new Date(s.recordedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          score: s.score,
          level: s.level,
          circuitBreaker: s.circuitBreakerTriggered,
        }));
        setData(chartData);
      } catch {
        // Silently handle
      } finally {
        setIsLoading(false);
      }
    }
    fetch();
  }, [days]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="h-4 w-4" />
            Tilt History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="h-4 w-4" />
            Tilt History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No tilt data yet. Tilt scores are recorded when you close trades.</p>
        </CardContent>
      </Card>
    );
  }

  const getAreaColor = (score: number) => {
    if (score <= 20) return "#10b981";
    if (score <= 40) return "#eab308";
    if (score <= 60) return "#f97316";
    if (score <= 80) return "#ef4444";
    return "#b91c1c";
  };

  const latestScore = data[data.length - 1]?.score ?? 0;
  const areaColor = getAreaColor(latestScore);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Activity className="h-4 w-4" />
          Tilt History — Last {days} Days
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tiltGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={areaColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number, _name: string) => {
                const level =
                  value <= 20 ? "Calm" :
                  value <= 40 ? "Elevated" :
                  value <= 60 ? "Warning" :
                  value <= 80 ? "High" : "Critical";
                return [`${value}/100 (${level})`, "Tilt Score"];
              }}
            />

            {/* Danger zone background */}
            <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.05} />

            {/* Circuit breaker threshold line */}
            <ReferenceLine
              y={70}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: "Circuit Breaker (70)",
                position: "insideTopRight",
                style: { fontSize: 10, fill: "#ef4444" },
              }}
            />

            <Area
              type="monotone"
              dataKey="score"
              stroke={areaColor}
              strokeWidth={2}
              fill="url(#tiltGradient)"
              dot={(props: { cx: number; cy: number; payload: ChartDataPoint }) => {
                if (props.payload.circuitBreaker) {
                  return (
                    <circle
                      key={`dot-${props.cx}-${props.cy}`}
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill="#ef4444"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }
                return <circle key={`dot-${props.cx}-${props.cy}`} cx={0} cy={0} r={0} fill="none" />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

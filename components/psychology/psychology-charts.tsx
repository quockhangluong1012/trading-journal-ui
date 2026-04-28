"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Brain, Calendar, TrendingUp } from "lucide-react";
import { getTagCategory } from "@/lib/trade-store";
import { api } from "@/lib/api";
import { PsychologyChartState, SURFACE_CARD_CLASS } from "./psychology-stats";

// --- Emotion Frequency Chart ---
export function EmotionFrequencyChart() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get("/v1/dashboard/emotion-frequency")
      .then((res) => {
        if (res.data.isSuccess) {
          const mapped = res.data.value.map((item: any) => {
            const category = getTagCategory(item.label);
            return {
              name: item.label,
              count: item.count,
              fill:
                category === "positive"
                  ? "#22c55e"
                  : category === "negative"
                    ? "#ef4444"
                    : "#3b82f6",
            };
          });
          setData(mapped);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const chartConfig = {
    count: { label: "Frequency", color: "#22c55e" },
  };

  return (
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">
          Emotion Frequency
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          How often each emotion appears across trades
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PsychologyChartState
            icon={Brain}
            message="Loading emotion frequency."
            isLoading
          />
        ) : data.length === 0 ? (
          <PsychologyChartState
            icon={Brain}
            message="No emotion data yet. Tag emotions when creating trades to build this view."
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-62.5">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#374151" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// --- Emotion vs Win Rate Chart ---
export function EmotionWinRateChart() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get("/v1/dashboard/emotion-win-rate")
      .then((res) => {
        if (res.data.isSuccess) {
          const mapped = res.data.value.map((item: any) => {
            const category = getTagCategory(item.label);
            return {
              name: item.label,
              winRate: item.winRate,
              total: item.total,
              fill:
                category === "positive"
                  ? "#22c55e"
                  : category === "negative"
                    ? "#ef4444"
                    : "#3b82f6",
            };
          });
          setData(mapped);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const chartConfig = {
    winRate: { label: "Win Rate %", color: "#22c55e" },
  };

  return (
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">
          Emotion vs Win Rate
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          How emotions correlate with trade outcomes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PsychologyChartState
            icon={TrendingUp}
            message="Loading emotion win rates."
            isLoading
          />
        ) : data.length === 0 ? (
          <PsychologyChartState
            icon={TrendingUp}
            message="Need closed trades with emotion tags before this analysis can surface a signal."
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-62.5">
            <BarChart
              data={data}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#374151" }}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                width={45}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(value) => `${value}%`} />
                }
              />
              <Bar dataKey="winRate" radius={[4, 4, 0, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// --- Mood Trend Chart ---
export function MoodTrendChart() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get("/v1/dashboard/mood-confidence-trend")
      .then((res) => {
        if (res.data.isSuccess) {
          setData(res.data.value);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const chartConfig = {
    mood: { label: "Mood", color: "#8b5cf6" },
    confidence: { label: "Confidence", color: "#22c55e" },
  };

  return (
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">
          Mood &amp; Confidence Trend
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Your mental state over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PsychologyChartState
            icon={Calendar}
            message="Loading mood trend."
            isLoading
          />
        ) : data.length === 0 ? (
          <PsychologyChartState
            icon={Calendar}
            message="Add journal entries to track your mood and confidence over time."
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-62.5">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#374151" }}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="mood"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#moodGradient)"
                name="Mood"
              />
              <Area
                type="monotone"
                dataKey="confidence"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#confGradient)"
                name="Confidence"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// --- Emotion Distribution Chart ---
export function EmotionDistributionChart() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .get("/v1/dashboard/emotion-distribution")
      .then((res) => {
        if (res.data.isSuccess) {
          setData(res.data.value);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const chartConfig = {
    positive: { label: "Positive", color: "#22c55e" },
    negative: { label: "Negative", color: "#ef4444" },
    neutral: { label: "Neutral", color: "#3b82f6" },
  };

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">
          Emotion Distribution
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Balance of positive, negative, and neutral emotions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PsychologyChartState
            icon={Brain}
            message="Loading emotion mix."
            isLoading
          />
        ) : data.length === 0 ? (
          <PsychologyChartState
            icon={Brain}
            message="No emotion distribution yet. Save tagged reflections to reveal your mix."
          />
        ) : (
          <div className="flex flex-col items-center">
            <ChartContainer config={chartConfig} className="h-50 w-full">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex items-center gap-6 pt-2">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.fill }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {d.name}{" "}
                    {total > 0 ? `${Math.round((d.value / total) * 100)}%` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

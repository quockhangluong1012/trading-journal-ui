"use client"

import { useState, useMemo, useEffect } from "react"
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
  Tooltip,
} from "recharts"
import { Header } from "@/components/header"
import { useTrades } from "@/lib/trade-context"
import {
  type EmotionTagApi,
  getTagCategory,
} from "@/lib/trade-store"

export interface ApiJournalEntry {
  id: number;
  date: string;
  todayTradingReview: string;
  overallMood: number;
  confidentLevel: number;
  emotionTags: { id: number; name: string }[];
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Brain,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  Flame,
  Loader2,
} from "lucide-react"
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast"

// --- Stats Cards ---
function PsychologyStats({ statsData }: { statsData: { avgConfidence: number; topEmotion: string | null; psychologyScore: number; journalEntries: number; } | null }) {
  const topEmotionCategory = statsData?.topEmotion ? getTagCategory(statsData.topEmotion) : null
  const psychScorePercent = statsData?.psychologyScore != null ? Math.round(statsData.psychologyScore * 100) : null;

  const cards = [
    {
      title: "Avg Confidence",
      value: statsData?.avgConfidence && statsData.avgConfidence > 0 ? statsData.avgConfidence.toFixed(1) : "-",
      subtitle: "out of 5",
      icon: Shield,
      color: "text-primary",
    },
    {
      title: "Top Emotion",
      value: statsData?.topEmotion || "-",
      subtitle: statsData?.topEmotion ? `most frequent` : "no data",
      icon: Brain,
      color: statsData?.topEmotion
        ? topEmotionCategory === "positive"
          ? "text-emerald-400"
          : topEmotionCategory === "negative"
            ? "text-red-400"
            : "text-blue-400"
        : "text-muted-foreground",
    },
    {
      title: "Psychology Score",
      value: psychScorePercent != null && psychScorePercent > 0 ? `${psychScorePercent}%` : "-",
      subtitle: "positive ratio",
      icon: TrendingUp,
      color:
        psychScorePercent != null && psychScorePercent >= 60
          ? "text-emerald-400"
          : psychScorePercent != null && psychScorePercent >= 40
            ? "text-yellow-400"
            : "text-red-400",
    },
    {
      title: "Journal Entries",
      value: statsData?.journalEntries || 0,
      subtitle: "total logged",
      icon: FileText,
      color: "text-accent",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </div>
              <card.icon className={`h-5 w-5 ${card.color} opacity-60`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// --- Emotion Frequency Chart ---
function EmotionFrequencyChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    api.get("/v1/dashboard/emotion-frequency")
      .then((res) => {
        if (res.data.isSuccess) {
          const mapped = res.data.value.map((item: any) => {
            const category = getTagCategory(item.label)
            return {
              name: item.label,
              count: item.count,
              fill:
                category === "positive"
                  ? "#22c55e"
                  : category === "negative"
                    ? "#ef4444"
                    : "#3b82f6",
            }
          })
          setData(mapped)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false))
  }, [])

  const chartConfig = {
    count: { label: "Frequency", color: "#22c55e" },
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">Emotion Frequency</CardTitle>
        <CardDescription className="text-muted-foreground">
          How often each emotion appears across trades
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No emotion data yet. Tag emotions when creating trades.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px]">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
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
                  <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// --- Emotion vs Win Rate Chart ---
function EmotionWinRateChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    api.get("/v1/dashboard/emotion-win-rate")
      .then((res) => {
        if (res.data.isSuccess) {
          const mapped = res.data.value.map((item: any) => {
            const category = getTagCategory(item.label)
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
            }
          })
          setData(mapped)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false))
  }, [])

  const chartConfig = {
    winRate: { label: "Win Rate %", color: "#22c55e" },
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">Emotion vs Win Rate</CardTitle>
        <CardDescription className="text-muted-foreground">
          How emotions correlate with trade outcomes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Need closed trades with emotion tags for this analysis.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px]">
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
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
                  <ChartTooltipContent
                    formatter={(value) => `${value}%`}
                  />
                }
              />
              <Bar dataKey="winRate" radius={[4, 4, 0, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// --- Mood Trend Chart ---
function MoodTrendChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    api.get("/v1/dashboard/mood-confidence-trend")
      .then((res) => {
        if (res.data.isSuccess) {
          setData(res.data.value)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false))
  }, [])

  const chartConfig = {
    mood: { label: "Mood", color: "#8b5cf6" },
    confidence: { label: "Confidence", color: "#22c55e" },
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">Mood & Confidence Trend</CardTitle>
        <CardDescription className="text-muted-foreground">
          Your mental state over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Add journal entries to track your mood over time.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px]">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
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
  )
}

// --- Emotion Distribution Chart ---
function EmotionDistributionChart() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    api.get("/v1/dashboard/emotion-distribution")
      .then((res) => {
        if (res.data.isSuccess) {
          setData(res.data.value)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false))
  }, [])

  const chartConfig = {
    positive: { label: "Positive", color: "#22c55e" },
    negative: { label: "Negative", color: "#ef4444" },
    neutral: { label: "Neutral", color: "#3b82f6" },
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">Emotion Distribution</CardTitle>
        <CardDescription className="text-muted-foreground">
          Balance of positive, negative, and neutral emotions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            No emotion data yet.
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
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
                    {d.name} {total > 0 ? `${Math.round((d.value / total) * 100)}%` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Psychology Heatmap ---
function PsychologyHeatmap() {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    api.get("/v1/dashboard/psychology-heatmap")
      .then((res) => {
        if (res.data.isSuccess) {
          setData(res.data.value)
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading || data.length === 0) {
    return (
      <Card className="border-border bg-card lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Flame className="h-5 w-5 text-amber-400" />
            Psychology Heatmap
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Emotion vs PnL correlation across your closed trades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            {isLoading ? "Loading..." : "Need closed trades with emotion tags for this analysis."}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find max absolute PnL for scaling
  const maxAbsPnl = Math.max(...data.map((d) => Math.abs(d.avgPnl)), 1)

  // Color scale: deep red for most negative, deep green for most positive
  const getHeatColor = (avgPnl: number) => {
    const ratio = avgPnl / maxAbsPnl // -1 to 1
    if (ratio > 0.5) return { bg: "bg-emerald-500/30", border: "border-emerald-500/40", text: "text-emerald-400" }
    if (ratio > 0.15) return { bg: "bg-emerald-500/15", border: "border-emerald-500/25", text: "text-emerald-400" }
    if (ratio > -0.15) return { bg: "bg-secondary/40", border: "border-border", text: "text-muted-foreground" }
    if (ratio > -0.5) return { bg: "bg-red-500/15", border: "border-red-500/25", text: "text-red-400" }
    return { bg: "bg-red-500/30", border: "border-red-500/40", text: "text-red-400" }
  }

  return (
    <Card className="border-border bg-card lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Flame className="h-5 w-5 text-amber-400" />
          Psychology Heatmap
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Emotion vs PnL correlation &mdash; identify which states produce the best and worst outcomes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-4 flex items-center justify-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">Loss</span>
          <div className="h-2.5 w-6 rounded-sm bg-red-500/30" />
          <div className="h-2.5 w-6 rounded-sm bg-red-500/15" />
          <div className="h-2.5 w-6 rounded-sm bg-secondary/40" />
          <div className="h-2.5 w-6 rounded-sm bg-emerald-500/15" />
          <div className="h-2.5 w-6 rounded-sm bg-emerald-500/30" />
          <span className="text-[10px] text-muted-foreground ml-1">Profit</span>
        </div>

        {/* Heatmap Grid */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => {
            const heat = getHeatColor(item.avgPnl)
            const category = getTagCategory(item.label)
            return (
              <div
                key={item.id}
                className={`rounded-lg border ${heat.border} ${heat.bg} p-3 transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                        category === "positive"
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                          : category === "negative"
                            ? "border-red-500/25 bg-red-500/10 text-red-400"
                            : "border-blue-500/25 bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {category}
                    </span>
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className={`text-lg font-bold ${heat.text}`}>
                      {item.avgPnl >= 0 ? "+" : ""}${item.avgPnl.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">avg PnL / trade</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
                        <TrendingUp className="h-2.5 w-2.5" />{item.wins}W
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-red-400">
                        <TrendingDown className="h-2.5 w-2.5" />{item.losses}L
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.winRate}% win rate &middot; {item.count} trades
                    </p>
                  </div>
                </div>
                {/* Mini bar showing win vs loss ratio */}
                <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-secondary/50">
                  {item.count > 0 && (
                    <>
                      <div
                        className="h-full bg-emerald-500/60"
                        style={{ width: `${item.winRate}%` }}
                      />
                      <div
                        className="h-full bg-red-500/60"
                        style={{ width: `${100 - item.winRate}%` }}
                      />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary Insights */}
        {data.length >= 2 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Most Profitable State</span>
              </div>
              <p className="mt-1 text-sm font-bold text-foreground">{data[0].label}</p>
              <p className="text-xs text-muted-foreground">
                +${data[0].avgPnl.toLocaleString()} avg PnL across {data[0].count} trades
              </p>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-red-400">Most Costly State</span>
              </div>
              <p className="mt-1 text-sm font-bold text-foreground">{data[data.length - 1].label}</p>
              <p className="text-xs text-muted-foreground">
                {data[data.length - 1].avgPnl >= 0 ? "+" : ""}${data[data.length - 1].avgPnl.toLocaleString()} avg PnL across {data[data.length - 1].count} trades
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Journal Entry Card ---
function JournalEntryCard({
  entry,
  onDelete,
}: {
  entry: ApiJournalEntry
  onDelete: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const moodLabels = ["", "Very Low", "Low", "Neutral", "Good", "Excellent"]
  const moodColors = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-emerald-400", "text-emerald-300"]

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15">
            <span className="text-sm font-bold text-accent">{entry.overallMood}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {new Date(entry.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className={`text-xs font-medium ${moodColors[entry.overallMood] || "text-muted-foreground"}`}>
              {moodLabels[entry.overallMood] || "Unknown"} Mood
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse entry" : "Expand entry"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(entry.id)}
            aria-label="Delete entry"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tags */}
      {entry.emotionTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.emotionTags.map((tag) => {
            const label = tag.name ? tag.name : "Unknown Tag"
            
            const colorMap = {
              positive: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
              negative: "bg-red-500/15 text-red-400 border-red-500/25",
              neutral: "bg-blue-500/15 text-blue-400 border-blue-500/25",
            }
            
            const category = getTagCategory(label)
            const colorClass = colorMap[category]

            return (
              <span
                key={tag.id}
                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${colorClass}`}
              >
                {label}
              </span>
            )
          })}
        </div>
      )}

      {/* Journal excerpt or full text */}
      <div className="mt-3">
        <p className="text-sm leading-relaxed text-foreground/80">
          {expanded ? entry.todayTradingReview : entry.todayTradingReview?.length > 150 ? `${entry.todayTradingReview.slice(0, 150)}...` : entry.todayTradingReview}
        </p>
        {!expanded && entry.todayTradingReview?.length > 150 && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-1 text-xs font-medium text-accent hover:underline"
          >
            Read more
          </button>
        )}
      </div>

      {/* Confidence */}
      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Confidence:</span>
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1.5 w-1.5 rounded-full ${
              entry.confidentLevel >= level ? "bg-primary" : "bg-secondary"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function NewEntryForm({ apiTags, onSave, onCancel }: { apiTags: EmotionTagApi[]; onSave: () => void; onCancel: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [overallMood, setOverallMood] = useState(3)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [confidenceLevel, setConfidenceLevel] = useState(3)
  const [journalEntry, setJournalEntry] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const toggleTag = (id: string) => {
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  const handleSave = async () => {
    if (!journalEntry.trim()) return

    setIsSubmitting(true)
    try {
      const payload = {
        date: new Date(date).toISOString(),
        todayTradingReview: journalEntry.trim(),
        overallMood,
        confidentLevel: confidenceLevel,
        emotionTags: selectedTags.map(Number)
      }

      const res = await api.post("/v1/psychology-journals", payload);
      const data = await res.data
      
      if (data.isSuccess) {
        toast({
          title: "Entry saved",
          description: "Your psychology journal entry has been saved.",
        })
        onSave()
      } else {
        toast({
          title: "Failed to save",
          description: "There was an error saving your entry.",
          variant: "destructive",
        })
        console.error("Failed to save journal:", data.errors)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving.",
        variant: "destructive",
      })
      console.error("Error saving journal:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Date */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {/* Overall Mood */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Overall Mood</Label>
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setOverallMood(level)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition-all ${
                overallMood === level
                  ? "border-accent bg-accent/20 text-accent ring-2 ring-accent/30"
                  : overallMood >= level
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border bg-secondary/50 text-muted-foreground hover:border-accent/30"
              }`}
            >
              {level}
            </button>
          ))}
          <span className="text-xs text-muted-foreground">
            {overallMood === 1 && "Very Low"}
            {overallMood === 2 && "Low"}
            {overallMood === 3 && "Neutral"}
            {overallMood === 4 && "Good"}
            {overallMood === 5 && "Excellent"}
          </span>
        </div>
      </div>

      {/* Emotion Tags */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Emotions</Label>
        {(["positive", "negative", "neutral"] as const).map((category) => (
          <div key={category} className="space-y-1.5">
            <span className="text-xs font-medium capitalize text-muted-foreground">{category}</span>
            <div className="flex flex-wrap gap-2">
              {apiTags.filter((t) => getTagCategory(t.name) === category).map((tag) => {
                const isSelected = selectedTags.includes(tag.id.toString())
                const colorMap = {
                  positive: isSelected
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30"
                    : "bg-secondary/50 text-muted-foreground border-border hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30",
                  negative: isSelected
                    ? "bg-red-500/20 text-red-400 border-red-500/40 ring-1 ring-red-500/30"
                    : "bg-secondary/50 text-muted-foreground border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30",
                  neutral: isSelected
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30"
                    : "bg-secondary/50 text-muted-foreground border-border hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30",
                }
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id.toString())}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${colorMap[category]}`}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Confidence */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Confidence Level</Label>
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setConfidenceLevel(level)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition-all ${
                confidenceLevel >= level
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Journal */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Journal Entry</Label>
        <Textarea
          placeholder="How was your trading day? What went well? What could you improve?"
          value={journalEntry}
          onChange={(e) => setJournalEntry(e.target.value)}
          rows={5}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!journalEntry.trim() || isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Saving..." : "Save Entry"}
        </Button>
      </div>
    </div>
  )
}

function PsychologyContent() {
  const { trades } = useTrades()
  const [newEntryOpen, setNewEntryOpen] = useState(false)
  const [apiTags, setApiTags] = useState<EmotionTagApi[]>([])
  const [journalEntries, setJournalEntries] = useState<ApiJournalEntry[]>([])
  const [isLoadingJournals, setIsLoadingJournals] = useState(true)
  const { toast } = useToast()
  const [statsData, setStatsData] = useState<{
    avgConfidence: number;
    topEmotion: string | null;
    psychologyScore: number;
    journalEntries: number;
  } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await api.get("/v1/dashboard/statistic");
      if (res.data.isSuccess) {
        setStatsData(res.data.value)
      }
    } catch (err) {
      console.error("Failed to fetch psychology stats:", err)
    }
  }

  const fetchJournals = async () => {
    setIsLoadingJournals(true)
    try {
      const res = await api.post("/v1/psychology-journals/search", {
        page: 1,
        pageSize: 10,
        overallMood: null,
        confidentLevel: null,
        emotionTags: null
      })
      const data = res.data
      if (data.isSuccess) {
        setJournalEntries(data.value.values)
      }
    } catch (err) {
      console.error("Failed to fetch journals:", err)
    } finally {
      setIsLoadingJournals(false)
    }
  }

  useEffect(() => {
    api
      .get("/v1/emotions")
      .then((res) => res.data)
      .then((data) => {
        if (data.isSuccess) setApiTags(data.value);
      })
      .catch((err) => console.error("Failed to fetch API tags:", err));

    fetchJournals()
    fetchStats()
  }, [])

  const handleDeleteEntry = async (id: number) => {
    try {
      await api.delete(`/v1/psychology-journals/${id}`);
      toast({
        title: "Entry deleted",
        description: "The journal entry was successfully removed.",
      })
      fetchJournals()
      fetchStats()
    } catch (err) {
      toast({
        title: "Failed to delete",
        description: "There was an error deleting your entry.",
        variant: "destructive",
      })
      console.error("Failed to delete journal:", err)
    }
  }
  
  const handleExport = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      psychologyEntries: journalEntries,
      tradeEmotionData: trades
        .filter((t) => t.emotionTags?.length || t.confidenceLevel || t.psychologyNotes)
        .map((t) => ({
          tradeId: t.id,
          asset: t.asset,
          date: t.date,
          emotionTags: t.emotionTags,
          confidenceLevel: t.confidenceLevel,
          psychologyNotes: t.psychologyNotes,
          pnl: t.pnl,
          status: t.status,
        })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trading-psychology-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveEntry = () => {
    setNewEntryOpen(false)
    fetchJournals()
    fetchStats()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trading Psychology</h1>
            <p className="text-muted-foreground">
              Track your emotions, journal your mindset, and discover patterns
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export Data
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setNewEntryOpen(true)}>
              <Plus className="h-4 w-4" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <PsychologyStats statsData={statsData} />

        {/* Charts Grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <EmotionFrequencyChart />
          <EmotionWinRateChart />
          <MoodTrendChart />
          <EmotionDistributionChart />
          <PsychologyHeatmap />
        </div>

        {/* Journal Section */}
        <div className="mt-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-foreground">Psychology Journal</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Your daily trading mindset entries
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setNewEntryOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingJournals ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm font-medium text-muted-foreground">Loading entries...</p>
                </div>
              ) : journalEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No journal entries yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start journaling to track your mental state and improve your trading psychology.
                  </p>
                  <Button size="sm" className="mt-4 gap-2" onClick={() => setNewEntryOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Create First Entry
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {journalEntries.map((entry) => (
                    <JournalEntryCard
                      key={entry.id}
                      entry={entry}
                      onDelete={handleDeleteEntry}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* New Entry Dialog */}
        <Dialog open={newEntryOpen} onOpenChange={setNewEntryOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Psychology Entry</DialogTitle>
              <DialogDescription>
                Log your emotional state and reflect on your trading mindset.
              </DialogDescription>
            </DialogHeader>
            <NewEntryForm
              apiTags={apiTags}
              onSave={handleSaveEntry}
              onCancel={() => setNewEntryOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

export default function PsychologyPage() {
  return <PsychologyContent />
}

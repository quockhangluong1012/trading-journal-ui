"use client"

import { type ElementType, useEffect, useMemo, useState } from "react"
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
} from "recharts"
import { Header } from "@/components/header"
import { PsychologyCommandCenter } from "@/components/psychology/psychology-command-center"
import { useTrades } from "@/lib/trade-context"
import {
  type EmotionTagApi,
  getTagCategory,
} from "@/lib/trade-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Brain,
  Calendar,
  Lightbulb,
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
import { type ApiPaginatedResponse, api } from "@/lib/api"
import {
  buildPsychologyNarrative,
  buildPsychologyPulse,
  filterJournalEntries,
  type PsychologyJournalFilter,
  type PsychologyStatsSnapshot,
} from "@/lib/psychology-overview"
import {
  getPlainTextFromRichText,
  getRichTextPreview,
  normalizeRichTextValue,
} from "@/lib/rich-text"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

const SURFACE_CARD_CLASS = "border-border/70 bg-card/95 shadow-sm"
const JOURNAL_ARCHIVE_PAGE_SIZE = 10
const JOURNAL_FETCH_PAGE_SIZE = 100
const PSYCHOLOGY_TABS = ["overview", "journal", "patterns"] as const
const PSYCHOLOGY_TAB_STORAGE_KEY = "trading-journal-psychology-tab"
const JOURNAL_FILTERS: ReadonlyArray<{
  value: PsychologyJournalFilter
  label: string
}> = [
  { value: "all", label: "All entries" },
  { value: "recent", label: "Recent" },
  { value: "high-confidence", label: "High confidence" },
  { value: "needs-reset", label: "Needs reset" },
]
const moodLabels = ["", "Very Low", "Low", "Neutral", "Good", "Excellent"]
const confidenceLabels = ["", "Fragile", "Tentative", "Balanced", "Strong", "Locked in"]

type PsychologyTabValue = (typeof PSYCHOLOGY_TABS)[number]

export interface ApiJournalEntry {
  id: number
  date: string
  todayTradingReview: string
  overallMood: number
  confidentLevel: number
  emotionTags: { id: number; name: string }[]
}

function isPsychologyTabValue(value: string | null): value is PsychologyTabValue {
  return PSYCHOLOGY_TABS.some((tab) => tab === value)
}

function PsychologyMetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-foreground",
  accentClassName = "border border-border/60 bg-secondary/30",
}: {
  label: string
  value: string | number
  sub: string
  icon: ElementType
  color?: string
  accentClassName?: string
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-linear-to-b from-card to-card/80 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            <p className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{sub}</p>
          </div>
          <div className={cn("rounded-2xl p-2.5 shadow-sm", accentClassName)}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PsychologyChartState({
  icon: Icon,
  message,
  isLoading = false,
  className = "h-62.5",
}: {
  icon: ElementType
  message: string
  isLoading?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 text-center", className)}>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <Icon className="h-5 w-5 text-muted-foreground/60" />
      )}
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {isLoading ? "Loading chart..." : message}
      </p>
    </div>
  )
}

// --- Stats Cards ---
function PsychologyStats({ statsData }: { statsData: PsychologyStatsSnapshot | null }) {
  const topEmotionCategory = statsData?.topEmotion ? getTagCategory(statsData.topEmotion) : null
  const psychScorePercent =
    statsData?.psychologyScore != null ? Math.round(statsData.psychologyScore * 100) : null

  const cards = [
    {
      title: "Avg Confidence",
      value:
        statsData?.avgConfidence && statsData.avgConfidence > 0
          ? `${statsData.avgConfidence.toFixed(1)}/5`
          : "--",
      subtitle: "Average self-trust across journaled sessions",
      icon: Shield,
      color: "text-primary",
      accentClassName: "border border-primary/20 bg-primary/10",
    },
    {
      title: "Dominant State",
      value: statsData?.topEmotion || "-",
      subtitle: statsData?.topEmotion ? "Most repeated journal emotion" : "No tagged pattern yet",
      icon: Brain,
      color: statsData?.topEmotion
        ? topEmotionCategory === "positive"
          ? "text-emerald-400"
          : topEmotionCategory === "negative"
            ? "text-red-400"
            : "text-blue-400"
        : "text-muted-foreground",
      accentClassName: statsData?.topEmotion
        ? topEmotionCategory === "positive"
          ? "border border-emerald-500/20 bg-emerald-500/10"
          : topEmotionCategory === "negative"
            ? "border border-red-500/20 bg-red-500/10"
            : "border border-blue-500/20 bg-blue-500/10"
        : "border border-border/60 bg-secondary/30",
    },
    {
      title: "Mindset Score",
      value: psychScorePercent != null && psychScorePercent > 0 ? `${psychScorePercent}%` : "--",
      subtitle: "Positive-to-negative psychology ratio",
      icon: TrendingUp,
      color:
        psychScorePercent != null && psychScorePercent >= 60
          ? "text-emerald-400"
          : psychScorePercent != null && psychScorePercent >= 40
            ? "text-yellow-400"
            : "text-red-400",
      accentClassName:
        psychScorePercent != null && psychScorePercent >= 60
          ? "border border-emerald-500/20 bg-emerald-500/10"
          : psychScorePercent != null && psychScorePercent >= 40
            ? "border border-amber-500/20 bg-amber-500/10"
            : "border border-red-500/20 bg-red-500/10",
    },
    {
      title: "Reflections Logged",
      value: statsData?.journalEntries || 0,
      subtitle: "Total psychology journal entries saved",
      icon: FileText,
      color: "text-accent",
      accentClassName: "border border-accent/20 bg-accent/10",
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <PsychologyMetricCard
          key={card.title}
          label={card.title}
          value={card.value}
          sub={card.subtitle}
          icon={card.icon}
          color={card.color}
          accentClassName={card.accentClassName}
        />
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
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">Emotion Frequency</CardTitle>
        <CardDescription className="text-muted-foreground">
          How often each emotion appears across trades
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PsychologyChartState icon={Brain} message="Loading emotion frequency." isLoading />
        ) : data.length === 0 ? (
          <PsychologyChartState
            icon={Brain}
            message="No emotion data yet. Tag emotions when creating trades to build this view."
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-62.5">
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
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">Emotion vs Win Rate</CardTitle>
        <CardDescription className="text-muted-foreground">
          How emotions correlate with trade outcomes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PsychologyChartState icon={TrendingUp} message="Loading emotion win rates." isLoading />
        ) : data.length === 0 ? (
          <PsychologyChartState
            icon={TrendingUp}
            message="Need closed trades with emotion tags before this analysis can surface a signal."
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-62.5">
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
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">Mood & Confidence Trend</CardTitle>
        <CardDescription className="text-muted-foreground">
          Your mental state over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PsychologyChartState icon={Calendar} message="Loading mood trend." isLoading />
        ) : data.length === 0 ? (
          <PsychologyChartState
            icon={Calendar}
            message="Add journal entries to track your mood and confidence over time."
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-62.5">
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
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-foreground">Emotion Distribution</CardTitle>
        <CardDescription className="text-muted-foreground">
          Balance of positive, negative, and neutral emotions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PsychologyChartState icon={Brain} message="Loading emotion mix." isLoading />
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
      <Card className={`${SURFACE_CARD_CLASS} lg:col-span-2`}>
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
          <PsychologyChartState
            icon={Flame}
            message="Need closed trades with emotion tags before this map can show profitable and costly states."
            isLoading={isLoading}
            className="h-50"
          />
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
    <Card className={`${SURFACE_CARD_CLASS} lg:col-span-2`}>
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

function PsychologyCoachPanel({
  statsData,
  journalEntries,
  onOpenJournal,
  onOpenPatterns,
}: {
  statsData: PsychologyStatsSnapshot | null
  journalEntries: ApiJournalEntry[]
  onOpenJournal: () => void
  onOpenPatterns: () => void
}) {
  const allEntries = useMemo(() => filterJournalEntries(journalEntries, "all"), [journalEntries])
  const recentEntries = useMemo(
    () => filterJournalEntries(journalEntries, "recent"),
    [journalEntries],
  )
  const resetEntries = useMemo(
    () => filterJournalEntries(journalEntries, "needs-reset"),
    [journalEntries],
  )
  const latestEntry = allEntries[0] ?? null

  const signals = [
    {
      label: "Dominant state",
      value: statsData?.topEmotion ?? "No clear pattern yet",
      detail: statsData?.topEmotion
        ? "Review the sessions where this state appears before and after execution."
        : "Keep tagging emotions so the dashboard can isolate repeatable states.",
      icon: Brain,
      accentClassName: "border border-accent/20 bg-accent/10 text-accent",
    },
    {
      label: "Reset watch",
      value:
        resetEntries.length > 0
          ? `${resetEntries.length} entry${resetEntries.length === 1 ? "" : "ies"} flagged`
          : "No low-state reflections",
      detail:
        resetEntries.length > 0
          ? "Low mood or low confidence sessions deserve smaller size and tighter rules."
          : "Your recent notes are not showing urgent emotional risk signals.",
      icon: TrendingDown,
      accentClassName:
        resetEntries.length > 0
          ? "border border-amber-500/20 bg-amber-500/10 text-amber-400"
          : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    },
    {
      label: "Reflection cadence",
      value: `${recentEntries.length} in last 14 days`,
      detail:
        recentEntries.length >= 2
          ? "Cadence is strong enough to compare mindset shifts across sessions."
          : "More recent check-ins will make pattern shifts easier to trust.",
      icon: FileText,
      accentClassName:
        recentEntries.length >= 2
          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border border-border/70 bg-background/80 text-foreground",
    },
  ]

  return (
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Coach readout
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Read the pattern, then decide whether the next session needs more freedom or more guardrails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.map((signal) => (
          <div key={signal.label} className="rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="flex items-start gap-3">
              <div className={cn("rounded-xl p-2 shadow-sm", signal.accentClassName)}>
                <signal.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {signal.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{signal.value}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{signal.detail}</p>
              </div>
            </div>
          </div>
        ))}

        {latestEntry ? (
          <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Latest note
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {getRichTextPreview(latestEntry.todayTradingReview, 120)}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" className="gap-2" onClick={onOpenJournal}>
            <FileText className="h-4 w-4" />
            Open journal
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={onOpenPatterns}>
            <Brain className="h-4 w-4" />
            Review patterns
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PatternGuideCard({ onOpenJournal }: { onOpenJournal: () => void }) {
  const items = [
    "Use the heatmap to find the emotional states that consistently add or subtract expectancy.",
    "Compare win rate and frequency together so rare emotions do not overpower the story.",
    "When a negative state repeats, add a pre-trade checkpoint or cut size before the next session.",
  ]

  return (
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          How to read the pattern maps
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Turn chart observations into a process change instead of a vague feeling.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-xs font-semibold text-accent">
              {index + 1}
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">{item}</p>
          </div>
        ))}

        <Button variant="outline" size="sm" className="gap-2" onClick={onOpenJournal}>
          <FileText className="h-4 w-4" />
          Capture the next review
        </Button>
      </CardContent>
    </Card>
  )
}

function ReflectionRoutineCard({ onOpenNewEntry }: { onOpenNewEntry: () => void }) {
  const prompts = [
    "Score mood and confidence before you look at the PnL.",
    "Tag the two or three emotions that shaped your decisions the most.",
    "Write one sentence on discipline and one on what needs to change tomorrow.",
  ]

  return (
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Brain className="h-4 w-4 text-accent" />
          Reflection routine
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Keep the journaling habit short enough to repeat and structured enough to compare.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {prompts.map((prompt, index) => (
          <div key={prompt} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary">
              {index + 1}
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">{prompt}</p>
          </div>
        ))}

        <Button size="sm" className="gap-2" onClick={onOpenNewEntry}>
          <Plus className="h-4 w-4" />
          Start new reflection
        </Button>
      </CardContent>
    </Card>
  )
}

function JournalEntriesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="mt-3 h-3 w-28 rounded-md" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-3/4 rounded-md" />
          </div>
        </div>
      ))}
    </div>
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
  const moodColors = [
    "",
    "text-red-400",
    "text-orange-400",
    "text-yellow-400",
    "text-emerald-400",
    "text-emerald-300",
  ]
  const confidenceColors = [
    "",
    "text-red-400",
    "text-orange-400",
    "text-yellow-400",
    "text-emerald-400",
    "text-emerald-300",
  ]
  const moodBadgeClasses = [
    "",
    "border-red-500/25 bg-red-500/10 text-red-400",
    "border-orange-500/25 bg-orange-500/10 text-orange-400",
    "border-yellow-500/25 bg-yellow-500/10 text-yellow-400",
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  ]

  return (
    <div className="rounded-2xl border border-border/70 bg-linear-to-br from-card/95 to-card/75 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm",
              moodBadgeClasses[entry.overallMood] ||
                "border-border/70 bg-background/70 text-muted-foreground",
            )}
          >
            <span className="text-base font-semibold">{entry.overallMood}</span>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {new Date(entry.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                Logged reflection for the trading session and mindset review.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  moodBadgeClasses[entry.overallMood] ||
                    "border-border/70 bg-background/70 text-muted-foreground",
                )}
              >
                Mood {moodLabels[entry.overallMood] || "Unknown"}
              </span>
              <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Confidence {entry.confidentLevel}/5 · {confidenceLabels[entry.confidentLevel] || "Unknown"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 self-start">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse entry" : "Expand entry"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl px-2 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(entry.id)}
            aria-label="Delete entry"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {entry.emotionTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {entry.emotionTags.map((tag) => {
            const label = tag.name || "Unknown Tag"
            const colorMap = {
              positive: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
              negative: "bg-red-500/15 text-red-400 border-red-500/25",
              neutral: "bg-blue-500/15 text-blue-400 border-blue-500/25",
            }
            const category = getTagCategory(label)

            return (
              <span
                key={tag.id}
                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${colorMap[category]}`}
              >
                {label}
              </span>
            )
          })}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-border/70 bg-background/60 p-3">
        <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
          {expanded
            ? getPlainTextFromRichText(entry.todayTradingReview)
            : getRichTextPreview(entry.todayTradingReview, 190)}
        </p>
        {!expanded && getPlainTextFromRichText(entry.todayTradingReview).length > 190 ? (
          <button
            onClick={() => setExpanded(true)}
            className="mt-2 text-xs font-medium text-accent hover:underline"
          >
            Read more
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Confidence bar</span>
          <span className={confidenceColors[entry.confidentLevel] || "text-muted-foreground"}>
            {confidenceLabels[entry.confidentLevel] || "Unknown"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary/60">
          <div
            className="h-full rounded-full bg-linear-to-r from-primary/70 via-accent to-emerald-400"
            style={{ width: `${(entry.confidentLevel / 5) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function NewEntryForm({
  apiTags,
  onSave,
  onCancel,
}: {
  apiTags: EmotionTagApi[]
  onSave: () => void
  onCancel: () => void
}) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [overallMood, setOverallMood] = useState(3)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [confidenceLevel, setConfidenceLevel] = useState(3)
  const [journalEntry, setJournalEntry] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const selectedEmotionLabels = useMemo(
    () =>
      apiTags
        .filter((tag) => selectedTags.includes(tag.id.toString()))
        .map((tag) => tag.name),
    [apiTags, selectedTags],
  )

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((tagId) => tagId !== id) : [...prev, id],
    )
  }

  const handleSave = async () => {
    const normalizedJournalEntry = normalizeRichTextValue(journalEntry)

    if (!getPlainTextFromRichText(normalizedJournalEntry).trim()) {
      toast({
        title: "Reflection required",
        description: "Add a short review so this entry becomes useful when you revisit it.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        date: new Date(date).toISOString(),
        todayTradingReview: normalizedJournalEntry,
        overallMood,
        confidentLevel: confidenceLevel,
        emotionTags: selectedTags.map(Number),
      }

      const res = await api.post("/v1/psychology-journals", payload)
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/20 bg-accent/6 p-4">
        <p className="text-sm font-medium text-foreground">Log the state before the story.</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Capture mood, confidence, and the dominant emotions first so the written review stays anchored to what you actually felt.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Quick check-in
            </p>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Overall Mood</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setOverallMood(level)}
                      className={`flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition-all ${
                        overallMood === level
                          ? "border-violet-500 bg-violet-500/20 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500/20"
                          : overallMood >= level
                            ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                            : "border-border bg-secondary/40 text-muted-foreground hover:border-violet-500/20 hover:text-violet-500"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{moodLabels[overallMood] || "Unknown"}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Confidence Level</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setConfidenceLevel(level)}
                      className={`flex h-10 items-center justify-center rounded-2xl border text-sm font-medium transition-all ${
                        confidenceLevel >= level
                          ? "border-primary/40 bg-primary/12 text-primary"
                          : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/25"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {confidenceLabels[confidenceLevel] || "Unknown"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Emotion tags
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Pick the emotions that dominated the session. Two or three tags is usually enough.
                </p>
              </div>

              <span className="inline-flex rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {selectedTags.length} selected
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {(["positive", "negative", "neutral"] as const).map((category) => (
                <div key={category} className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium capitalize text-muted-foreground">
                      {category}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {
                        apiTags.filter((tag) => getTagCategory(tag.name) === category).length
                      } tags
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {apiTags
                      .filter((tag) => getTagCategory(tag.name) === category)
                      .map((tag) => {
                        const isSelected = selectedTags.includes(tag.id.toString())
                        const colorMap = {
                          positive: isSelected
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30"
                            : "bg-background/80 text-muted-foreground border-border hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30",
                          negative: isSelected
                            ? "bg-red-500/20 text-red-400 border-red-500/40 ring-1 ring-red-500/30"
                            : "bg-background/80 text-muted-foreground border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30",
                          neutral: isSelected
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30"
                            : "bg-background/80 text-muted-foreground border-border hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30",
                        }

                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id.toString())}
                            className={`min-h-10 rounded-2xl border px-3.5 py-2 text-sm font-medium transition-all ${colorMap[category]}`}
                          >
                            {tag.name}
                          </button>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Reflection
            </p>
            <div className="mt-3 grid gap-2 rounded-2xl border border-border/70 bg-secondary/20 p-3 text-xs leading-relaxed text-muted-foreground sm:grid-cols-3">
              <p>What did I feel before the first decision?</p>
              <p>Where did discipline hold or slip?</p>
              <p>What changes for the next session?</p>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Journal Entry</Label>
              <Textarea
                placeholder="How did you feel before, during, and after the session? What drove your best decisions, and where did emotion pull you off-plan?"
                value={journalEntry}
                onChange={(event) => setJournalEntry(event.target.value)}
                rows={10}
                className="min-h-52 resize-y"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {selectedEmotionLabels.length > 0
                    ? selectedEmotionLabels.join(" • ")
                    : "No emotions selected yet"}
                </span>
                <span>{getPlainTextFromRichText(journalEntry).trim().length} chars</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Save concise entries consistently. The chart quality improves faster than the essay length.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!getPlainTextFromRichText(journalEntry).trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function PsychologyContent() {
  const { trades } = useTrades()
  const [newEntryOpen, setNewEntryOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<PsychologyTabValue>("overview")
  const [journalFilter, setJournalFilter] = useState<PsychologyJournalFilter>("all")
  const [archivePage, setArchivePage] = useState(1)
  const [apiTags, setApiTags] = useState<EmotionTagApi[]>([])
  const [journalEntries, setJournalEntries] = useState<ApiJournalEntry[]>([])
  const [isLoadingJournals, setIsLoadingJournals] = useState(true)
  const { toast } = useToast()
  const [statsData, setStatsData] = useState<PsychologyStatsSnapshot | null>(null)

  useEffect(() => {
    try {
      const storedTab = window.localStorage.getItem(PSYCHOLOGY_TAB_STORAGE_KEY)

      if (isPsychologyTabValue(storedTab)) {
        setActiveTab(storedTab)
      }
    } catch {
      // Ignore storage access failures.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(PSYCHOLOGY_TAB_STORAGE_KEY, activeTab)
    } catch {
      // Ignore storage access failures.
    }
  }, [activeTab])

  const fetchStats = async () => {
    try {
      const res = await api.get("/v1/dashboard/statistic")
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
      const allEntries: ApiJournalEntry[] = []
      let nextPage = 1
      let hasMore = true

      while (hasMore) {
        const res = await api.post<ApiPaginatedResponse<ApiJournalEntry>>(
          "/v1/psychology-journals/search",
          {
            page: nextPage,
            pageSize: JOURNAL_FETCH_PAGE_SIZE,
            overallMood: null,
            confidentLevel: null,
            emotionTags: null,
          },
        )
        const data = res.data

        if (!data.isSuccess) {
          break
        }

        allEntries.push(...(data.value.values ?? []))
        hasMore = Boolean(data.value.hasMore)
        nextPage += 1
      }

      setJournalEntries(allEntries)
      setArchivePage(1)
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
        if (data.isSuccess) {
          setApiTags(data.value)
        }
      })
      .catch((err) => console.error("Failed to fetch API tags:", err))

    fetchJournals()
    fetchStats()
  }, [])

  const sortedEntries = useMemo(
    () => filterJournalEntries(journalEntries, "all"),
    [journalEntries],
  )
  const filteredEntries = useMemo(
    () => filterJournalEntries(journalEntries, journalFilter),
    [journalEntries, journalFilter],
  )
  const paginatedFilteredEntries = useMemo(() => {
    const startIndex = (archivePage - 1) * JOURNAL_ARCHIVE_PAGE_SIZE

    return filteredEntries.slice(startIndex, startIndex + JOURNAL_ARCHIVE_PAGE_SIZE)
  }, [archivePage, filteredEntries])
  const latestEntry = sortedEntries[0] ?? null
  const narrative = useMemo(
    () => buildPsychologyNarrative({ stats: statsData, entries: sortedEntries }),
    [statsData, sortedEntries],
  )
  const pulseCards = useMemo(
    () => buildPsychologyPulse(statsData, sortedEntries),
    [statsData, sortedEntries],
  )
  const journalFilterCounts = useMemo(
    () => ({
      all: sortedEntries.length,
      recent: filterJournalEntries(sortedEntries, "recent").length,
      "high-confidence": filterJournalEntries(sortedEntries, "high-confidence").length,
      "needs-reset": filterJournalEntries(sortedEntries, "needs-reset").length,
    }),
    [sortedEntries],
  )
  const totalArchivePages = Math.max(
    1,
    Math.ceil(filteredEntries.length / JOURNAL_ARCHIVE_PAGE_SIZE),
  )
  const archiveStart =
    filteredEntries.length === 0 ? 0 : (archivePage - 1) * JOURNAL_ARCHIVE_PAGE_SIZE + 1
  const archiveEnd = Math.min(archivePage * JOURNAL_ARCHIVE_PAGE_SIZE, filteredEntries.length)
  const activeFilterLabel =
    JOURNAL_FILTERS.find((filter) => filter.value === journalFilter)?.label ?? "All entries"

  useEffect(() => {
    setArchivePage(1)
  }, [journalFilter])

  useEffect(() => {
    if (archivePage > totalArchivePages) {
      setArchivePage(totalArchivePages)
    }
  }, [archivePage, totalArchivePages])

  const handleDeleteEntry = async (id: number) => {
    try {
      await api.delete(`/v1/psychology-journals/${id}`)
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
      psychologyEntries: sortedEntries,
      tradeEmotionData: trades
        .filter((trade) => trade.emotionTags?.length || trade.confidenceLevel || trade.psychologyNotes)
        .map((trade) => ({
          tradeId: trade.id,
          asset: trade.asset,
          date: trade.date,
          emotionTags: trade.emotionTags,
          confidenceLevel: trade.confidenceLevel,
          psychologyNotes: trade.psychologyNotes,
          pnl: trade.pnl,
          status: trade.status,
        })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")

    anchor.href = url
    anchor.download = `trading-psychology-${new Date().toISOString().split("T")[0]}.json`
    anchor.click()

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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <PsychologyCommandCenter
            narrative={narrative}
            pulseCards={pulseCards}
            journalEntriesCount={sortedEntries.length}
            latestEntry={latestEntry}
            exportAction={
              <Button variant="outline" size="default" className="gap-2 rounded-full border-border/70 bg-background/50 shadow-sm backdrop-blur-md transition-all hover:bg-accent/50" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export data
              </Button>
            }
            onOpenNewEntry={() => setNewEntryOpen(true)}
            onOpenJournal={() => setActiveTab("journal")}
            onOpenPatterns={() => setActiveTab("patterns")}
          />

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (isPsychologyTabValue(value)) {
                setActiveTab(value)
              }
            }}
            className="space-y-6"
          >
            <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-1">
              <TabsTrigger value="overview" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm">
                <Brain className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="journal" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5" />
                Journal
              </TabsTrigger>
              <TabsTrigger value="patterns" className="gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm">
                <Flame className="h-3.5 w-3.5" />
                Patterns
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <PsychologyStats statsData={statsData} />

              <div className="grid gap-6 lg:grid-cols-2">
                <MoodTrendChart />
                <PsychologyCoachPanel
                  statsData={statsData}
                  journalEntries={sortedEntries}
                  onOpenJournal={() => setActiveTab("journal")}
                  onOpenPatterns={() => setActiveTab("patterns")}
                />
                <PsychologyHeatmap />
              </div>
            </TabsContent>

            <TabsContent value="journal" className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
                <ReflectionRoutineCard onOpenNewEntry={() => setNewEntryOpen(true)} />

                <Card className={SURFACE_CARD_CLASS}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <CardTitle className="text-lg text-foreground">Journal archive</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          {activeFilterLabel} · {filteredEntries.length} total reflection{filteredEntries.length === 1 ? "" : "s"}
                        </CardDescription>
                      </div>
                      <Button size="sm" className="gap-2" onClick={() => setNewEntryOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Add entry
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {JOURNAL_FILTERS.map((filter) => (
                        <Button
                          key={filter.value}
                          variant={journalFilter === filter.value ? "default" : "outline"}
                          size="sm"
                          className="gap-2 rounded-xl"
                          onClick={() => setJournalFilter(filter.value)}
                        >
                          {filter.label}
                          <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {journalFilterCounts[filter.value]}
                          </span>
                        </Button>
                      ))}
                    </div>

                    {isLoadingJournals ? (
                      <JournalEntriesSkeleton />
                    ) : filteredEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/60 px-6 py-12 text-center">
                        <Brain className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-foreground">
                          {sortedEntries.length === 0 ? "No journal entries yet" : `No ${activeFilterLabel.toLowerCase()} reflections`}
                        </p>
                        <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                          {sortedEntries.length === 0
                            ? "Start journaling to track your mental state and improve your trading psychology."
                            : "Try another filter or log a fresh reflection after the next session to grow the dataset."}
                        </p>
                        <Button size="sm" className="mt-4 gap-2" onClick={() => setNewEntryOpen(true)}>
                          <Plus className="h-4 w-4" />
                          {sortedEntries.length === 0 ? "Create first entry" : "Add new entry"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {paginatedFilteredEntries.map((entry) => (
                          <JournalEntryCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} />
                        ))}

                        {filteredEntries.length > JOURNAL_ARCHIVE_PAGE_SIZE ? (
                          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                              Showing {archiveStart} to {archiveEnd} of {filteredEntries.length} reflections
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setArchivePage((page) => Math.max(1, page - 1))}
                                disabled={archivePage === 1 || isLoadingJournals}
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setArchivePage((page) => Math.min(totalArchivePages, page + 1))
                                }
                                disabled={archivePage >= totalArchivePages || isLoadingJournals}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <EmotionWinRateChart />
                <EmotionFrequencyChart />
                <EmotionDistributionChart />
                <PatternGuideCard onOpenJournal={() => setActiveTab("journal")} />
              </div>
            </TabsContent>
          </Tabs>

          <Dialog open={newEntryOpen} onOpenChange={setNewEntryOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
              <DialogHeader>
                <DialogTitle>New Psychology Entry</DialogTitle>
                <DialogDescription>
                  Log your emotional state and reflect on your trading mindset while the session is still fresh.
                </DialogDescription>
              </DialogHeader>
              <NewEntryForm
                apiTags={apiTags}
                onSave={handleSaveEntry}
                onCancel={() => setNewEntryOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}

export default function PsychologyPage() {
  return <PsychologyContent />
}

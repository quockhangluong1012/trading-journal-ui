"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarUI } from "@/components/ui/calendar"
import {
  ClipboardList, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Target, BarChart3, Loader2, Sparkles, Save, Calendar, Trophy,
  AlertTriangle, Lightbulb, CheckCircle2, Brain, Eye, Crosshair, ArrowUpCircle,
} from "lucide-react"
import {
  ReviewPeriodType, fetchReview, saveReview, generateReviewSummary,
  fetchReviewTrades, getPeriodBounds, navigatePeriod, formatPeriodLabel,
  toISODateString, fetchReviewSummaryStatus,
  type ReviewData, type ReviewSummaryStatus, type ReviewTrade,
} from "@/lib/review-api"

// --- Helpers ---
const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v)

const pct = (v: number) => `${v.toFixed(1)}%`

// --- Metric Card ---
function MetricCard({ label, value, sub, icon: Icon, color = "text-foreground", bgColor = "bg-secondary/30" }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string; bgColor?: string
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2 ${bgColor}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Period Navigator ---
function PeriodNavigator({
  periodType, currentDate, onNavigate,
}: {
  periodType: ReviewPeriodType; currentDate: Date; onNavigate: (d: Date) => void
}) {
  const [open, setOpen] = useState(false)
  const label = formatPeriodLabel(periodType, currentDate)
  const isToday = (() => {
    const bounds = getPeriodBounds(periodType, new Date())
    const current = getPeriodBounds(periodType, currentDate)
    return current.start.getTime() === bounds.start.getTime()
  })()

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline" size="icon" className="h-8 w-8"
        onClick={() => onNavigate(navigatePeriod(periodType, currentDate, "prev"))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-auto py-1 min-w-[180px] flex flex-col items-center hover:bg-secondary/40">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {isToday ? (
              <p className="text-[10px] text-primary font-medium">Current Period</p>
            ) : (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" /> Select Date
              </p>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <CalendarUI
            mode="single"
            selected={currentDate}
            onSelect={(date) => {
              if (date) {
                onNavigate(date)
                setOpen(false)
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline" size="icon" className="h-8 w-8"
        onClick={() => onNavigate(navigatePeriod(periodType, currentDate, "next"))}
        disabled={isToday}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// --- Trade Row ---
function TradeRow({ trade }: { trade: ReviewTrade }) {
  const isPnlPositive = trade.pnl != null && trade.pnl > 0
  return (
    <div className="flex items-center justify-between rounded-md bg-secondary/20 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
          trade.position === "Long"
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-red-500/15 text-red-400"
        }`}>
          {trade.position === "Long" ? "L" : "S"}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{trade.asset}</p>
          <p className="text-[10px] text-muted-foreground">
            {trade.closedDate
              ? new Date(trade.closedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${isPnlPositive ? "text-emerald-400" : "text-red-400"}`}>
          {trade.pnl != null ? fmt(trade.pnl) : "—"}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {trade.entryPrice?.toFixed(2)} → {trade.exitPrice?.toFixed(2) ?? "—"}
        </p>
      </div>
    </div>
  )
}

// --- Skeleton Loader for AI Summary ---
function AiSummarySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 rounded bg-blue-400/30" />
          <div className="h-3 w-24 rounded bg-blue-400/30" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-foreground/5" />
          <div className="h-3 w-4/5 rounded bg-foreground/5" />
          <div className="h-3 w-3/5 rounded bg-foreground/5" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-secondary/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-4 w-4 rounded bg-muted-foreground/20" />
              <div className="h-3 w-20 rounded bg-muted-foreground/20" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-foreground/5" />
              <div className="h-3 w-3/4 rounded bg-foreground/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- AI Summary Card ---
function AiSummaryCard({
  review, periodType, periodStart, periodEnd, onSummaryUpdate,
}: {
  review: ReviewData | null
  periodType: ReviewPeriodType
  periodStart: string
  periodEnd: string
  onSummaryUpdate: (status: ReviewSummaryStatus) => void
}) {
  const [generating, setGenerating] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start polling when we detect isGenerating is true from loaded data
  useEffect(() => {
    if (review?.aiSummaryGenerating) {
      setGenerating(true)
      startPolling()
    }
    return () => stopPolling()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review?.aiSummaryGenerating, periodType, periodStart])

  const startPolling = useCallback(() => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      try {
        const status = await fetchReviewSummaryStatus(periodType, periodStart)
        if (!status.isGenerating) {
          stopPolling()
          setGenerating(false)
          onSummaryUpdate(status)
        }
      } catch (err) {
        console.error("Polling failed", err)
      }
    }, 3000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, periodStart, onSummaryUpdate])

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generateReviewSummary({ periodType, periodStart, periodEnd })
      startPolling()
    } catch (err) {
      console.error("Failed to trigger review summary generation", err)
      setGenerating(false)
    }
  }

  const hasSummary = review?.aiSummary

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            AI Review Summary
          </CardTitle>
          <Button
            variant="outline" size="sm" onClick={handleGenerate}
            disabled={generating} className="gap-1.5"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {hasSummary ? "Regenerate" : "Generate"}
          </Button>
        </div>
        <CardDescription className="text-muted-foreground">
          AI-powered analysis of your trading performance for this period
        </CardDescription>
      </CardHeader>
      <CardContent>
        {generating ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                AI is analyzing your trading data... This may take a minute.
              </span>
            </div>
            <AiSummarySkeleton />
          </div>
        ) : hasSummary ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400">Period Summary</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/80">{review?.aiSummary}</p>
            </div>

            {/* Strengths + Weaknesses side by side */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Strengths */}
              {review?.aiStrengths && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Trophy className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">Strengths</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80">{review?.aiStrengths}</p>
                </div>
              )}

              {/* Weaknesses */}
              {review?.aiWeaknesses && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-xs font-semibold text-red-400">Areas to Improve</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80">{review?.aiWeaknesses}</p>
                </div>
              )}
            </div>

            {/* Technical Insights */}
            {review?.aiTechnicalInsights && (
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Eye className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-400">Technical Insights (ICT/SMC)</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{review?.aiTechnicalInsights}</p>
              </div>
            )}

            {/* Psychology Analysis */}
            {review?.aiPsychologyAnalysis && (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Brain className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-400">Psychology Analysis</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{review?.aiPsychologyAnalysis}</p>
              </div>
            )}

            {/* Critical Mistakes */}
            {(review?.aiCriticalMistakesTechnical || review?.aiCriticalMistakesPsychological) && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Crosshair className="h-4 w-4 text-rose-400" />
                  <span className="text-xs font-semibold text-rose-400">Critical Mistakes</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {review?.aiCriticalMistakesTechnical && (
                    <div>
                      <p className="text-[10px] font-semibold text-rose-400/70 uppercase tracking-wider mb-1.5">Technical</p>
                      <ul className="space-y-1">
                        {review.aiCriticalMistakesTechnical.split("|||").filter(Boolean).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {review?.aiCriticalMistakesPsychological && (
                    <div>
                      <p className="text-[10px] font-semibold text-rose-400/70 uppercase tracking-wider mb-1.5">Psychological</p>
                      <ul className="space-y-1">
                        {review.aiCriticalMistakesPsychological.split("|||").filter(Boolean).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Items */}
            {review?.aiActionItems && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Action Items</span>
                </div>
                <ul className="space-y-1.5">
                  {review.aiActionItems.split("|||").filter(Boolean).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What to Improve */}
            {review?.aiWhatToImprove && (
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <ArrowUpCircle className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-semibold text-sky-400">What to Improve</span>
                </div>
                <ul className="space-y-1.5">
                  {review.aiWhatToImprove.split("|||").filter(Boolean).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Click &quot;Generate&quot; to get an AI-powered analysis of this period
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Review Tab Content ---
function ReviewTabContent({ periodType }: { periodType: ReviewPeriodType }) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [review, setReview] = useState<ReviewData | null>(null)
  const [trades, setTrades] = useState<ReviewTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState("")
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bounds = getPeriodBounds(periodType, currentDate)
  const periodStartStr = toISODateString(bounds.start)
  const periodEndStr = toISODateString(bounds.end)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [reviewData, tradesData] = await Promise.all([
        fetchReview(periodType, periodStartStr),
        fetchReviewTrades(periodStartStr, periodEndStr),
      ])
      setReview(reviewData)
      setTrades(tradesData.values)
      setNotes(reviewData?.userNotes ?? "")
    } catch (err) {
      console.error("Failed to load review data", err)
    } finally {
      setLoading(false)
    }
  }, [periodType, periodStartStr, periodEndStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveNotes = useCallback(async () => {
    setSaving(true)
    try {
      await saveReview({
        periodType,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        userNotes: notes,
      })
    } catch (err) {
      console.error("Failed to save review notes", err)
    } finally {
      setSaving(false)
    }
  }, [periodType, periodStartStr, periodEndStr, notes])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      setSaving(true)
      saveReview({
        periodType,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        userNotes: value,
      })
        .catch((err) => console.error("Auto-save failed", err))
        .finally(() => setSaving(false))
    }, 2000)
  }

  const handleSummaryUpdate = useCallback((status: ReviewSummaryStatus) => {
    setReview((prev) =>
      prev
        ? {
            ...prev,
            aiSummary: status.aiSummary ?? prev.aiSummary,
            aiStrengths: status.aiStrengths ?? prev.aiStrengths,
            aiWeaknesses: status.aiWeaknesses ?? prev.aiWeaknesses,
            aiActionItems: status.aiActionItems ?? prev.aiActionItems,
            aiTechnicalInsights: status.aiTechnicalInsights ?? prev.aiTechnicalInsights,
            aiPsychologyAnalysis: status.aiPsychologyAnalysis ?? prev.aiPsychologyAnalysis,
            aiCriticalMistakesTechnical: status.aiCriticalMistakesTechnical ?? prev.aiCriticalMistakesTechnical,
            aiCriticalMistakesPsychological: status.aiCriticalMistakesPsychological ?? prev.aiCriticalMistakesPsychological,
            aiWhatToImprove: status.aiWhatToImprove ?? prev.aiWhatToImprove,
            aiSummaryGenerating: false,
          }
        : null
    )
  }, [])

  const data = review ?? {
    totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0,
  }

  return (
    <div className="space-y-6">
      {/* Period Navigator */}
      <div className="flex justify-center">
        <PeriodNavigator
          periodType={periodType}
          currentDate={currentDate}
          onNavigate={setCurrentDate}
        />
      </div>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total P&L"
              value={fmt(data.totalPnl)}
              sub={`${data.totalTrades} trades`}
              icon={data.totalPnl >= 0 ? TrendingUp : TrendingDown}
              color={data.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
              bgColor={data.totalPnl >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}
            />
            <MetricCard
              label="Win Rate"
              value={pct(data.winRate)}
              sub={`${data.wins}W / ${data.losses}L`}
              icon={Target}
              color="text-primary"
              bgColor="bg-primary/10"
            />
            <MetricCard
              label="Wins"
              value={String(data.wins)}
              sub="winning trades"
              icon={TrendingUp}
              color="text-emerald-400"
              bgColor="bg-emerald-500/10"
            />
            <MetricCard
              label="Losses"
              value={String(data.losses)}
              sub="losing trades"
              icon={TrendingDown}
              color="text-red-400"
              bgColor="bg-red-500/10"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column — Trades + Journal */}
        <div className="lg:col-span-3 space-y-6">
          {/* Trades List */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Closed Trades
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {trades.length} trade{trades.length !== 1 ? "s" : ""} closed in this period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trades.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {trades.map((trade) => (
                    <TradeRow key={trade.id} trade={trade} />
                  ))}
                </div>
              ) : (
                <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
                  No trades closed during this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Summary */}
          <AiSummaryCard
            review={review}
            periodType={periodType}
            periodStart={periodStartStr}
            periodEnd={periodEndStr}
            onSummaryUpdate={handleSummaryUpdate}
          />
        </div>

        {/* Right column — Review Journal */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-accent" />
                  Review Notes
                </CardTitle>
                <div className="flex items-center gap-2">
                  {saving && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                    </span>
                  )}
                  <Button
                    variant="outline" size="sm" className="gap-1.5 h-7"
                    onClick={handleSaveNotes} disabled={saving}
                  >
                    <Save className="h-3 w-3" /> Save
                  </Button>
                </div>
              </div>
              <CardDescription className="text-muted-foreground">
                Write your reflections about this trading period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="What went well? What could improve? Key lessons learned..."
                className="min-h-[300px] resize-none bg-secondary/20 border-border text-sm leading-relaxed"
              />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                Period Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: "Period", value: formatPeriodLabel(periodType, currentDate) },
                { label: "Start", value: bounds.start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                { label: "End", value: bounds.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                { label: "Total Trades", value: String(data.totalTrades) },
                { label: "Net P&L", value: fmt(data.totalPnl) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md bg-secondary/20 px-3 py-2">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  )
}

// --- Main Page ---
function ReviewContent() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ClipboardList className="h-6 w-6 text-primary" />
            Review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reflect on your trading performance across different time periods with AI-powered insights.
          </p>
        </div>

        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList>
            <TabsTrigger value="daily" className="gap-1.5">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1.5">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5">Monthly</TabsTrigger>
            <TabsTrigger value="quarterly" className="gap-1.5">Quarterly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <ReviewTabContent periodType={ReviewPeriodType.Daily} />
          </TabsContent>
          <TabsContent value="weekly">
            <ReviewTabContent periodType={ReviewPeriodType.Weekly} />
          </TabsContent>
          <TabsContent value="monthly">
            <ReviewTabContent periodType={ReviewPeriodType.Monthly} />
          </TabsContent>
          <TabsContent value="quarterly">
            <ReviewTabContent periodType={ReviewPeriodType.Quarterly} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default function ReviewPage() {
  return <ReviewContent />
}

"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Crosshair,
  FileText,
  ListChecks,
  Target,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ReviewTrade } from "@/lib/review-api"
import { cn } from "@/lib/utils"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

const confidenceLabels = ["None", "Very Low", "Low", "Neutral", "High", "Very High"]

function formatCurrency(value: number | null): string {
  if (value === null) return "—"
  return currencyFormatter.format(value)
}

function formatClosedDate(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            value >= index + 1 ? "bg-primary" : "bg-border",
          )}
        />
      ))}
      <span className="text-[11px] text-muted-foreground">{confidenceLabels[value] ?? `Level ${value}`}</span>
    </div>
  )
}

function TradeJournalCard({ trade }: { trade: ReviewTrade }) {
  const [expanded, setExpanded] = useState(false)
  const isPositive = trade.pnl !== null && trade.pnl > 0
  const hasJournalContent = Boolean(
    trade.notes?.trim() ||
    (trade.emotionTags && trade.emotionTags.length > 0) ||
    (trade.technicalThemes && trade.technicalThemes.length > 0) ||
    (trade.checklistItems && trade.checklistItems.length > 0)
  )

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-card/95 shadow-sm transition-all duration-200",
        isPositive ? "border-emerald-500/15 hover:border-emerald-500/30" : "border-red-500/15 hover:border-red-500/30",
      )}
    >
      {/* Main row — always visible */}
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1 space-y-3">
          {/* Trade header */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-foreground">{trade.asset}</span>

            <Badge
              variant="secondary"
              className={cn(
                "h-6 border px-2.5 text-[11px] font-medium",
                trade.position === "Long"
                  ? "border-emerald-500/20 bg-emerald-500/12 text-emerald-400"
                  : "border-red-500/20 bg-red-500/12 text-red-400",
              )}
            >
              {trade.position === "Long" ? (
                <ArrowUpRight className="mr-0.5 h-3 w-3" />
              ) : (
                <ArrowDownRight className="mr-0.5 h-3 w-3" />
              )}
              {trade.position}
            </Badge>

            {trade.tradingZone ? (
              <Badge variant="outline" className="h-6 border-border/70 bg-background/80 px-2.5 text-[11px] text-muted-foreground">
                {trade.tradingZone}
              </Badge>
            ) : null}

            {trade.isRuleBroken ? (
              <Badge variant="outline" className="h-6 border-amber-500/20 bg-amber-500/10 px-2.5 text-[11px] text-amber-400">
                <AlertTriangle className="mr-0.5 h-3 w-3" />
                Rule break
              </Badge>
            ) : null}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span>{formatClosedDate(trade.closedDate)}</span>
            <span>Entry {trade.entryPrice.toFixed(2)} → Exit {trade.exitPrice?.toFixed(2) ?? "—"}</span>
            <ConfidenceMeter value={trade.confidenceLevel} />
          </div>

          {/* Quick tags preview (collapsed) */}
          {!expanded && hasJournalContent ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {trade.notes?.trim() ? (
                <Badge variant="outline" className="h-5 border-border/50 bg-background/60 px-2 text-[10px] text-muted-foreground">
                  <FileText className="mr-0.5 h-2.5 w-2.5" />
                  Has notes
                </Badge>
              ) : null}
              {trade.emotionTags && trade.emotionTags.length > 0 ? (
                <Badge variant="outline" className="h-5 border-indigo-500/20 bg-indigo-500/8 px-2 text-[10px] text-indigo-400">
                  <Brain className="mr-0.5 h-2.5 w-2.5" />
                  {trade.emotionTags.length} emotion{trade.emotionTags.length > 1 ? "s" : ""}
                </Badge>
              ) : null}
              {trade.technicalThemes && trade.technicalThemes.length > 0 ? (
                <Badge variant="outline" className="h-5 border-purple-500/20 bg-purple-500/8 px-2 text-[10px] text-purple-400">
                  <Target className="mr-0.5 h-2.5 w-2.5" />
                  {trade.technicalThemes.length} theme{trade.technicalThemes.length > 1 ? "s" : ""}
                </Badge>
              ) : null}
              {trade.checklistItems && trade.checklistItems.length > 0 ? (
                <Badge variant="outline" className="h-5 border-sky-500/20 bg-sky-500/8 px-2 text-[10px] text-sky-400">
                  <ListChecks className="mr-0.5 h-2.5 w-2.5" />
                  {trade.checklistItems.length} checked
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* P&L + expand indicator */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p
            className={cn(
              "text-xl font-bold tracking-tight tabular-nums",
              isPositive ? "text-emerald-400" : "text-red-400",
            )}
          >
            {formatCurrency(trade.pnl)}
          </p>
          {hasJournalContent ? (
            <span className="text-muted-foreground/60">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          ) : null}
        </div>
      </button>

      {/* Expanded journal content */}
      {expanded ? (
        <div className="border-t border-border/50 px-5 pb-5 pt-4 space-y-4">
          {/* Emotion tags */}
          {trade.emotionTags && trade.emotionTags.length > 0 ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                <Brain className="h-3.5 w-3.5 text-indigo-400" />
                Emotions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {trade.emotionTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="rounded-full border-indigo-500/20 bg-indigo-500/8 px-3 py-1 text-xs text-indigo-300"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* Technical themes */}
          {trade.technicalThemes && trade.technicalThemes.length > 0 ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                <Crosshair className="h-3.5 w-3.5 text-purple-400" />
                Technical Themes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {trade.technicalThemes.map((theme) => (
                  <Badge
                    key={theme}
                    variant="outline"
                    className="rounded-full border-purple-500/20 bg-purple-500/8 px-3 py-1 text-xs text-purple-300"
                  >
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* Checklist items */}
          {trade.checklistItems && trade.checklistItems.length > 0 ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5 text-sky-400" />
                Pretrade Checklist
              </p>
              <div className="space-y-1">
                {trade.checklistItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-foreground/85">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Rule break reason */}
          {trade.isRuleBroken && trade.ruleBreakReason ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-amber-400/80 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Rule Break Reason
              </p>
              <p className="text-sm leading-relaxed text-amber-200/90">{trade.ruleBreakReason}</p>
            </div>
          ) : null}

          {/* Trade notes */}
          {trade.notes?.trim() ? (
            <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Trade Notes
              </p>
              <div
                className="trade-notes-html text-sm leading-relaxed text-foreground/85 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_strong]:font-semibold [&_em]:italic [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_br]:block [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: trade.notes }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

interface ReviewTradeJournalProps {
  isLoading: boolean
  trades: ReviewTrade[]
}

export function ReviewTradeJournal({ isLoading, trades }: ReviewTradeJournalProps) {
  const [filter, setFilter] = useState<"all" | "winners" | "losers" | "notes">("all")

  const filteredTrades = trades.filter((t) => {
    switch (filter) {
      case "winners":
        return (t.pnl ?? 0) > 0
      case "losers":
        return (t.pnl ?? 0) <= 0
      case "notes":
        return Boolean(t.notes?.trim())
      default:
        return true
    }
  })

  const tradeSummary = {
    total: trades.length,
    winners: trades.filter((t) => (t.pnl ?? 0) > 0).length,
    losers: trades.filter((t) => (t.pnl ?? 0) <= 0).length,
    withNotes: trades.filter((t) => t.notes?.trim()).length,
  }

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Trade Journal
            </CardTitle>
            <CardDescription>
              Click any trade to expand its full journal entry — notes, emotions, technicals, and checklist.
            </CardDescription>
          </div>
        </div>

        {/* Filter pills */}
        {!isLoading && trades.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {([
              { key: "all" as const, label: "All", count: tradeSummary.total },
              { key: "winners" as const, label: "Winners", count: tradeSummary.winners },
              { key: "losers" as const, label: "Losers", count: tradeSummary.losers },
              { key: "notes" as const, label: "With notes", count: tradeSummary.withNotes },
            ] as const).map((item) => (
              <button
                key={item.key}
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === item.key
                    ? "border-primary/30 bg-primary/12 text-primary"
                    : "border-border/70 bg-background/70 text-muted-foreground hover:text-foreground hover:bg-background",
                )}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  filter === item.key ? "bg-primary/20" : "bg-border/50",
                )}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/70 bg-background/70 p-5">
                <div className="flex justify-between">
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-5 w-32 rounded-md" />
                    <Skeleton className="h-3 w-56 rounded-md" />
                    <Skeleton className="h-3 w-40 rounded-md" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-6 py-10 text-center text-sm text-muted-foreground">
            {filter === "all"
              ? "No trades were closed in this review window."
              : `No ${filter === "notes" ? "trades with notes" : filter} found in this period.`}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrades.map((trade) => (
              <TradeJournalCard key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

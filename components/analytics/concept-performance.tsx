"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Layers, TrendingUp, TrendingDown, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  fetchConceptPerformance,
  type AnalyticsFilter,
  type ConceptMetric,
  type ConceptPerformanceResponse,
} from "@/lib/analytics-api"

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  C: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  D: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  F: "bg-red-500/20 text-red-400 border-red-500/30",
  "N/A": "bg-muted text-muted-foreground border-border",
}

const CONCEPT_COLORS = [
  { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", bar: "bg-cyan-500" },
  { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", bar: "bg-violet-500" },
  { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", bar: "bg-amber-500" },
  { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", bar: "bg-emerald-500" },
  { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", bar: "bg-rose-500" },
  { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", bar: "bg-blue-500" },
  { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", bar: "bg-orange-500" },
  { text: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30", bar: "bg-pink-500" },
]

function getConceptColor(index: number) {
  return CONCEPT_COLORS[index % CONCEPT_COLORS.length]
}

function fmt(n: number) { return n >= 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}` }
function pct(n: number) { return `${n.toFixed(1)}%` }

function ConceptRow({ concept, index, maxTrades }: { concept: ConceptMetric; index: number; maxTrades: number }) {
  const colors = getConceptColor(index)
  const gradeColor = GRADE_COLORS[concept.grade] ?? GRADE_COLORS["N/A"]
  const widthPct = maxTrades > 0 ? (concept.totalTrades / maxTrades) * 100 : 0

  return (
    <div className={cn("rounded-2xl border p-4 transition-all hover:shadow-md", colors.border, colors.bg)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full", colors.bar)} />
          <h4 className={cn("text-sm font-semibold", colors.text)}>{concept.conceptName}</h4>
          <span className="text-[10px] text-muted-foreground">({concept.totalTrades} trades)</span>
        </div>
        <Badge variant="outline" className={cn("text-[10px] font-bold", gradeColor)}>
          {concept.grade}
        </Badge>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-xl bg-background/50 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">Win Rate</p>
          <p className={cn("text-sm font-bold", concept.winRate >= 50 ? "text-emerald-400" : "text-red-400")}>
            {pct(concept.winRate)}
          </p>
        </div>
        <div className="rounded-xl bg-background/50 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">P&L</p>
          <p className={cn("text-sm font-bold", concept.totalPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
            {fmt(concept.totalPnl)}
          </p>
        </div>
        <div className="rounded-xl bg-background/50 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">PF</p>
          <p className="text-sm font-bold text-foreground">
            {concept.profitFactor >= 1e15 ? "∞" : concept.profitFactor.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Volume bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Avg R:R: {concept.avgRiskReward.toFixed(1)}:1</span>
          <span className="text-muted-foreground">Exp: {fmt(concept.expectancy)}</span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary/40">
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", colors.bar)}
            style={{ width: `${Math.max(widthPct, 4)}%`, opacity: 0.6 }}
          />
        </div>
      </div>
    </div>
  )
}

interface ConceptPerformanceDashboardProps {
  filter: AnalyticsFilter
}

export function ConceptPerformanceDashboard({ filter }: ConceptPerformanceDashboardProps) {
  const [data, setData] = useState<ConceptPerformanceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await fetchConceptPerformance(filter)
      setData(result)
    } catch (err) {
      console.error("Failed to load concept performance:", err)
      setError("Could not load concept analytics.")
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => { void loadData() }, [loadData])

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border border-border/50 bg-secondary/20" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
        <Layers className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{error ?? "No concept data available."}</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Tag your trades with ICT concepts (OB, FVG, BOS, etc.) to see performance by concept.
        </p>
      </div>
    )
  }

  if (data.concepts.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
        <Layers className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No concept data yet.</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Add technical analysis tags when logging trades to unlock ICT concept performance analytics.
        </p>
      </div>
    )
  }

  const maxTrades = Math.max(...data.concepts.map((c) => c.totalTrades))
  const bestConcept = data.concepts.reduce((a, b) => a.winRate > b.winRate ? a : b)

  return (
    <div className="space-y-4">
      {/* Insight banner */}
      {data.concepts.length >= 2 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400">
            <span className="font-semibold">{bestConcept.conceptName}</span> is your highest-edge concept at {pct(bestConcept.winRate)} WR
          </span>
        </div>
      )}

      {/* Concept cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.concepts.map((concept, index) => (
          <ConceptRow key={concept.conceptId} concept={concept} index={index} maxTrades={maxTrades} />
        ))}
      </div>
    </div>
  )
}

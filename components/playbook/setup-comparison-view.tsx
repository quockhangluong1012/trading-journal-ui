"use client"

import { useCallback, useEffect, useState } from "react"
import { GitCompare, Loader2, Zap } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { compareSetups, type PlaybookSetupCard, type SetupComparison, GRADE_COLORS } from "@/lib/playbook-api"
import type { AnalyticsFilter } from "@/lib/analytics-api"

interface Props {
  initialSetupId: number
  allSetups: PlaybookSetupCard[]
  filter: AnalyticsFilter
}

const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v)

function MetricRow({ label, a, b, format = "num", higher = true }: {
  label: string; a: number; b: number; format?: "num" | "usd" | "pct" | "ratio"; higher?: boolean
}) {
  const fmtV = (v: number) => {
    if (format === "usd") return fmt(v)
    if (format === "pct") return `${v.toFixed(1)}%`
    if (format === "ratio") return `${v.toFixed(2)}:1`
    return v >= 1e15 ? "∞" : v.toFixed(2)
  }
  const aW = higher ? a > b : a < b
  const bW = higher ? b > a : b < a
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-border/40 bg-secondary/10 px-4 py-2.5">
      <div className="text-right">
        <span className={cn("text-sm font-semibold tabular-nums", aW ? "text-emerald-400" : "text-foreground/70")}>{fmtV(a)}</span>
        {aW && <span className="ml-1 text-[10px] text-emerald-500">★</span>}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground text-center">{label}</span>
      <div className="text-left">
        {bW && <span className="mr-1 text-[10px] text-emerald-500">★</span>}
        <span className={cn("text-sm font-semibold tabular-nums", bW ? "text-emerald-400" : "text-foreground/70")}>{fmtV(b)}</span>
      </div>
    </div>
  )
}

export function SetupComparisonView({ initialSetupId, allSetups, filter }: Props) {
  const [idA, setIdA] = useState(initialSetupId)
  const [idB, setIdB] = useState<number | null>(null)
  const [data, setData] = useState<SetupComparison | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!idB) return
    setLoading(true)
    try { setData(await compareSetups(idA, idB, filter)) } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [idA, idB, filter])

  useEffect(() => { if (idB) void load() }, [load, idB])

  const others = allSetups.filter(s => s.setupId !== idA)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Select value={String(idA)} onValueChange={v => { setIdA(Number(v)); setData(null) }}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Setup A" /></SelectTrigger>
          <SelectContent>{allSetups.map(s => <SelectItem key={s.setupId} value={String(s.setupId)} disabled={s.setupId === idB}>{s.setupName}</SelectItem>)}</SelectContent>
        </Select>
        <div className="rounded-full border border-border/50 bg-secondary/30 p-2"><GitCompare className="h-4 w-4 text-primary" /></div>
        <Select value={idB ? String(idB) : ""} onValueChange={v => setIdB(Number(v))}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Setup B" /></SelectTrigger>
          <SelectContent>{others.map(s => <SelectItem key={s.setupId} value={String(s.setupId)}>{s.setupName}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!idB && <div className="flex flex-col items-center py-8"><GitCompare className="h-10 w-10 text-muted-foreground/30" /><p className="mt-3 text-sm text-muted-foreground">Select a second setup to compare</p></div>}
      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {data && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            {[data.setupA, data.setupB].map((m, i) => (
              <div key={m.setupId} className="text-center space-y-1">
                <h4 className="text-sm font-bold text-foreground truncate">{m.setupName}</h4>
                <span className={cn("inline-flex rounded-lg border px-2 py-0.5 text-xs font-bold", GRADE_COLORS[m.grade] || GRADE_COLORS["N/A"])}>{m.grade}</span>
                <p className="text-xs text-muted-foreground">{m.totalTrades} trades</p>
              </div>
            )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, <div key="vs" className="pt-2 text-muted-foreground/40 text-sm font-medium">vs</div>, el], [])}
          </div>
          <div className="space-y-1.5">
            <MetricRow label="Win Rate" a={data.setupA.winRate} b={data.setupB.winRate} format="pct" />
            <MetricRow label="Profit Factor" a={data.setupA.profitFactor} b={data.setupB.profitFactor} />
            <MetricRow label="Expectancy" a={data.setupA.expectancy} b={data.setupB.expectancy} format="usd" />
            <MetricRow label="Total P&L" a={data.setupA.totalPnl} b={data.setupB.totalPnl} format="usd" />
            <MetricRow label="Avg Win" a={data.setupA.avgWin} b={data.setupB.avgWin} format="usd" />
            <MetricRow label="Avg Loss" a={data.setupA.avgLoss} b={data.setupB.avgLoss} format="usd" higher={false} />
            <MetricRow label="Avg R:R" a={data.setupA.avgRiskReward} b={data.setupB.avgRiskReward} format="ratio" />
            <MetricRow label="Hold (days)" a={data.setupA.avgHoldingDays} b={data.setupB.avgHoldingDays} />
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div><h4 className="text-sm font-semibold text-foreground">Recommendation</h4><p className="mt-1 text-sm text-foreground/80 leading-relaxed">{data.recommendation}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

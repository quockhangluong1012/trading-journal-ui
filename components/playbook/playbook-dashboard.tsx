"use client"

import { useState, useCallback, type ElementType } from "react"
import {
  Award, BookOpen, Crosshair, Eye, GitCompare, MoreVertical, RefreshCw,
  Shield, Skull, Sparkles, Target, TrendingDown, TrendingUp, Trophy, Zap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  type PlaybookOverview, type PlaybookSetupCard,
  SETUP_STATUS_LABELS, GRADE_COLORS,
  retireSetup, reactivateSetup,
} from "@/lib/playbook-api"
import { AnalyticsFilter, FILTER_LABELS } from "@/lib/analytics-api"
import { AiPlaybookOptimizerCard } from "./ai-playbook-optimizer-card"
import { PlaybookDetailView } from "./playbook-detail-view"
import { SetupComparisonView } from "./setup-comparison-view"
import { RetireDialog } from "./retire-dialog"

interface PlaybookDashboardProps {
  overview: PlaybookOverview | null
  isLoading: boolean
  range: string
  rangeOptions: readonly { label: string }[]
  onRangeChange: (range: string) => void
  onRefresh: () => void
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v)

function GradeBadge({ grade }: { grade: string }) {
  const colors = GRADE_COLORS[grade] || GRADE_COLORS["N/A"]
  return (
    <span className={cn("inline-flex items-center rounded-lg border px-2.5 py-1 text-sm font-bold", colors)}>
      {grade}
    </span>
  )
}

function StatPill({ label, value, icon: Icon, color = "text-foreground" }: {
  label: string; value: string; icon: ElementType; color?: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/20 px-3 py-2">
      <Icon className={cn("h-3.5 w-3.5", color)} />
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={cn("text-sm font-semibold", color)}>{value}</span>
      </div>
    </div>
  )
}

function SetupCard({ setup, onViewDetail, onCompare, onRetire, onReactivate }: {
  setup: PlaybookSetupCard
  onViewDetail: () => void
  onCompare: () => void
  onRetire: () => void
  onReactivate: () => void
}) {
  const isRetired = setup.status === 4
  const pnlColor = setup.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
  const wrColor = setup.winRate >= 55 ? "text-emerald-400" : setup.winRate >= 45 ? "text-amber-400" : "text-red-400"

  return (
    <Card className={cn(
      "group relative overflow-hidden border-border/70 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
      isRetired && "opacity-60 hover:opacity-80"
    )}>
      {/* Gradient top accent based on grade */}
      <div className={cn(
        "absolute inset-x-0 top-0 h-1 rounded-t-xl transition-all duration-300",
        setup.grade === "A" ? "bg-emerald-500" :
        setup.grade === "B" ? "bg-blue-500" :
        setup.grade === "C" ? "bg-amber-500" :
        setup.grade === "D" ? "bg-orange-500" :
        setup.grade === "F" ? "bg-red-500" : "bg-muted"
      )} />

      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">{setup.setupName}</h3>
              {isRetired && (
                <Badge variant="outline" className="shrink-0 border-red-500/30 bg-red-500/10 text-red-400 text-[10px]">
                  <Skull className="mr-1 h-3 w-3" />Retired
                </Badge>
              )}
            </div>
            {setup.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{setup.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <GradeBadge grade={setup.grade} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewDetail}>
                  <Eye className="mr-2 h-4 w-4" />View playbook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCompare}>
                  <GitCompare className="mr-2 h-4 w-4" />Compare
                </DropdownMenuItem>
                {isRetired ? (
                  <DropdownMenuItem onClick={onReactivate} className="text-emerald-400">
                    <RefreshCw className="mr-2 h-4 w-4" />Reactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onRetire} className="text-red-400">
                    <Skull className="mr-2 h-4 w-4" />Retire setup
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatPill label="Trades" value={String(setup.totalTrades)} icon={Crosshair} />
          <StatPill label="Win Rate" value={`${setup.winRate.toFixed(1)}%`} icon={Target} color={wrColor} />
          <StatPill label="P&L" value={fmt(setup.totalPnl)} icon={setup.totalPnl >= 0 ? TrendingUp : TrendingDown} color={pnlColor} />
          <StatPill label="Expectancy" value={fmt(setup.expectancy)} icon={Zap} color={setup.expectancy > 0 ? "text-emerald-400" : "text-red-400"} />
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Award className="h-3 w-3" />PF: <span className={cn("font-semibold", setup.profitFactor >= 1.5 ? "text-emerald-400" : setup.profitFactor >= 1 ? "text-amber-400" : "text-red-400")}>
              {setup.profitFactor >= 1e15 ? "∞" : setup.profitFactor.toFixed(2)}
            </span>
          </span>
          <span className="flex items-center gap-1">
            R:R: <span className="font-semibold text-foreground">{setup.avgRiskReward.toFixed(1)}:1</span>
          </span>
          <span>{setup.wins}W / {setup.losses}L</span>
        </div>
      </CardContent>
    </Card>
  )
}

function OverviewHeader({ overview }: { overview: PlaybookOverview }) {
  return (
    <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm">
      <CardContent className="px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Trade Playbook</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Your strategy library — track which setups make money and which to retire.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2">
              <Crosshair className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Setups:</span>
              <span className="text-sm font-bold text-foreground">{overview.totalSetups}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-muted-foreground">Active:</span>
              <span className="text-sm font-bold text-emerald-400">{overview.activeSetups}</span>
            </div>
            {overview.retiredSetups > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
                <Skull className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs text-muted-foreground">Retired:</span>
                <span className="text-sm font-bold text-red-400">{overview.retiredSetups}</span>
              </div>
            )}
          </div>
        </div>

        {(overview.topSetupName || overview.worstSetupName) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {overview.topSetupName && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
                <Trophy className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">Top performer:</span>
                <span className="text-sm font-semibold text-emerald-400">{overview.topSetupName}</span>
              </div>
            )}
            {overview.worstSetupName && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2">
                <Shield className="h-4 w-4 text-red-400" />
                <span className="text-xs text-muted-foreground">Needs review:</span>
                <span className="text-sm font-semibold text-red-400">{overview.worstSetupName}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="border-border/70 shadow-sm">
        <CardContent className="px-6 py-6">
          <Skeleton className="h-8 w-60 rounded-xl" />
          <Skeleton className="mt-2 h-4 w-96 rounded-md" />
          <div className="mt-4 flex gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/70">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-8 w-10 rounded-lg" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="mt-3 h-4 w-48 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function PlaybookDashboard({ overview, isLoading, range, rangeOptions, onRangeChange, onRefresh }: PlaybookDashboardProps) {
  const [selectedSetupId, setSelectedSetupId] = useState<number | null>(null)
  const [compareSetupId, setCompareSetupId] = useState<number | null>(null)
  const [retireSetupId, setRetireSetupId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [retireOpen, setRetireOpen] = useState(false)

  const handleRetire = useCallback(async (setupId: number, reason: string) => {
    await retireSetup(setupId, reason)
    setRetireOpen(false)
    onRefresh()
  }, [onRefresh])

  const handleReactivate = useCallback(async (setupId: number) => {
    await reactivateSetup(setupId)
    onRefresh()
  }, [onRefresh])

  if (isLoading || !overview) return <DashboardSkeleton />

  const activeSetups = overview.setups.filter(s => s.status !== 4)
  const retiredSetups = overview.setups.filter(s => s.status === 4)
  const filter = FILTER_LABELS[range] ?? AnalyticsFilter.AllTime

  return (
    <div className="space-y-6">
      <OverviewHeader overview={overview} />

      {/* Time range selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">Period:</span>
        {rangeOptions.map((r) => (
          <Button
            key={r.label}
            variant={range === r.label ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 rounded-xl text-xs",
              range === r.label && "bg-primary text-primary-foreground shadow-md"
            )}
            onClick={() => onRangeChange(r.label)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <AiPlaybookOptimizerCard rangeLabel={range as "1W" | "1M" | "3M" | "6M" | "All"} />

      {/* Setup cards */}
      {overview.setups.length === 0 ? (
        <Card className="border-border/70">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">No setups yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create your first trading setup to start building your playbook.</p>
            <Button className="mt-4" onClick={() => window.location.href = "/setup"}>
              <Crosshair className="mr-2 h-4 w-4" />Go to setups
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeSetups.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />Active Setups
                <span className="text-muted-foreground font-normal">({activeSetups.length})</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeSetups.map((s) => (
                  <SetupCard
                    key={s.setupId}
                    setup={s}
                    onViewDetail={() => { setSelectedSetupId(s.setupId); setDetailOpen(true) }}
                    onCompare={() => { setCompareSetupId(s.setupId); setCompareOpen(true) }}
                    onRetire={() => { setRetireSetupId(s.setupId); setRetireOpen(true) }}
                    onReactivate={() => handleReactivate(s.setupId)}
                  />
                ))}
              </div>
            </div>
          )}

          {retiredSetups.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Skull className="h-4 w-4 text-red-400" />Retired Setups
                <span className="font-normal">({retiredSetups.length})</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {retiredSetups.map((s) => (
                  <SetupCard
                    key={s.setupId}
                    setup={s}
                    onViewDetail={() => { setSelectedSetupId(s.setupId); setDetailOpen(true) }}
                    onCompare={() => { setCompareSetupId(s.setupId); setCompareOpen(true) }}
                    onRetire={() => {}}
                    onReactivate={() => handleReactivate(s.setupId)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Playbook detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-border/70 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />Playbook Detail
            </DialogTitle>
            <DialogDescription>Entry/exit rules, market conditions, and performance for this setup.</DialogDescription>
          </DialogHeader>
          {selectedSetupId && (
            <PlaybookDetailView
              setupId={selectedSetupId}
              performance={overview.setups.find(s => s.setupId === selectedSetupId) ?? null}
              onClose={() => setDetailOpen(false)}
              onSaved={onRefresh}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Compare dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto border-border/70 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" />Compare Setups
            </DialogTitle>
            <DialogDescription>Side-by-side performance comparison of two trading setups.</DialogDescription>
          </DialogHeader>
          {compareSetupId && (
            <SetupComparisonView
              initialSetupId={compareSetupId}
              allSetups={overview.setups}
              filter={filter}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Retire dialog */}
      {retireSetupId && (
        <RetireDialog
          open={retireOpen}
          onOpenChange={setRetireOpen}
          setupName={overview.setups.find(s => s.setupId === retireSetupId)?.setupName ?? ""}
          onConfirm={(reason) => handleRetire(retireSetupId, reason)}
        />
      )}
    </div>
  )
}

"use client"

import {
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { DailyNoteDto } from "@/lib/daily-notes-api"

// ─── Helpers ──────────────────────────────────────────────────────────

const biasConfig = {
  Bullish: { icon: TrendingUp, label: "Bullish", className: "text-emerald-600 dark:text-emerald-400" },
  Bearish: { icon: TrendingDown, label: "Bearish", className: "text-red-500 dark:text-red-400" },
  Neutral: { icon: Minus, label: "Neutral", className: "text-amber-500 dark:text-amber-400" },
} as const

const riskConfig = {
  Conservative: { className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  Normal: { className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  Aggressive: { className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" },
} as const

// ─── Props ────────────────────────────────────────────────────────────

interface DailyNotesBannerProps {
  note: DailyNoteDto | null
  isLoading: boolean
  onClick: () => void
}

// ─── Component ────────────────────────────────────────────────────────

export function DailyNotesBanner({ note, isLoading, onClick }: DailyNotesBannerProps) {
  if (isLoading) return null

  // ── Empty state: pulsing call-to-action ───────────────────────────
  if (!note) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="
          group relative w-full overflow-hidden rounded-2xl border-2 border-dashed
          border-primary/30 bg-gradient-to-r from-primary/5 via-primary/8 to-accent/5
          px-5 py-4 text-left transition-all duration-300
          hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5
          dark:from-primary/10 dark:via-primary/12 dark:to-accent/8
        "
        id="daily-notes-banner-empty"
      >
        {/* Pulse ring */}
        <div className="absolute top-3 right-4 flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Start your daily briefing
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Set your bias, mark key levels, and prepare your mindset before trading
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
        </div>
      </button>
    )
  }

  // ── Filled state: compact summary ─────────────────────────────────
  const bias = note.dailyBias as keyof typeof biasConfig
  const biasInfo = biasConfig[bias]
  const risk = note.riskAppetite as keyof typeof riskConfig
  const riskInfo = riskConfig[risk]
  const sessions = note.sessionFocus ? note.sessionFocus.split(",").filter(Boolean) : []

  // Count how many fields are filled
  const filledFields = [
    note.dailyBias,
    note.marketStructureNotes,
    note.keyLevelsAndLiquidity,
    note.newsAndEvents,
    note.sessionFocus,
    note.riskAppetite,
    note.mentalState,
    note.keyRulesAndReminders,
  ].filter((v) => v?.trim()).length

  // Check if key fields are missing (to show a subtle warning)
  const missingKeyFields = !note.dailyBias || !note.keyLevelsAndLiquidity

  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group relative w-full overflow-hidden rounded-2xl border border-border/70
        bg-gradient-to-r from-background via-background to-background
        px-5 py-4 text-left transition-all duration-300
        hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5
        dark:border-border/50
      "
      id="daily-notes-banner-filled"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-accent/3 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Compass className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Today&apos;s Trading Plan</span>
            <Badge variant="outline" className="border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              {filledFields}/8 fields
            </Badge>
            {missingKeyFields && (
              <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]">
                <AlertCircle className="h-3 w-3" />
                Incomplete
              </Badge>
            )}
          </div>

          {/* Quick summary chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {biasInfo && (
              <Badge variant="outline" className="gap-1 border-border/50 bg-background/80">
                <biasInfo.icon className={`h-3 w-3 ${biasInfo.className}`} />
                <span className="text-xs">{biasInfo.label}</span>
              </Badge>
            )}

            {riskInfo && (
              <Badge variant="outline" className={`text-xs ${riskInfo.className}`}>
                <Shield className="mr-1 h-3 w-3" />
                {risk}
              </Badge>
            )}

            {sessions.length > 0 && (
              <Badge variant="outline" className="gap-1 border-border/50 bg-background/80">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">{sessions.join(", ")}</span>
              </Badge>
            )}

            {note.keyLevelsAndLiquidity?.trim() && (
              <Badge variant="outline" className="border-border/50 bg-background/80 text-xs max-w-[200px] truncate">
                📊 Levels noted
              </Badge>
            )}

            {note.newsAndEvents?.trim() && (
              <Badge variant="outline" className="border-border/50 bg-background/80 text-xs">
                📰 News flagged
              </Badge>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}

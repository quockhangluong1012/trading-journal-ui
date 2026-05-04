"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Trophy,
  SkullIcon,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getCurrentStreak,
  recalculateStreak,
  type StreakData,
} from "@/lib/streak-api";

const STREAK_THEMES = {
  Win: {
    icon: Flame,
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/20 via-emerald-400/5 to-transparent",
    ring: "ring-emerald-500/20",
    pnlColor: "text-emerald-400",
    label: "Winning Streak",
    emoji: "🔥",
  },
  Loss: {
    icon: TrendingDown,
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/20",
    gradient: "from-red-500/20 via-red-400/5 to-transparent",
    ring: "ring-red-500/20",
    pnlColor: "text-red-400",
    label: "Losing Streak",
    emoji: "💀",
  },
  None: {
    icon: Target,
    bg: "bg-muted/30",
    text: "text-muted-foreground",
    border: "border-border/50",
    gradient: "from-muted/10 via-transparent to-transparent",
    ring: "ring-border/20",
    pnlColor: "text-muted-foreground",
    label: "No Active Streak",
    emoji: "—",
  },
} as const;

function getStreakMessage(streak: StreakData): string {
  if (streak.streakType === "None" || streak.length === 0) {
    return "No active streak. Your next trade starts a new chapter.";
  }

  if (streak.streakType === "Win") {
    if (streak.length >= 10) return "Legendary run! Stay disciplined — protect your gains.";
    if (streak.length >= 7) return "Incredible streak! Don't let overconfidence slip in.";
    if (streak.length >= 5) return "You're on fire! Keep your edge — follow your rules.";
    if (streak.length >= 3) return "Strong momentum building. Stay focused.";
    return "Good start. Let your process do the work.";
  }

  // Loss streak
  if (streak.length >= 5) return "Extended drawdown — strongly consider pausing to reset.";
  if (streak.length >= 3) return "Multiple losses in a row. Step back and review your setups.";
  return "Consecutive losses. Stay calm and stick to your plan.";
}

function getStreakIntensity(streak: StreakData): number {
  if (streak.streakType === "None") return 0;
  // Returns 0-100 based on streak length, capped at 10
  return Math.min(100, (streak.length / 10) * 100);
}

export function StreakWidget() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchStreak = useCallback(async () => {
    try {
      const data = await getCurrentStreak();
      setStreak(data);
    } catch {
      // Widget is non-critical — fail silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const data = await recalculateStreak();
      setStreak(data);
    } catch {
      // Silently handle
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  const type = streak?.streakType ?? "None";
  const theme = STREAK_THEMES[type] ?? STREAK_THEMES.None;
  const ThemeIcon = theme.icon;
  const length = streak?.length ?? 0;
  const message = streak ? getStreakMessage(streak) : "";
  const intensity = streak ? getStreakIntensity(streak) : 0;
  const isActive = type !== "None" && length > 0;
  const isWarning = type === "Loss" && length >= 3;

  return (
    <Card
      className={`relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-500 ${
        isWarning ? "ring-2 ring-red-500/30" : ""
      }`}
    >
      {/* Intensity gradient background */}
      {isActive && (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} pointer-events-none`}
          style={{ opacity: Math.min(0.6, intensity / 100) }}
        />
      )}

      <CardHeader className="relative flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Zap className="h-4 w-4" />
          Streak Tracker
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleRecalculate}
          disabled={isRecalculating}
          title="Recalculate streak"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRecalculating ? "animate-spin" : ""}`}
          />
        </Button>
      </CardHeader>

      <CardContent className="relative space-y-4">
        <div className="flex items-center gap-5">
          {/* Streak counter */}
          <div className="relative flex-shrink-0">
            <div
              className={`flex h-[100px] w-[100px] flex-col items-center justify-center rounded-2xl border ${theme.border} ${theme.bg} transition-all duration-500`}
            >
              <span className="text-lg">{theme.emoji}</span>
              <span className={`text-3xl font-bold tabular-nums ${theme.text}`}>
                {length}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {length === 1 ? "trade" : "trades"}
              </span>
            </div>

            {/* Pulse animation for hot streaks */}
            {isActive && length >= 5 && (
              <div
                className={`absolute inset-0 rounded-2xl ${theme.ring} ring-2 animate-ping opacity-20`}
              />
            )}
          </div>

          {/* Info panel */}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`${theme.bg} ${theme.text} border-0 text-xs font-semibold gap-1`}
              >
                <ThemeIcon className="h-3 w-3" />
                {theme.label}
              </Badge>
              {isActive && (
                <Badge
                  variant="outline"
                  className={`${theme.bg} ${theme.pnlColor} border-0 text-xs`}
                >
                  {(streak?.streakPnl ?? 0) >= 0 ? "+" : ""}
                  {(streak?.streakPnl ?? 0).toFixed(2)}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {message}
            </p>

            {/* Historical records & stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trophy className="h-3 w-3 text-amber-400" />
                <span>Best: {streak?.bestWinStreak ?? 0}W</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SkullIcon className="h-3 w-3 text-red-400" />
                <span>Worst: {streak?.worstLossStreak ?? 0}L</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BarChart3 className="h-3 w-3 text-blue-400" />
                <span>{streak?.totalClosedTrades ?? 0} trades</span>
              </div>
            </div>
          </div>
        </div>

        {/* Streak intensity bar */}
        {isActive && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Streak intensity</span>
              <span className={theme.text}>{length} consecutive</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${
                  type === "Win"
                    ? "from-emerald-500 to-emerald-400"
                    : "from-red-500 to-red-400"
                } transition-all duration-1000 ease-out`}
                style={{ width: `${intensity}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

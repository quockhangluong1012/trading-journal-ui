"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Trophy,
  Star,
  Flame,
  Crown,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getKarmaSummary,
  recalculateKarma,
  type KarmaSummary,
  type KarmaEvent,
} from "@/lib/karma-api";
import Link from "next/link";

const LEVEL_ICONS: Record<number, typeof Star> = {
  1: Star,
  2: Star,
  3: TrendingUp,
  4: TrendingUp,
  5: Zap,
  6: Zap,
  7: Award,
  8: Crown,
  9: Crown,
  10: Crown,
};

const LEVEL_COLORS: Record<number, { bg: string; text: string; gradient: string; ring: string }> = {
  1: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    gradient: "from-slate-500/20 via-slate-400/5 to-transparent",
    ring: "ring-slate-500/20",
  },
  2: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    gradient: "from-emerald-500/20 via-emerald-400/5 to-transparent",
    ring: "ring-emerald-500/20",
  },
  3: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    gradient: "from-blue-500/20 via-blue-400/5 to-transparent",
    ring: "ring-blue-500/20",
  },
  4: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    gradient: "from-violet-500/20 via-violet-400/5 to-transparent",
    ring: "ring-violet-500/20",
  },
  5: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    gradient: "from-amber-500/20 via-amber-400/5 to-transparent",
    ring: "ring-amber-500/20",
  },
  6: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    gradient: "from-orange-500/20 via-orange-400/5 to-transparent",
    ring: "ring-orange-500/20",
  },
  7: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    gradient: "from-rose-500/20 via-rose-400/5 to-transparent",
    ring: "ring-rose-500/20",
  },
  8: {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-400",
    gradient: "from-fuchsia-500/20 via-fuchsia-400/5 to-transparent",
    ring: "ring-fuchsia-500/20",
  },
  9: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-300",
    gradient: "from-cyan-500/20 via-cyan-400/5 to-transparent",
    ring: "ring-cyan-500/20",
  },
  10: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-300",
    gradient: "from-yellow-500/30 via-amber-400/10 to-transparent",
    ring: "ring-yellow-500/30",
  },
};

function getEventIcon(actionType: string): string {
  switch (actionType) {
    case "TradeJournaled":
      return "📝";
    case "TradeReviewed":
      return "🔍";
    case "PsychologyJournalEntry":
      return "🧠";
    case "DailyJournalingStreak":
      return "🔥";
    case "WeeklyReviewCompleted":
      return "📋";
    case "WinStreakBonus":
      return "🎯";
    case "RuleBrokenPenalty":
      return "⚠️";
    case "TiltRecovery":
      return "🧘";
    default:
      return "✨";
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function KarmaWidget() {
  const [summary, setSummary] = useState<KarmaSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getKarmaSummary();
      setSummary(data);
    } catch {
      // Widget is non-critical — fail silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const data = await recalculateKarma();
      setSummary(data);
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

  const level = summary?.level ?? 1;
  const clampedLevel = Math.min(level, 10);
  const colors = LEVEL_COLORS[clampedLevel] ?? LEVEL_COLORS[1];
  const LevelIcon = LEVEL_ICONS[clampedLevel] ?? Star;
  const totalKarma = summary?.totalKarma ?? 0;
  const title = summary?.title ?? "Novice Trader";
  const progress = summary?.levelProgress ?? 0;
  const pointsToNext = summary?.pointsToNextLevel ?? 0;
  const unlockedAchievements = summary?.unlockedAchievements ?? 0;
  const totalAchievements = summary?.totalAchievements ?? 0;
  const journalingStreak = summary?.currentJournalingStreak ?? 0;
  const recentEvents = summary?.recentEvents ?? [];

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-500 col-span-full">
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} pointer-events-none`}
        style={{ opacity: 0.5 }}
      />

      <CardHeader className="relative flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Karma Score
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            title="Recalculate karma from all activity"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRecalculating ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        <div className="flex items-start gap-6">
          {/* Karma score + level badge */}
          <div className="relative flex-shrink-0">
            <div
              className={`flex h-[110px] w-[110px] flex-col items-center justify-center rounded-2xl border ${colors.bg} border-border/30 transition-all duration-500`}
            >
              <LevelIcon className={`h-5 w-5 ${colors.text} mb-0.5`} />
              <span className={`text-3xl font-bold tabular-nums ${colors.text}`}>
                {totalKarma.toLocaleString()}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                karma
              </span>
            </div>

            {/* Glow effect for high levels */}
            {level >= 5 && (
              <div
                className={`absolute inset-0 rounded-2xl ${colors.ring} ring-2 animate-pulse opacity-30`}
              />
            )}
          </div>

          {/* Info panel */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Level & title */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`${colors.bg} ${colors.text} border-0 text-xs font-semibold gap-1`}
              >
                <LevelIcon className="h-3 w-3" />
                Level {level}
              </Badge>
              <span className={`text-sm font-medium ${colors.text}`}>
                {title}
              </span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trophy className="h-3 w-3 text-amber-400" />
                <span>
                  {unlockedAchievements}/{totalAchievements} badges
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Flame className="h-3 w-3 text-orange-400" />
                <span>{journalingStreak}d streak</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span>{pointsToNext > 0 ? `${pointsToNext} to next` : "Max level"}</span>
              </div>
            </div>

            {/* Level progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Level {level} progress</span>
                <span className={colors.text}>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out`}
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent karma events */}
        {recentEvents.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Recent Activity
              </span>
              <Link
                href="/karma"
                className="flex items-center gap-0.5 text-[10px] text-primary hover:underline"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {recentEvents.slice(0, 4).map((event, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm flex-shrink-0">{getEventIcon(event.actionType)}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {event.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        event.points >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {event.points >= 0 ? "+" : ""}
                      {event.points}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 w-12 text-right">
                      {formatTimeAgo(event.recordedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

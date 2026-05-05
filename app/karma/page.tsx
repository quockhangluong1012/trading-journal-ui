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
  History,
  Lock,
  CheckCircle2,
  Shield,
  Swords,
  Gem,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/header";
import {
  getKarmaSummary,
  getKarmaHistory,
  getAchievements,
  recalculateKarma,
  type KarmaSummary,
  type KarmaEvent,
  type Achievement,
} from "@/lib/karma-api";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { buildRedirectWithNext } from "@/lib/auth-redirect";
import { AppShellLoader } from "@/components/app-shell-loader";

// ── Constants ─────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<number, { icon: typeof Star; color: string; bg: string; gradient: string }> = {
  1: { icon: Star, color: "text-slate-400", bg: "bg-slate-500/10", gradient: "from-slate-600 to-slate-400" },
  2: { icon: Star, color: "text-emerald-400", bg: "bg-emerald-500/10", gradient: "from-emerald-600 to-emerald-400" },
  3: { icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10", gradient: "from-blue-600 to-blue-400" },
  4: { icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10", gradient: "from-violet-600 to-violet-400" },
  5: { icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10", gradient: "from-amber-600 to-amber-400" },
  6: { icon: Zap, color: "text-orange-400", bg: "bg-orange-500/10", gradient: "from-orange-600 to-orange-400" },
  7: { icon: Award, color: "text-rose-400", bg: "bg-rose-500/10", gradient: "from-rose-600 to-rose-400" },
  8: { icon: Award, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", gradient: "from-fuchsia-600 to-fuchsia-400" },
  9: { icon: Crown, color: "text-cyan-300", bg: "bg-cyan-500/10", gradient: "from-cyan-500 to-cyan-300" },
  10: { icon: Crown, color: "text-yellow-300", bg: "bg-yellow-500/10", gradient: "from-yellow-500 to-yellow-300" },
  11: { icon: Shield, color: "text-teal-400", bg: "bg-teal-500/10", gradient: "from-teal-600 to-teal-400" },
  12: { icon: Shield, color: "text-sky-400", bg: "bg-sky-500/10", gradient: "from-sky-600 to-sky-400" },
  13: { icon: Shield, color: "text-lime-400", bg: "bg-lime-500/10", gradient: "from-lime-600 to-lime-400" },
  14: { icon: Swords, color: "text-pink-400", bg: "bg-pink-500/10", gradient: "from-pink-600 to-pink-400" },
  15: { icon: Swords, color: "text-indigo-400", bg: "bg-indigo-500/10", gradient: "from-indigo-600 to-indigo-400" },
  16: { icon: Swords, color: "text-emerald-300", bg: "bg-emerald-400/10", gradient: "from-emerald-500 to-emerald-300" },
  17: { icon: Gem, color: "text-violet-300", bg: "bg-violet-400/10", gradient: "from-violet-500 to-violet-300" },
  18: { icon: Gem, color: "text-blue-300", bg: "bg-blue-400/10", gradient: "from-blue-500 to-blue-300" },
  19: { icon: Gem, color: "text-rose-300", bg: "bg-rose-400/10", gradient: "from-rose-500 to-rose-300" },
  20: { icon: Gem, color: "text-amber-300", bg: "bg-amber-400/10", gradient: "from-amber-500 to-amber-300" },
  21: { icon: Crown, color: "text-fuchsia-300", bg: "bg-fuchsia-400/10", gradient: "from-fuchsia-500 to-fuchsia-300" },
  22: { icon: Crown, color: "text-cyan-200", bg: "bg-cyan-400/10", gradient: "from-cyan-400 to-cyan-200" },
  23: { icon: Crown, color: "text-orange-300", bg: "bg-orange-400/10", gradient: "from-orange-500 to-orange-300" },
  24: { icon: Crown, color: "text-red-300", bg: "bg-red-400/10", gradient: "from-red-500 to-red-300" },
  25: { icon: Crown, color: "text-yellow-200", bg: "bg-yellow-400/15", gradient: "from-yellow-400 to-yellow-200" },
};

const CATEGORY_COLORS: Record<string, string> = {
  Trades: "text-blue-400",
  Reviews: "text-emerald-400",
  Streaks: "text-orange-400",
  Performance: "text-violet-400",
  Karma: "text-amber-400",
  Psychology: "text-rose-400",
  Preparation: "text-cyan-400",
  RiskManagement: "text-teal-400",
  Recovery: "text-lime-400",
  Diversification: "text-sky-400",
  ICT: "text-indigo-400",
  Profit: "text-emerald-300",
  PropFirm: "text-fuchsia-400",
  Elite: "text-yellow-400",
};

function getEventEmoji(actionType: string): string {
  const map: Record<string, string> = {
    TradeJournaled: "📝",
    TradeReviewed: "🔍",
    PsychologyJournalEntry: "🧠",
    DailyJournalingStreak: "🔥",
    WeeklyReviewCompleted: "📋",
    WinStreakBonus: "🎯",
    RuleBrokenPenalty: "⚠️",
    TiltRecovery: "🧘",
    DailyNoteWritten: "📋",
    SystemAdjustment: "⚙️",
  };
  return map[actionType] ?? "✨";
}

function getEventLabel(actionType: string): string {
  const map: Record<string, string> = {
    TradeJournaled: "Trade Logged",
    TradeReviewed: "Trade Reviewed",
    PsychologyJournalEntry: "Journal Entry",
    DailyJournalingStreak: "Daily Streak",
    WeeklyReviewCompleted: "Weekly Review",
    WinStreakBonus: "Win Streak Bonus",
    RuleBrokenPenalty: "Rule Broken",
    TiltRecovery: "Tilt Recovery",
    DailyNoteWritten: "Daily Note",
    SystemAdjustment: "System Adjustment",
  };
  return map[actionType] ?? actionType;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Main Page Component ──────────────────────────────────────────────

function KarmaPageContent() {
  const [summary, setSummary] = useState<KarmaSummary | null>(null);
  const [history, setHistory] = useState<KarmaEvent[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [historyDays, setHistoryDays] = useState(30);
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const fetchAll = useCallback(async () => {
    try {
      const [summaryData, historyData, achievementsData] = await Promise.all([
        getKarmaSummary(),
        getKarmaHistory(historyDays),
        getAchievements(),
      ]);
      setSummary(summaryData);
      setHistory(historyData);
      setAchievements(achievementsData);
    } catch {
      // Handle gracefully
    } finally {
      setIsLoading(false);
    }
  }, [historyDays]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(buildRedirectWithNext("/login", pathname));
    }
  }, [user, isAuthLoading, pathname, router]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const data = await recalculateKarma();
      setSummary(data);
      const [historyData, achievementsData] = await Promise.all([
        getKarmaHistory(historyDays),
        getAchievements(),
      ]);
      setHistory(historyData);
      setAchievements(achievementsData);
    } catch {
      // Handle gracefully
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return <AppShellLoader title="Loading karma" description="Calculating your karma score and achievements..." />;
  }

  if (!user) {
    return <AppShellLoader title="Redirecting to sign in" description="Taking you to your karma dashboard shortly." />;
  }

  const level = summary?.level ?? 1;
  const clampedLevel = Math.min(level, 25);
  const config = LEVEL_CONFIG[clampedLevel] ?? LEVEL_CONFIG[1];
  const LevelIcon = config.icon;
  const totalKarma = summary?.totalKarma ?? 0;
  const title = summary?.title ?? "Novice Trader";
  const progress = summary?.levelProgress ?? 0;
  const pointsToNext = summary?.pointsToNextLevel ?? 0;
  const unlockedCount = summary?.unlockedAchievements ?? 0;
  const totalCount = summary?.totalAchievements ?? 0;
  const journalingStreak = summary?.currentJournalingStreak ?? 0;

  // Group achievements by category
  const achievementsByCategory = achievements.reduce<Record<string, Achievement[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen relative bg-slate-50 dark:bg-background overflow-hidden selection:bg-primary/20">
      {/* Background */}
      <div className="pointer-events-none absolute -inset-[10px] opacity-60 dark:opacity-40">
        <div className="absolute -top-24 -right-24 h-[600px] w-[600px] rounded-full bg-primary/10 dark:bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-[600px] w-[600px] rounded-full bg-secondary/20 dark:bg-secondary/20 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 dark:bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-amber-400" />
                  Karma & Achievements
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Track your journaling karma and unlock achievements through consistent trading discipline.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRecalculating ? "animate-spin" : ""}`} />
                Recalculate
              </Button>
            </div>

            {/* Hero karma card */}
            <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${config.bg} pointer-events-none opacity-50`}
              />
              <CardContent className="relative py-8">
                <div className="flex flex-col items-center text-center gap-4">
                  {/* Level icon */}
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-full ${config.bg} border border-border/30`}
                  >
                    <LevelIcon className={`h-10 w-10 ${config.color}`} />
                  </div>

                  {/* Karma total */}
                  <div>
                    <div className={`text-5xl font-bold tabular-nums ${config.color}`}>
                      {totalKarma.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">karma points</div>
                  </div>

                  {/* Level & title */}
                  <Badge variant="outline" className={`${config.bg} ${config.color} border-0 text-sm font-semibold gap-1.5 px-4 py-1`}>
                    <LevelIcon className="h-3.5 w-3.5" />
                    Level {level} — {title}
                  </Badge>

                  {/* Progress bar */}
                  <div className="w-full max-w-md space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Level {level}</span>
                      <span>{pointsToNext > 0 ? `${pointsToNext} pts to Level ${level + 1}` : "Max level reached!"}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted/30">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="flex gap-8 mt-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{unlockedCount}</div>
                      <div className="text-xs text-muted-foreground">Badges</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{journalingStreak}</div>
                      <div className="text-xs text-muted-foreground">Day Streak</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{totalCount}</div>
                      <div className="text-xs text-muted-foreground">Total Badges</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs: Achievements + History */}
            <Tabs defaultValue="achievements" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="achievements" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Achievements ({unlockedCount}/{totalCount})
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  Karma History
                </TabsTrigger>
              </TabsList>

              {/* Achievements Tab */}
              <TabsContent value="achievements" className="space-y-6 mt-4">
                {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => (
                  <div key={category} className="space-y-3">
                    <h3 className={`text-sm font-semibold flex items-center gap-2 ${CATEGORY_COLORS[category] ?? "text-muted-foreground"}`}>
                      {category}
                      <span className="text-xs text-muted-foreground font-normal">
                        {categoryAchievements.filter((a) => a.isUnlocked).length}/{categoryAchievements.length}
                      </span>
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryAchievements.map((achievement) => (
                        <Card
                          key={achievement.type}
                          className={`relative overflow-hidden border-border/50 transition-all duration-300 ${
                            achievement.isUnlocked
                              ? "bg-card/80 hover:bg-card/90 backdrop-blur-sm"
                              : "bg-muted/20 opacity-60"
                          }`}
                        >
                          <CardContent className="flex items-center gap-4 py-4">
                            {/* Emoji badge */}
                            <div
                              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border ${
                                achievement.isUnlocked
                                  ? "bg-primary/5 border-primary/20"
                                  : "bg-muted/30 border-border/30"
                              }`}
                            >
                              <span className={`text-2xl ${achievement.isUnlocked ? "" : "grayscale opacity-50"}`}>
                                {achievement.emoji}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold truncate">{achievement.name}</span>
                                {achievement.isUnlocked ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
                              {achievement.isUnlocked && achievement.unlockedAt && (
                                <p className="text-[10px] text-muted-foreground/60 mt-1">
                                  Unlocked {formatDate(achievement.unlockedAt)}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4 mt-4">
                {/* Time range selector */}
                <div className="flex gap-2">
                  {[7, 30, 90, 365].map((days) => (
                    <Button
                      key={days}
                      variant={historyDays === days ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHistoryDays(days)}
                    >
                      {days === 365 ? "1Y" : `${days}D`}
                    </Button>
                  ))}
                </div>

                {/* Event list */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="divide-y divide-border/30 p-0">
                    {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Sparkles className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">No karma events yet</p>
                        <p className="text-xs mt-1">Start journaling trades to earn karma!</p>
                      </div>
                    ) : (
                      history.map((event, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg flex-shrink-0">{getEventEmoji(event.actionType)}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{getEventLabel(event.actionType)}</div>
                              <div className="text-xs text-muted-foreground truncate">{event.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                            <span
                              className={`text-sm font-bold tabular-nums ${
                                event.points >= 0 ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {event.points >= 0 ? "+" : ""}
                              {event.points}
                            </span>
                            <span className="text-xs text-muted-foreground w-24 text-right">
                              {formatDate(event.recordedAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function KarmaPage() {
  return <KarmaPageContent />;
}

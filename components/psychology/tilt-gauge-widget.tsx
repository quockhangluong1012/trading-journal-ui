"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  Activity,
  TrendingDown,
  Clock,
  ShieldAlert,
  RefreshCw,
  Zap,
  Ban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTiltScore, recalculateTilt, type TiltScore } from "@/lib/tilt-api";

const TILT_COLORS: Record<string, { bg: string; text: string; ring: string; gradient: string }> = {
  Calm: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    ring: "ring-emerald-500/30",
    gradient: "from-emerald-500 to-emerald-400",
  },
  Elevated: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    ring: "ring-yellow-500/30",
    gradient: "from-yellow-500 to-amber-400",
  },
  Warning: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    ring: "ring-orange-500/30",
    gradient: "from-orange-500 to-orange-400",
  },
  High: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    ring: "ring-red-500/30",
    gradient: "from-red-500 to-red-400",
  },
  Critical: {
    bg: "bg-red-700/10",
    text: "text-red-700",
    ring: "ring-red-700/30",
    gradient: "from-red-700 to-red-600",
  },
};

const TILT_MESSAGES: Record<string, string> = {
  Calm: "You're trading with a clear mind. Stay focused.",
  Elevated: "Slight elevation detected. Monitor your state.",
  Warning: "Caution — consider reducing position size.",
  High: "High tilt detected. Strongly consider pausing.",
  Critical: "🚨 Circuit breaker! Take a mandatory break.",
};

export function TiltGaugeWidget() {
  const [tilt, setTilt] = useState<TiltScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchTilt = useCallback(async () => {
    try {
      const data = await getTiltScore();
      setTilt(data);
    } catch {
      // Silently handle — widget is non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTilt();
  }, [fetchTilt]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const data = await recalculateTilt();
      setTilt(data);
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

  const score = tilt?.score ?? 0;
  const level = tilt?.level ?? "Calm";
  const colors = TILT_COLORS[level] ?? TILT_COLORS.Calm;
  const message = TILT_MESSAGES[level] ?? "";
  const scorePercentage = score / 100;

  // SVG gauge calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - scorePercentage);

  return (
    <Card className={`relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-500 ${tilt?.circuitBreakerTriggered ? "ring-2 ring-red-500/50 animate-pulse" : ""}`}>
      {/* Circuit breaker banner */}
      {tilt?.circuitBreakerTriggered && (
        <div className="flex items-center gap-2 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-500 border-b border-red-500/20">
          <Ban className="h-3.5 w-3.5" />
          <span>Circuit breaker active — cooldown until {tilt.cooldownUntil ? new Date(tilt.cooldownUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"}</span>
        </div>
      )}

      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Activity className="h-4 w-4" />
          Tilt Monitor
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleRecalculate}
          disabled={isRecalculating}
          title="Recalculate tilt score"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          {/* Circular gauge */}
          <div className="relative flex-shrink-0">
            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
              {/* Background ring */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              {/* Score ring */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={colors.text}
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold tabular-nums ${colors.text}`}>{score}</span>
              <span className="text-[10px] font-medium text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Info panel */}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${colors.bg} ${colors.text} border-0 text-xs font-semibold`}>
                {level}
              </Badge>
              {(tilt?.consecutiveLosses ?? 0) > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-0 text-xs">
                  {tilt?.consecutiveLosses}L streak
                </Badge>
              )}
              {(tilt?.consecutiveWins ?? 0) > 0 && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-0 text-xs">
                  {tilt?.consecutiveWins}W streak
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>

            {/* Factor breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-red-400" />
                <span>Losses: {tilt?.consecutiveLosses ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-yellow-400" />
                <span>Trades/hr: {tilt?.tradesLastHour ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldAlert className="h-3 w-3 text-orange-400" />
                <span>Rule breaks: {tilt?.ruleBreaksToday ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 text-blue-400" />
                <span>PnL: {(tilt?.todayPnl ?? 0) >= 0 ? "+" : ""}{(tilt?.todayPnl ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

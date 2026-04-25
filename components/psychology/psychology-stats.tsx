"use client";

import { type ElementType } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Brain,
  FileText,
  Loader2,
  Shield,
  TrendingUp,
} from "lucide-react";
import { getTagCategory } from "@/lib/trade-store";
import type { PsychologyStatsSnapshot } from "@/lib/psychology-overview";

export const SURFACE_CARD_CLASS = "border-border/70 bg-card/95 shadow-sm";

export function PsychologyMetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-foreground",
  accentClassName = "border border-border/60 bg-secondary/30",
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: ElementType;
  color?: string;
  accentClassName?: string;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-linear-to-b from-card to-card/80 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            <p className={`text-2xl font-semibold tracking-tight ${color}`}>
              {value}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {sub}
            </p>
          </div>
          <div className={cn("rounded-2xl p-2.5 shadow-sm", accentClassName)}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PsychologyChartState({
  icon: Icon,
  message,
  isLoading = false,
  className = "h-62.5",
}: {
  icon: ElementType;
  message: string;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        className,
      )}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <Icon className="h-5 w-5 text-muted-foreground/60" />
      )}
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {isLoading ? "Loading chart..." : message}
      </p>
    </div>
  );
}

// --- Stats Cards ---
export function PsychologyStats({
  statsData,
}: {
  statsData: PsychologyStatsSnapshot | null;
}) {
  const topEmotionCategory = statsData?.topEmotion
    ? getTagCategory(statsData.topEmotion)
    : null;
  const psychScorePercent =
    statsData?.psychologyScore != null
      ? Math.round(statsData.psychologyScore * 100)
      : null;

  const cards = [
    {
      title: "Avg Confidence",
      value:
        statsData?.avgConfidence && statsData.avgConfidence > 0
          ? `${statsData.avgConfidence.toFixed(1)}/5`
          : "--",
      subtitle: "Average self-trust across journaled sessions",
      icon: Shield,
      color: "text-primary",
      accentClassName: "border border-primary/20 bg-primary/10",
    },
    {
      title: "Dominant State",
      value: statsData?.topEmotion || "-",
      subtitle: statsData?.topEmotion
        ? "Most repeated journal emotion"
        : "No tagged pattern yet",
      icon: Brain,
      color: statsData?.topEmotion
        ? topEmotionCategory === "positive"
          ? "text-emerald-400"
          : topEmotionCategory === "negative"
            ? "text-red-400"
            : "text-blue-400"
        : "text-muted-foreground",
      accentClassName: statsData?.topEmotion
        ? topEmotionCategory === "positive"
          ? "border border-emerald-500/20 bg-emerald-500/10"
          : topEmotionCategory === "negative"
            ? "border border-red-500/20 bg-red-500/10"
            : "border border-blue-500/20 bg-blue-500/10"
        : "border border-border/60 bg-secondary/30",
    },
    {
      title: "Mindset Score",
      value:
        psychScorePercent != null && psychScorePercent > 0
          ? `${psychScorePercent}%`
          : "--",
      subtitle: "Positive-to-negative psychology ratio",
      icon: TrendingUp,
      color:
        psychScorePercent != null && psychScorePercent >= 60
          ? "text-emerald-400"
          : psychScorePercent != null && psychScorePercent >= 40
            ? "text-yellow-400"
            : "text-red-400",
      accentClassName:
        psychScorePercent != null && psychScorePercent >= 60
          ? "border border-emerald-500/20 bg-emerald-500/10"
          : psychScorePercent != null && psychScorePercent >= 40
            ? "border border-amber-500/20 bg-amber-500/10"
            : "border border-red-500/20 bg-red-500/10",
    },
    {
      title: "Reflections Logged",
      value: statsData?.journalEntries || 0,
      subtitle: "Total psychology journal entries saved",
      icon: FileText,
      color: "text-accent",
      accentClassName: "border border-accent/20 bg-accent/10",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <PsychologyMetricCard
          key={card.title}
          label={card.title}
          value={card.value}
          sub={card.subtitle}
          icon={card.icon}
          color={card.color}
          accentClassName={card.accentClassName}
        />
      ))}
    </div>
  );
}

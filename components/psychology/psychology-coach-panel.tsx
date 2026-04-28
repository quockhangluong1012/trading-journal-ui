"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, FileText, Lightbulb, Plus, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRichTextPreview } from "@/lib/rich-text";
import { filterJournalEntries, type PsychologyStatsSnapshot } from "@/lib/psychology-overview";
import type { ApiJournalEntry } from "./journal-entry";
import { SURFACE_CARD_CLASS } from "./psychology-stats";

export function PsychologyCoachPanel({
  statsData, journalEntries, onOpenJournal, onOpenPatterns,
}: {
  statsData: PsychologyStatsSnapshot | null;
  journalEntries: ApiJournalEntry[];
  onOpenJournal: () => void;
  onOpenPatterns: () => void;
}) {
  const allEntries = useMemo(() => filterJournalEntries(journalEntries, "all"), [journalEntries]);
  const recentEntries = useMemo(() => filterJournalEntries(journalEntries, "recent"), [journalEntries]);
  const resetEntries = useMemo(() => filterJournalEntries(journalEntries, "needs-reset"), [journalEntries]);
  const latestEntry = allEntries[0] ?? null;

  const signals = [
    {
      label: "Dominant state",
      value: statsData?.topEmotion ?? "No clear pattern yet",
      detail: statsData?.topEmotion
        ? "Review the sessions where this state appears before and after execution."
        : "Keep tagging emotions so the dashboard can isolate repeatable states.",
      icon: Brain,
      accentClassName: "border border-accent/20 bg-accent/10 text-accent",
    },
    {
      label: "Reset watch",
      value: resetEntries.length > 0 ? `${resetEntries.length} entr${resetEntries.length === 1 ? "y" : "ies"} flagged` : "No low-state reflections",
      detail: resetEntries.length > 0
        ? "Low mood or low confidence sessions deserve smaller size and tighter rules."
        : "Your recent notes are not showing urgent emotional risk signals.",
      icon: TrendingDown,
      accentClassName: resetEntries.length > 0
        ? "border border-amber-500/20 bg-amber-500/10 text-amber-400"
        : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    },
    {
      label: "Reflection cadence",
      value: `${recentEntries.length} in last 14 days`,
      detail: recentEntries.length >= 2
        ? "Cadence is strong enough to compare mindset shifts across sessions."
        : "More recent check-ins will make pattern shifts easier to trust.",
      icon: FileText,
      accentClassName: recentEntries.length >= 2
        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
        : "border border-border/70 bg-background/80 text-foreground",
    },
  ];

  return (
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <Lightbulb className="h-4 w-4 text-amber-400" /> Coach readout
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Read the pattern, then decide whether the next session needs more freedom or more guardrails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.map((signal) => (
          <div key={signal.label} className="rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="flex items-start gap-3">
              <div className={cn("rounded-xl p-2 shadow-sm", signal.accentClassName)}>
                <signal.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{signal.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{signal.value}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{signal.detail}</p>
              </div>
            </div>
          </div>
        ))}
        {latestEntry ? (
          <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Latest note</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {getRichTextPreview(latestEntry.todayTradingReview, 120)}
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" className="gap-2" onClick={onOpenJournal}><FileText className="h-4 w-4" />Open journal</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={onOpenPatterns}><Brain className="h-4 w-4" />Review patterns</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PatternGuideCard({ onOpenJournal }: { onOpenJournal: () => void }) {
  const items = [
    "Use the heatmap to find the emotional states that consistently add or subtract expectancy.",
    "Compare win rate and frequency together so rare emotions do not overpower the story.",
    "When a negative state repeats, add a pre-trade checkpoint or cut size before the next session.",
  ];
  return (
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground"><Lightbulb className="h-4 w-4 text-amber-400" />How to read the pattern maps</CardTitle>
        <CardDescription className="text-muted-foreground">Turn chart observations into a process change instead of a vague feeling.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-xs font-semibold text-accent">{index + 1}</div>
            <p className="text-sm leading-relaxed text-foreground/85">{item}</p>
          </div>
        ))}
        <Button variant="outline" size="sm" className="gap-2" onClick={onOpenJournal}><FileText className="h-4 w-4" />Capture the next review</Button>
      </CardContent>
    </Card>
  );
}

export function ReflectionRoutineCard({ onOpenNewEntry }: { onOpenNewEntry: () => void }) {
  const prompts = [
    "Score mood and confidence before you look at the PnL.",
    "Tag the two or three emotions that shaped your decisions the most.",
    "Write one sentence on discipline and one on what needs to change tomorrow.",
  ];
  return (
    <Card className={SURFACE_CARD_CLASS}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground"><Brain className="h-4 w-4 text-accent" />Reflection routine</CardTitle>
        <CardDescription className="text-muted-foreground">Keep the journaling habit short enough to repeat and structured enough to compare.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {prompts.map((prompt, index) => (
          <div key={prompt} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary">{index + 1}</div>
            <p className="text-sm leading-relaxed text-foreground/85">{prompt}</p>
          </div>
        ))}
        <Button size="sm" className="gap-2" onClick={onOpenNewEntry}><Plus className="h-4 w-4" />Start new reflection</Button>
      </CardContent>
    </Card>
  );
}

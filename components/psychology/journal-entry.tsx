"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { getTagCategory } from "@/lib/trade-store";
import { getPlainTextFromRichText, getRichTextPreview } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

export interface ApiJournalEntry {
  id: number;
  date: string;
  todayTradingReview: string;
  overallMood: number;
  confidentLevel: number;
  emotionTags: { id: number; name: string }[];
}

const moodLabels = ["", "Very Low", "Low", "Neutral", "Good", "Excellent"];
const confidenceLabels = ["", "Fragile", "Tentative", "Balanced", "Strong", "Locked in"];

const moodBadgeClasses = [
  "",
  "border-red-500/25 bg-red-500/10 text-red-400",
  "border-orange-500/25 bg-orange-500/10 text-orange-400",
  "border-yellow-500/25 bg-yellow-500/10 text-yellow-400",
  "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
];

const confidenceColors = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-emerald-400", "text-emerald-300"];

const CATEGORY_COLORS: Record<string, string> = {
  positive: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  negative: "bg-red-500/15 text-red-400 border-red-500/25",
  neutral: "bg-blue-500/15 text-blue-400 border-blue-500/25",
};

export function JournalEntriesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="mt-3 h-3 w-28 rounded-md" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-3/4 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function JournalEntryCard({ entry, onDelete }: { entry: ApiJournalEntry; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-border/70 bg-linear-to-br from-card/95 to-card/75 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm",
            moodBadgeClasses[entry.overallMood] || "border-border/70 bg-background/70 text-muted-foreground")}>
            <span className="text-base font-semibold">{entry.overallMood}</span>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {new Date(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-xs text-muted-foreground">Logged reflection for the trading session and mindset review.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
                moodBadgeClasses[entry.overallMood] || "border-border/70 bg-background/70 text-muted-foreground")}>
                Mood {moodLabels[entry.overallMood] || "Unknown"}
              </span>
              <span className="inline-flex rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Confidence {entry.confidentLevel}/5 · {confidenceLabels[entry.confidentLevel] || "Unknown"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 self-start">
          <Button variant="ghost" size="sm" className="h-8 rounded-xl px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Collapse entry" : "Expand entry"}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 rounded-xl px-2 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(entry.id)} aria-label="Delete entry">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {entry.emotionTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {entry.emotionTags.map((tag) => {
            const category = getTagCategory(tag.name || "Unknown Tag");
            return (
              <span key={tag.id} className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[category]}`}>
                {tag.name || "Unknown Tag"}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-border/70 bg-background/60 p-3">
        <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
          {expanded ? getPlainTextFromRichText(entry.todayTradingReview) : getRichTextPreview(entry.todayTradingReview, 190)}
        </p>
        {!expanded && getPlainTextFromRichText(entry.todayTradingReview).length > 190 ? (
          <button onClick={() => setExpanded(true)} className="mt-2 text-xs font-medium text-accent hover:underline">Read more</button>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Confidence bar</span>
          <span className={confidenceColors[entry.confidentLevel] || "text-muted-foreground"}>
            {confidenceLabels[entry.confidentLevel] || "Unknown"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary/60">
          <div className="h-full rounded-full bg-linear-to-r from-primary/70 via-accent to-emerald-400"
            style={{ width: `${(entry.confidentLevel / 5) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

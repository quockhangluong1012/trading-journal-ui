import type { ReactNode } from "react"
import { Brain, FileText, Lightbulb, Plus, Sparkles, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getRichTextPreview } from "@/lib/rich-text"
import type {
  PsychologyJournalSnapshot,
  PsychologyNarrative,
  PsychologyPulse,
  PsychologyTone,
} from "@/lib/psychology-overview"

interface PsychologyCommandCenterProps {
  narrative: PsychologyNarrative
  pulseCards: PsychologyPulse[]
  journalEntriesCount: number
  latestEntry: PsychologyJournalSnapshot | null
  exportAction: ReactNode
  onOpenNewEntry: () => void
  onOpenJournal: () => void
  onOpenPatterns: () => void
}

const toneClasses: Record<PsychologyTone, string> = {
  positive: "border-emerald-500/30 bg-linear-to-br from-emerald-500/10 to-emerald-500/5 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all duration-300 hover:-translate-y-0.5",
  neutral: "border-border/70 bg-linear-to-br from-background/80 to-muted/30 text-foreground shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5",
  warning: "border-amber-500/30 bg-linear-to-br from-amber-500/10 to-amber-500/5 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] transition-all duration-300 hover:-translate-y-0.5",
}

const moodLabels = ["", "Very Low", "Low", "Neutral", "Good", "Excellent"]

function formatEntryDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

export function PsychologyCommandCenter({
  narrative,
  pulseCards,
  journalEntriesCount,
  latestEntry,
  exportAction,
  onOpenNewEntry,
  onOpenJournal,
  onOpenPatterns,
}: PsychologyCommandCenterProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-linear-to-br from-background via-background/95 to-primary/10 shadow-2xl backdrop-blur-xl transition-all">
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-secondary/20 blur-[80px]" />

      <div className="relative grid gap-8 px-6 py-8 xl:grid-cols-[minmax(0,1.12fr)_340px] xl:items-start lg:px-10 lg:py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="rounded-full border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/10"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Psychology intelligence
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-border/70 bg-background/80 px-3 py-1.5 text-xs shadow-sm backdrop-blur-md"
            >
              {journalEntriesCount} reflection{journalEntriesCount === 1 ? "" : "s"}
            </Badge>
            {latestEntry ? (
              <Badge
                variant="outline"
                className="rounded-full border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur-md"
              >
                Latest {formatEntryDate(latestEntry.date)}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-3">
            <h1 className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-5xl">
              Mindset command center
            </h1>
            <p className="max-w-3xl text-lg font-medium leading-relaxed text-foreground/90 md:text-xl">
              {narrative.headline}
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {narrative.detail}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button 
              size="default" 
              className="gap-2 rounded-full bg-primary font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary/90" 
              onClick={onOpenNewEntry}
            >
              <Plus className="h-4 w-4" />
              New entry
            </Button>
            <Button 
              variant="outline" 
              size="default" 
              className="gap-2 rounded-full border-border/70 bg-background/50 shadow-sm backdrop-blur-md transition-all hover:bg-accent/50" 
              onClick={onOpenJournal}
            >
              <FileText className="h-4 w-4" />
              Journal workspace
            </Button>
            <Button 
              variant="outline" 
              size="default" 
              className="gap-2 rounded-full border-border/70 bg-background/50 shadow-sm backdrop-blur-md transition-all hover:bg-accent/50" 
              onClick={onOpenPatterns}
            >
              <Target className="h-4 w-4" />
              Pattern maps
            </Button>
            <div className="[&>button]:rounded-full [&>button]:shadow-sm [&>button]:backdrop-blur-md [&>button]:transition-all hover:[&>button]:bg-accent/50">
              {exportAction}
            </div>
          </div>

          <div className="group mt-2 overflow-hidden rounded-2xl border border-primary/10 bg-linear-to-br from-background/90 to-primary/5 p-5 shadow-lg backdrop-blur-md transition-all hover:border-primary/30 hover:shadow-primary/5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary/80">
              <Brain className="h-4 w-4 text-primary" />
              Latest reflection
            </div>

            {latestEntry ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary/90"
                  >
                    {formatEntryDate(latestEntry.date)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary/90"
                  >
                    Mood {moodLabels[latestEntry.overallMood] || latestEntry.overallMood}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary/90"
                  >
                    Confidence {latestEntry.confidentLevel}/5
                  </Badge>
                </div>
                <p className="mt-4 text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {getRichTextPreview(latestEntry.todayTradingReview, 180)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 -ml-2 gap-2 text-muted-foreground transition-colors hover:text-primary"
                  onClick={onOpenJournal}
                >
                  <Lightbulb className="h-4 w-4" />
                  Open journal workspace
                </Button>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Your next entry will surface here with mood, confidence, and a short reflection preview.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 -ml-2 gap-2 text-primary transition-colors hover:bg-primary/10"
                  onClick={onOpenNewEntry}
                >
                  <Plus className="h-4 w-4" />
                  Create first reflection
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:self-stretch xl:justify-center">
          <div className="grid gap-4 sm:grid-cols-2">
            {pulseCards.map((card) => (
              <div
                key={card.label}
                className={`flex flex-col justify-between rounded-2xl border p-5 ${toneClasses[card.tone]}`}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                  {card.label}
                </p>
                <div className="mt-4">
                  <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed opacity-80">{card.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-2xl border border-border/70 bg-background/50 p-5 shadow-sm backdrop-blur-sm transition-all hover:bg-background/80 hover:shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Active cues
            </p>

            {latestEntry?.emotionTags.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {latestEntry.emotionTags.slice(0, 6).map((tag) => (
                  <Badge
                    key={tag.name}
                    variant="outline"
                    className="rounded-full border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Emotion tags from the latest reflection will surface here to keep the next review anchored.
              </p>
            )}

            <div className="mt-5 rounded-lg bg-primary/5 p-3 text-xs leading-relaxed text-primary/80 border border-primary/10">
              Use this strip as the short list of states to verify before the next session starts.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
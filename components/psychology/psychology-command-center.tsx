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
  positive: "border-emerald-500/20 bg-emerald-500/8 text-emerald-400",
  neutral: "border-border/70 bg-background/70 text-foreground",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-400",
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
    <section className="overflow-hidden rounded-3xl border border-border/70 bg-linear-to-br from-background via-background to-accent/5 shadow-sm">
      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.12fr)_340px] xl:items-start lg:px-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-accent/20 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Psychology intelligence
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[11px]"
            >
              {journalEntriesCount} reflection{journalEntriesCount === 1 ? "" : "s"}
            </Badge>
            {latestEntry ? (
              <Badge
                variant="outline"
                className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground"
              >
                Latest {formatEntryDate(latestEntry.date)}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Mindset command center
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-foreground md:text-lg">
              {narrative.headline}
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {narrative.detail}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" className="gap-2" onClick={onOpenNewEntry}>
              <Plus className="h-4 w-4" />
              New entry
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={onOpenJournal}>
              <FileText className="h-4 w-4" />
              Journal workspace
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={onOpenPatterns}>
              <Target className="h-4 w-4" />
              Pattern maps
            </Button>
            {exportAction}
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <Brain className="h-3.5 w-3.5 text-accent" />
              Latest reflection
            </div>

            {latestEntry ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/80 px-2.5 py-1 text-[11px]"
                  >
                    {formatEntryDate(latestEntry.date)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/80 px-2.5 py-1 text-[11px]"
                  >
                    Mood {moodLabels[latestEntry.overallMood] || latestEntry.overallMood}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/80 px-2.5 py-1 text-[11px]"
                  >
                    Confidence {latestEntry.confidentLevel}/5
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  {getRichTextPreview(latestEntry.todayTradingReview, 180)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 -ml-2 gap-2 text-muted-foreground"
                  onClick={onOpenJournal}
                >
                  <Lightbulb className="h-4 w-4" />
                  Open journal workspace
                </Button>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Your next entry will surface here with mood, confidence, and a short reflection preview.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 -ml-2 gap-2 text-muted-foreground"
                  onClick={onOpenNewEntry}
                >
                  <Plus className="h-4 w-4" />
                  Create first reflection
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:self-start">
          <div className="grid gap-3 sm:grid-cols-2">
            {pulseCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-2xl border p-4 shadow-sm ${toneClasses[card.tone]}`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] opacity-80">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{card.value}</p>
                <p className="mt-2 text-xs leading-relaxed opacity-80">{card.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Active cues
            </p>

            {latestEntry?.emotionTags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {latestEntry.emotionTags.slice(0, 6).map((tag) => (
                  <Badge
                    key={tag.name}
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Emotion tags from the latest reflection will surface here to keep the next review anchored.
              </p>
            )}

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Use this strip as the short list of states to verify before the next session starts.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
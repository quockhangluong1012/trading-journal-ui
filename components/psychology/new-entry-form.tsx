"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { type EmotionTagApi, getTagCategory } from "@/lib/trade-store";
import { getPlainTextFromRichText, normalizeRichTextValue } from "@/lib/rich-text";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

const moodLabels = ["", "Very Low", "Low", "Neutral", "Good", "Excellent"];
const confidenceLabels = ["", "Fragile", "Tentative", "Balanced", "Strong", "Locked in"];

const TAG_COLORS = {
  positive: {
    selected: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30",
    idle: "bg-background/80 text-muted-foreground border-border hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30",
  },
  negative: {
    selected: "bg-red-500/20 text-red-400 border-red-500/40 ring-1 ring-red-500/30",
    idle: "bg-background/80 text-muted-foreground border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30",
  },
  neutral: {
    selected: "bg-blue-500/20 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30",
    idle: "bg-background/80 text-muted-foreground border-border hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30",
  },
} as const;

export function NewEntryForm({ apiTags, onSave, onCancel }: {
  apiTags: EmotionTagApi[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [overallMood, setOverallMood] = useState(3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [journalEntry, setJournalEntry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const selectedEmotionLabels = useMemo(
    () => apiTags.filter((tag) => selectedTags.includes(tag.id.toString())).map((tag) => tag.name),
    [apiTags, selectedTags],
  );

  const toggleTag = (id: string) => {
    setSelectedTags((prev) => prev.includes(id) ? prev.filter((tagId) => tagId !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    const normalizedJournalEntry = normalizeRichTextValue(journalEntry);
    if (!getPlainTextFromRichText(normalizedJournalEntry).trim()) {
      toast({ title: "Reflection required", description: "Add a short review so this entry becomes useful when you revisit it.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { date: new Date(date).toISOString(), todayTradingReview: normalizedJournalEntry, overallMood, confidentLevel: confidenceLevel, emotionTags: selectedTags.map(Number) };
      const res = await api.post("/v1/psychology-journals", payload);
      if (res.data.isSuccess) {
        toast({ title: "Entry saved", description: "Your psychology journal entry has been saved." });
        onSave();
      } else {
        toast({ title: "Failed to save", description: "There was an error saving your entry.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "An unexpected error occurred while saving.", variant: "destructive" });
      console.error("Error saving journal:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/20 bg-accent/6 p-4">
        <p className="text-sm font-medium text-foreground">Log the state before the story.</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Capture mood, confidence, and the dominant emotions first so the written review stays anchored to what you actually felt.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Quick check-in</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Overall Mood</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button key={level} type="button" onClick={() => setOverallMood(level)}
                      className={`flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition-all ${
                        overallMood === level ? "border-violet-500 bg-violet-500/20 text-violet-600 dark:text-violet-400 ring-2 ring-violet-500/20"
                          : overallMood >= level ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                            : "border-border bg-secondary/40 text-muted-foreground hover:border-violet-500/20 hover:text-violet-500"}`}>
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{moodLabels[overallMood] || "Unknown"}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Confidence Level</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button key={level} type="button" onClick={() => setConfidenceLevel(level)}
                      className={`flex h-10 items-center justify-center rounded-2xl border text-sm font-medium transition-all ${
                        confidenceLevel >= level ? "border-primary/40 bg-primary/12 text-primary"
                          : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/25"}`}>
                      {level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{confidenceLabels[confidenceLevel] || "Unknown"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Emotion tags</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Pick the emotions that dominated the session.</p>
              </div>
              <span className="inline-flex rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {selectedTags.length} selected
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {(["positive", "negative", "neutral"] as const).map((category) => (
                <div key={category} className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium capitalize text-muted-foreground">{category}</span>
                    <span className="text-[11px] text-muted-foreground">{apiTags.filter((tag) => getTagCategory(tag.name) === category).length} tags</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {apiTags.filter((tag) => getTagCategory(tag.name) === category).map((tag) => {
                      const isSelected = selectedTags.includes(tag.id.toString());
                      return (
                        <button key={tag.id} type="button" onClick={() => toggleTag(tag.id.toString())}
                          className={`min-h-10 rounded-2xl border px-3.5 py-2 text-sm font-medium transition-all ${
                            isSelected ? TAG_COLORS[category].selected : TAG_COLORS[category].idle}`}>
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Reflection</p>
            <div className="mt-3 grid gap-2 rounded-2xl border border-border/70 bg-secondary/20 p-3 text-xs leading-relaxed text-muted-foreground sm:grid-cols-3">
              <p>What did I feel before the first decision?</p>
              <p>Where did discipline hold or slip?</p>
              <p>What changes for the next session?</p>
            </div>
            <div className="mt-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Journal Entry</Label>
              <Textarea placeholder="How did you feel before, during, and after the session?" value={journalEntry}
                onChange={(e) => setJournalEntry(e.target.value)} rows={10} className="min-h-52 resize-y" />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{selectedEmotionLabels.length > 0 ? selectedEmotionLabels.join(" • ") : "No emotions selected yet"}</span>
                <span>{getPlainTextFromRichText(journalEntry).trim().length} chars</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">Save concise entries consistently. The chart quality improves faster than the essay length.</p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSave} disabled={!getPlainTextFromRichText(journalEntry).trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client"

import { useState } from "react"
import { BookOpenCheck, BrainCircuit, Loader2, Sparkles, Wand2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  createLesson,
  LessonCategoryLabels,
  LessonSeverityLabels,
  type CreateLessonRequest,
} from "@/lib/lessons-api"
import { suggestLessons, type SuggestedLesson, type SuggestedLessonsResult } from "@/lib/ai-insights-api"

interface AiLessonSuggestionsProps {
  onCreated: () => void
}

function getDefaultRequest(): { fromDate: string; toDate: string } {
  const today = new Date()
  const fromDate = new Date(today)
  fromDate.setMonth(today.getMonth() - 3)

  return {
    fromDate: fromDate.toISOString().slice(0, 10),
    toDate: today.toISOString().slice(0, 10),
  }
}

export function AiLessonSuggestions({ onCreated }: AiLessonSuggestionsProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingTitle, setIsSavingTitle] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SuggestedLessonsResult | null>(null)
  const suggestionCount = result?.suggestions.length ?? 0

  const handleSuggest = async () => {
    setIsLoading(true)
    setError(null)

    try {
      setResult(await suggestLessons(getDefaultRequest()))
    } catch (suggestionError) {
      setError(suggestionError instanceof Error ? suggestionError.message : "AI lesson extraction is unavailable right now.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateLesson = async (suggestion: SuggestedLesson) => {
    const payload: CreateLessonRequest = {
      title: suggestion.title,
      content: suggestion.content,
      category: suggestion.category,
      severity: suggestion.severity,
      keyTakeaway: suggestion.keyTakeaway,
      actionItems: suggestion.actionItems,
      impactScore: suggestion.impactScore,
      linkedTradeIds: suggestion.linkedTradeIds.length > 0 ? suggestion.linkedTradeIds : null,
    }

    setIsSavingTitle(suggestion.title)

    try {
      await createLesson(payload)
      setResult((current) => current ? {
        ...current,
        suggestions: current.suggestions.filter((item) => item !== suggestion),
      } : current)
      toast({
        title: "Lesson created",
        description: "The AI suggestion was converted into a saved lesson.",
      })
      onCreated()
    } catch {
      toast({
        title: "Could not save lesson",
        description: "Try again or create it manually.",
        variant: "destructive",
      })
    } finally {
      setIsSavingTitle(null)
    }
  }

  return (
    <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-background to-orange-500/5 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <BrainCircuit className="h-4 w-4 text-amber-500" />
          AI lesson extraction
        </CardTitle>
        <CardDescription>
          Review the last 90 days for repeated mistakes and convert strong suggestions into saved lessons.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="rounded-2xl border border-amber-500/15 bg-background/75 px-4 py-3 text-sm text-muted-foreground">
            {result ? `${result.sampleSize} trades scanned. ${suggestionCount} draft lesson${suggestionCount === 1 ? "" : "s"} ready for review.` : "Run the scan when you want the AI to surface recurring mistakes worth codifying."}
          </div>
          <Button type="button" variant="outline" onClick={() => void handleSuggest()} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isLoading ? "Scanning trades..." : "Generate suggestions"}
          </Button>
        </div>

        {error ? <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm">
              <p className="text-sm text-foreground">{result.summary}</p>
            </div>

            {result.suggestions.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {result.suggestions.map((suggestion) => (
                  <div key={suggestion.title} className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-foreground">{suggestion.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            {LessonCategoryLabels[suggestion.category as keyof typeof LessonCategoryLabels] ?? "Other"}
                          </Badge>
                          <Badge variant="outline" className="border-border/70 bg-secondary/30 text-foreground">
                            {LessonSeverityLabels[suggestion.severity as keyof typeof LessonSeverityLabels] ?? "Moderate"}
                          </Badge>
                          <Badge variant="outline" className="border-border/70 bg-background text-muted-foreground">
                            Impact {suggestion.impactScore}/10
                          </Badge>
                        </div>
                      </div>
                      <Button type="button" size="sm" onClick={() => void handleCreateLesson(suggestion)} disabled={isSavingTitle === suggestion.title} className="gap-2">
                        {isSavingTitle === suggestion.title ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenCheck className="h-4 w-4" />}
                        {isSavingTitle === suggestion.title ? "Saving..." : "Create lesson"}
                      </Button>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{suggestion.content}</p>

                    {suggestion.keyTakeaway ? (
                      <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Key takeaway</p>
                        <p className="mt-2 text-sm text-foreground">{suggestion.keyTakeaway}</p>
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Action items</p>
                        <p className="mt-2 text-sm text-muted-foreground">{suggestion.actionItems || "No action items were generated for this suggestion."}</p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                        <Wand2 className="h-3.5 w-3.5" />
                        {suggestion.linkedTradeIds.length} linked trade{suggestion.linkedTradeIds.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                No new recurring lesson stood out strongly enough to draft right now.
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
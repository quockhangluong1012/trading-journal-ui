"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { searchTradesNaturalLanguage, type NaturalLanguageTradeSearchResult } from "@/lib/ai-insights-api"

interface AiHistorySearchBarProps {
  onApplyFilters: (result: NaturalLanguageTradeSearchResult) => void
}

export function AiHistorySearchBar({ onApplyFilters }: AiHistorySearchBarProps) {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [interpretation, setInterpretation] = useState<string | null>(null)

  const handleSearch = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    setIsLoading(true)
    setError(null)
    setInterpretation(null)

    try {
      const result = await searchTradesNaturalLanguage(trimmedQuery)
      onApplyFilters(result)
      setInterpretation(result.interpretation)
    } catch (error) {
      setError(error instanceof Error ? error.message : "AI search could not interpret that query right now.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">AI trade search</p>
          <p className="mt-1 text-sm text-muted-foreground">Ask for trades in natural language, then refine with the standard filters below.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-3xl">
          <Input
            value={query}
            disabled={isLoading}
            aria-label="Natural language trade search"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void handleSearch()
              }
            }}
            placeholder="Find closed EURUSD longs from last week"
            className="border-primary/20 bg-background"
          />
          <Button type="button" aria-label="Search trades with AI" onClick={() => void handleSearch()} disabled={isLoading || !query.trim()} className="gap-2 whitespace-nowrap">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isLoading ? "Interpreting..." : "Search with AI"}
          </Button>
        </div>
      </div>
      {interpretation ? <p className="mt-3 text-sm text-foreground">{interpretation}</p> : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
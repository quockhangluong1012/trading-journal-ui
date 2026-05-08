"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
  Droplets,
  Newspaper,
  Clock,
  Shield,
  Brain,
  BookOpen,
  Sparkles,
  Save,
  Loader2,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import type { DailyNoteDto, UpsertDailyNoteRequest } from "@/lib/daily-notes-api"
import { AiEmotionDetector } from "@/components/trade/create-trade/ai-emotion-detector"
import { SpeechToTextButton } from "@/components/ui/speech-to-text-button"
import { api, type ApiResponse } from "@/lib/api"
import { appendPlainTextToRichText } from "@/lib/rich-text"
import type { EmotionTagApi } from "@/lib/trade-store"

// ─── Constants ────────────────────────────────────────────────────────

const BIAS_OPTIONS = [
  { value: "Bullish", label: "Bullish", icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400" },
  { value: "Bearish", label: "Bearish", icon: TrendingDown, color: "text-red-500 dark:text-red-400" },
  { value: "Neutral", label: "Neutral", icon: Minus, color: "text-amber-500 dark:text-amber-400" },
] as const

const RISK_OPTIONS = [
  { value: "Conservative", label: "Conservative", color: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { value: "Normal", label: "Normal", color: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { value: "Aggressive", label: "Aggressive", color: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" },
] as const

const SESSION_OPTIONS = [
  { value: "Asian", label: "Asian" },
  { value: "London", label: "London" },
  { value: "NewYork", label: "New York" },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────

function getTodayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function formatDisplayDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// ─── Props ────────────────────────────────────────────────────────────

interface DailyNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: DailyNoteDto | null
  isSaving: boolean
  onSave: (data: UpsertDailyNoteRequest) => Promise<DailyNoteDto | null>
  onDismiss: () => void
}

// ─── Component ────────────────────────────────────────────────────────

export function DailyNotesDialog({
  open,
  onOpenChange,
  note,
  isSaving,
  onSave,
  onDismiss,
}: DailyNotesDialogProps) {
  const [dailyBias, setDailyBias] = useState("")
  const [marketStructureNotes, setMarketStructureNotes] = useState("")
  const [keyLevelsAndLiquidity, setKeyLevelsAndLiquidity] = useState("")
  const [newsAndEvents, setNewsAndEvents] = useState("")
  const [sessionFocus, setSessionFocus] = useState<string[]>([])
  const [riskAppetite, setRiskAppetite] = useState("")
  const [mentalState, setMentalState] = useState("")
  const [keyRulesAndReminders, setKeyRulesAndReminders] = useState("")
  const [apiTags, setApiTags] = useState<EmotionTagApi[]>([])
  const [suggestedEmotionIds, setSuggestedEmotionIds] = useState<string[]>([])

  // Populate form from existing note
  useEffect(() => {
    if (note) {
      setDailyBias(note.dailyBias || "")
      setMarketStructureNotes(note.marketStructureNotes || "")
      setKeyLevelsAndLiquidity(note.keyLevelsAndLiquidity || "")
      setNewsAndEvents(note.newsAndEvents || "")
      setSessionFocus(note.sessionFocus ? note.sessionFocus.split(",").filter(Boolean) : [])
      setRiskAppetite(note.riskAppetite || "")
      setMentalState(note.mentalState || "")
      setKeyRulesAndReminders(note.keyRulesAndReminders || "")
    } else {
      setDailyBias("")
      setMarketStructureNotes("")
      setKeyLevelsAndLiquidity("")
      setNewsAndEvents("")
      setSessionFocus([])
      setRiskAppetite("")
      setMentalState("")
      setKeyRulesAndReminders("")
    }
    setSuggestedEmotionIds([])
  }, [note, open])

  useEffect(() => {
    if (!open) {
      return
    }

    let isMounted = true

    api
      .get<ApiResponse<EmotionTagApi[]>>("/v1/emotions")
      .then((response) => {
        if (isMounted && response.data.isSuccess) {
          setApiTags(response.data.value)
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiTags([])
        }
      })

    return () => {
      isMounted = false
    }
  }, [open])

  const toggleSession = useCallback((session: string) => {
    setSessionFocus((prev) =>
      prev.includes(session) ? prev.filter((s) => s !== session) : [...prev, session],
    )
  }, [])

  const handleSave = useCallback(async () => {
    const data: UpsertDailyNoteRequest = {
      noteDate: getTodayDateString(),
      dailyBias,
      marketStructureNotes,
      keyLevelsAndLiquidity,
      newsAndEvents,
      sessionFocus: sessionFocus.join(","),
      riskAppetite,
      mentalState,
      keyRulesAndReminders,
    }
    await onSave(data)
  }, [dailyBias, keyLevelsAndLiquidity, keyRulesAndReminders, marketStructureNotes, mentalState, newsAndEvents, onSave, riskAppetite, sessionFocus])

  const handleDismiss = useCallback(() => {
    onDismiss()
    onOpenChange(false)
  }, [onDismiss, onOpenChange])

  const isEditing = Boolean(note)
  const suggestedEmotionNames = apiTags
    .filter((tag) => suggestedEmotionIds.includes(tag.id.toString()))
    .map((tag) => tag.name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* Header with gradient accent */}
        <div className="relative shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary/8 via-transparent to-accent/8 dark:from-primary/15 dark:to-accent/10" />
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />

          <DialogHeader className="relative px-6 pt-6 pb-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className="border-primary/25 bg-primary/10 text-primary gap-1.5"
              >
                <Sparkles className="h-3 w-3" />
                Daily Briefing
              </Badge>
              {isEditing && (
                <Badge
                  variant="outline"
                  className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                >
                  Editing
                </Badge>
              )}
            </div>
            <DialogTitle className="text-2xl tracking-tight">
              {isEditing ? "Update Today\u2019s Trading Plan" : "Start Your Trading Day"}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              {formatDisplayDate()} &mdash; Set your bias, mark key levels, and prepare your mindset before the session begins.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable form body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 pb-6 pt-2">
            {/* ── Daily Bias ─────────────────────────────── */}
            <fieldset className="space-y-3">
              <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Compass className="h-4 w-4 text-primary" />
                Daily Bias
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {BIAS_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = dailyBias === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDailyBias(isSelected ? "" : opt.value)}
                      className={`
                        flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3
                        text-sm font-medium transition-all duration-200
                        ${isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                          : "border-border/60 bg-background hover:border-border hover:bg-muted/50"
                        }
                      `}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : opt.color}`} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {/* ── Market Structure Notes ──────────────────── */}
            <fieldset className="space-y-2">
              <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                Market Structure Notes
              </legend>
              <Textarea
                id="daily-notes-market-structure"
                value={marketStructureNotes}
                onChange={(e) => setMarketStructureNotes(e.target.value)}
                placeholder="BOS/CHoCH observations, order flow direction, HTF structure..."
                rows={3}
                className="rounded-xl border-border/60 bg-background text-sm shadow-none"
              />
            </fieldset>

            {/* ── Key Levels & Liquidity ──────────────────── */}
            <fieldset className="space-y-2">
              <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Droplets className="h-4 w-4 text-primary" />
                Key Levels &amp; Liquidity
              </legend>
              <Textarea
                id="daily-notes-key-levels"
                value={keyLevelsAndLiquidity}
                onChange={(e) => setKeyLevelsAndLiquidity(e.target.value)}
                placeholder="Important price levels, liquidity pools, FVGs, order blocks..."
                rows={3}
                className="rounded-xl border-border/60 bg-background text-sm shadow-none"
              />
            </fieldset>

            {/* ── News & Events ───────────────────────────── */}
            <fieldset className="space-y-2">
              <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Newspaper className="h-4 w-4 text-primary" />
                News &amp; Events to Watch
              </legend>
              <Textarea
                id="daily-notes-news"
                value={newsAndEvents}
                onChange={(e) => setNewsAndEvents(e.target.value)}
                placeholder="High-impact news, FOMC, NFP, CPI releases..."
                rows={2}
                className="rounded-xl border-border/60 bg-background text-sm shadow-none"
              />
            </fieldset>

            {/* ── Session Focus ───────────────────────────── */}
            <fieldset className="space-y-3">
              <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Session Focus
              </legend>
              <div className="flex flex-wrap gap-2">
                {SESSION_OPTIONS.map((opt) => {
                  const isSelected = sessionFocus.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleSession(opt.value)}
                      className={`
                        rounded-full border-2 px-5 py-2 text-sm font-medium
                        transition-all duration-200
                        ${isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/50"
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {/* ── Risk Appetite ───────────────────────────── */}
            <fieldset className="space-y-3">
              <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Shield className="h-4 w-4 text-primary" />
                Risk Appetite
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {RISK_OPTIONS.map((opt) => {
                  const isSelected = riskAppetite === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRiskAppetite(isSelected ? "" : opt.value)}
                      className={`
                        rounded-xl border-2 px-4 py-3 text-sm font-medium
                        transition-all duration-200
                        ${isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                          : "border-border/60 bg-background hover:border-border hover:bg-muted/50"
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {/* ── Mental State ────────────────────────────── */}
            <fieldset className="space-y-2">
              <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Brain className="h-4 w-4 text-primary" />
                Mental State &amp; Mindset
              </legend>
              <Textarea
                id="daily-notes-mental-state"
                value={mentalState}
                onChange={(e) => setMentalState(e.target.value)}
                placeholder="How are you feeling today? Sleep quality, focus level, emotional state..."
                rows={2}
                className="rounded-xl border-border/60 bg-background text-sm shadow-none"
              />
              <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <p>Run AI emotion detection on today&apos;s mindset note.</p>
                    <p>{suggestedEmotionNames.length > 0 ? suggestedEmotionNames.join(" • ") : "Suggestions stay local to this dialog"}</p>
                  </div>
                  <SpeechToTextButton
                    label="Voice note"
                    onTranscript={(transcript) =>
                      setMentalState((current) => appendPlainTextToRichText(current, transcript))
                    }
                  />
                </div>
                <div className="mt-3">
                  <AiEmotionDetector
                    textContent={mentalState}
                    apiTags={apiTags}
                    selectedEmotions={suggestedEmotionIds}
                    onSelectEmotions={setSuggestedEmotionIds}
                  />
                </div>
              </div>
            </fieldset>

            {/* ── Key Rules & Reminders ───────────────────── */}
            <fieldset className="space-y-2">
              <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                Key Rules &amp; Reminders
              </legend>
              <Textarea
                id="daily-notes-rules"
                value={keyRulesAndReminders}
                onChange={(e) => setKeyRulesAndReminders(e.target.value)}
                placeholder="Personal rules to follow, max trades per day, stop revenge trading..."
                rows={2}
                className="rounded-xl border-border/60 bg-background text-sm shadow-none"
              />
            </fieldset>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="relative z-10 shrink-0 border-t bg-background px-6 py-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          <Button variant="ghost" onClick={handleDismiss} disabled={isSaving}>
            {isEditing ? "Cancel" : "Skip for now"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-32 gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? "Update Plan" : "Save Plan"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

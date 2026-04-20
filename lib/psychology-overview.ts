export type PsychologyTone = "positive" | "neutral" | "warning"

export type PsychologyJournalFilter =
  | "all"
  | "recent"
  | "high-confidence"
  | "needs-reset"

export interface PsychologyStatsSnapshot {
  avgConfidence: number
  topEmotion: string | null
  psychologyScore: number
  journalEntries: number
}

export interface PsychologyEmotionTagSnapshot {
  name: string
}

export interface PsychologyJournalSnapshot {
  date: string
  todayTradingReview: string
  overallMood: number
  confidentLevel: number
  emotionTags: PsychologyEmotionTagSnapshot[]
}

export interface PsychologyNarrative {
  headline: string
  detail: string
}

export interface PsychologyPulse {
  label: string
  value: string
  detail: string
  tone: PsychologyTone
}

function countEntriesWithinDays<TEntry extends PsychologyJournalSnapshot>(
  entries: TEntry[],
  days: number,
  today: Date,
): number {
  const windowStart = new Date(today)
  windowStart.setDate(windowStart.getDate() - days)

  return entries.filter((entry) => new Date(entry.date) >= windowStart).length
}

function sortEntriesByDate<TEntry extends PsychologyJournalSnapshot>(entries: TEntry[]): TEntry[] {
  return [...entries].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )
}

function getScoreTone(scorePercent: number): PsychologyTone {
  if (scorePercent >= 65) {
    return "positive"
  }

  if (scorePercent >= 45) {
    return "neutral"
  }

  return "warning"
}

function getConfidenceTone(avgConfidence: number): PsychologyTone {
  if (avgConfidence >= 3.5) {
    return "positive"
  }

  if (avgConfidence >= 2.5) {
    return "neutral"
  }

  return "warning"
}

export function buildPsychologyNarrative({
  stats,
  entries,
  today = new Date(),
}: {
  stats: PsychologyStatsSnapshot | null
  entries: PsychologyJournalSnapshot[]
  today?: Date
}): PsychologyNarrative {
  if (!stats || entries.length === 0 || stats.journalEntries === 0) {
    return {
      headline: "No reflection trail yet.",
      detail:
        "Start logging mood, confidence, and emotions after each session to expose the states behind your best and worst decisions.",
    }
  }

  const scorePercent = Math.round(stats.psychologyScore * 100)
  const recentCount = countEntriesWithinDays(entries, 14, today)
  const recentDetail =
    recentCount > 0
      ? ` You logged ${recentCount} reflection${recentCount === 1 ? "" : "s"} in the last 14 days.`
      : " Add a fresh reflection to keep the signal current."

  if (scorePercent >= 65 && stats.avgConfidence >= 3.5) {
    return {
      headline: "Your journal shows a steady mental edge.",
      detail: `${scorePercent}% psychology quality with ${stats.avgConfidence.toFixed(1)}/5 average confidence.${stats.topEmotion ? ` ${stats.topEmotion} is the state appearing most often.` : ""}${recentDetail}`,
    }
  }

  if (scorePercent >= 45) {
    return {
      headline: "Your execution mindset is mixed, but readable.",
      detail: `${scorePercent}% psychology quality suggests the edge is present when your prep is disciplined.${stats.topEmotion ? ` ${stats.topEmotion} keeps showing up.` : ""} Review the sessions where mood or confidence dipped before sizing up again.${recentDetail}`,
    }
  }

  return {
    headline: "Your psychology data is warning about decision quality.",
    detail: `${scorePercent}% psychology quality with ${stats.avgConfidence.toFixed(1)}/5 average confidence.${stats.topEmotion ? ` ${stats.topEmotion} is the dominant state right now.` : ""} Reduce size, tighten process, and journal immediately after difficult sessions.${recentDetail}`,
  }
}

export function buildPsychologyPulse(
  stats: PsychologyStatsSnapshot | null,
  entries: PsychologyJournalSnapshot[],
  today = new Date(),
): PsychologyPulse[] {
  if (!stats) {
    return [
      {
        label: "Mindset score",
        value: "--",
        detail: "Psychology quality",
        tone: "neutral",
      },
      {
        label: "Confidence",
        value: "--",
        detail: "Average self-trust",
        tone: "neutral",
      },
      {
        label: "Cadence",
        value: "0 recent",
        detail: "Reflections in the last 14 days",
        tone: "warning",
      },
      {
        label: "Dominant state",
        value: "No signal",
        detail: "Most logged emotion",
        tone: "neutral",
      },
    ]
  }

  const scorePercent = Math.round(stats.psychologyScore * 100)
  const recentCount = countEntriesWithinDays(entries, 14, today)
  const scoreTone = getScoreTone(scorePercent)

  return [
    {
      label: "Mindset score",
      value: `${scorePercent}%`,
      detail: "Psychology quality",
      tone: scoreTone,
    },
    {
      label: "Confidence",
      value: `${stats.avgConfidence.toFixed(1)}/5`,
      detail: "Average self-trust",
      tone: getConfidenceTone(stats.avgConfidence),
    },
    {
      label: "Cadence",
      value: `${recentCount} recent`,
      detail: "Reflections in the last 14 days",
      tone: recentCount >= 2 ? "positive" : recentCount === 1 ? "neutral" : "warning",
    },
    {
      label: "Dominant state",
      value: stats.topEmotion ?? "No signal",
      detail: "Most logged emotion",
      tone: stats.topEmotion ? scoreTone : "neutral",
    },
  ]
}

export function filterJournalEntries<TEntry extends PsychologyJournalSnapshot>(
  entries: TEntry[],
  filter: PsychologyJournalFilter,
  today = new Date(),
): TEntry[] {
  const sortedEntries = sortEntriesByDate(entries)

  if (filter === "all") {
    return sortedEntries
  }

  if (filter === "recent") {
    const windowStart = new Date(today)
    windowStart.setDate(windowStart.getDate() - 14)

    return sortedEntries.filter((entry) => new Date(entry.date) >= windowStart)
  }

  if (filter === "high-confidence") {
    return sortedEntries.filter((entry) => entry.confidentLevel >= 4)
  }

  return sortedEntries.filter(
    (entry) => entry.overallMood <= 2 || entry.confidentLevel <= 2,
  )
}
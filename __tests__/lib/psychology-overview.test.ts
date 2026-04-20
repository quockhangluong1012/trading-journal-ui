import { describe, expect, it } from "vitest"
import {
  buildPsychologyNarrative,
  buildPsychologyPulse,
  filterJournalEntries,
  type PsychologyJournalSnapshot,
  type PsychologyStatsSnapshot,
} from "@/lib/psychology-overview"

const baseStats: PsychologyStatsSnapshot = {
  avgConfidence: 0,
  topEmotion: null,
  psychologyScore: 0,
  journalEntries: 0,
}

const entries: PsychologyJournalSnapshot[] = [
  {
    date: "2026-04-18T00:00:00.000Z",
    todayTradingReview: "Stayed patient and executed only A setups.",
    overallMood: 4,
    confidentLevel: 4,
    emotionTags: [{ name: "Focused" }],
  },
  {
    date: "2026-04-12T00:00:00.000Z",
    todayTradingReview: "Forced trades after an early loss and felt tilted.",
    overallMood: 2,
    confidentLevel: 2,
    emotionTags: [{ name: "Frustrated" }],
  },
  {
    date: "2026-03-21T00:00:00.000Z",
    todayTradingReview: "Skipped a few valid setups and hesitated.",
    overallMood: 3,
    confidentLevel: 3,
    emotionTags: [{ name: "Hesitant" }],
  },
]

describe("buildPsychologyNarrative", () => {
  it("returns an empty-state narrative when there are no reflections yet", () => {
    const narrative = buildPsychologyNarrative({
      stats: null,
      entries: [],
    })

    expect(narrative.headline).toContain("No reflection trail")
    expect(narrative.detail).toContain("Start logging")
  })

  it("builds a confident narrative when psychology quality is steady", () => {
    const narrative = buildPsychologyNarrative({
      stats: {
        ...baseStats,
        avgConfidence: 4.1,
        topEmotion: "Focused",
        psychologyScore: 0.74,
        journalEntries: 9,
      },
      entries,
    })

    expect(narrative.headline).toContain("steady mental edge")
    expect(narrative.detail).toContain("Focused")
  })

  it("builds a warning narrative when the journal shows unstable execution", () => {
    const narrative = buildPsychologyNarrative({
      stats: {
        ...baseStats,
        avgConfidence: 2.1,
        topEmotion: "Frustrated",
        psychologyScore: 0.31,
        journalEntries: 4,
      },
      entries,
    })

    expect(narrative.headline).toContain("warning")
    expect(narrative.detail).toContain("Reduce size")
  })
})

describe("buildPsychologyPulse", () => {
  it("creates pulse cards for score, confidence, cadence, and dominant state", () => {
    const pulse = buildPsychologyPulse(
      {
        ...baseStats,
        avgConfidence: 3.8,
        topEmotion: "Focused",
        psychologyScore: 0.68,
        journalEntries: 12,
      },
      entries,
      new Date("2026-04-19T00:00:00.000Z"),
    )

    expect(pulse).toEqual([
      {
        label: "Mindset score",
        value: "68%",
        detail: "Psychology quality",
        tone: "positive",
      },
      {
        label: "Confidence",
        value: "3.8/5",
        detail: "Average self-trust",
        tone: "positive",
      },
      {
        label: "Cadence",
        value: "2 recent",
        detail: "Reflections in the last 14 days",
        tone: "positive",
      },
      {
        label: "Dominant state",
        value: "Focused",
        detail: "Most logged emotion",
        tone: "positive",
      },
    ])
  })
})

describe("filterJournalEntries", () => {
  it("sorts all entries by most recent first", () => {
    const result = filterJournalEntries(entries, "all")

    expect(result.map((entry) => entry.date)).toEqual([
      "2026-04-18T00:00:00.000Z",
      "2026-04-12T00:00:00.000Z",
      "2026-03-21T00:00:00.000Z",
    ])
  })

  it("filters for high-confidence reflections", () => {
    const result = filterJournalEntries(entries, "high-confidence")

    expect(result).toHaveLength(1)
    expect(result[0]?.confidentLevel).toBe(4)
  })

  it("filters recent reflections using the 14-day window", () => {
    const result = filterJournalEntries(
      entries,
      "recent",
      new Date("2026-04-19T00:00:00.000Z"),
    )

    expect(result.map((entry) => entry.date)).toEqual([
      "2026-04-18T00:00:00.000Z",
      "2026-04-12T00:00:00.000Z",
    ])
  })

  it("filters for entries that need a reset review", () => {
    const result = filterJournalEntries(entries, "needs-reset")

    expect(result).toHaveLength(1)
    expect(result[0]?.overallMood).toBe(2)
  })
})
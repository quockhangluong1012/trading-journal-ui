import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AiEmotionDetector } from "@/components/trade/create-trade/ai-emotion-detector"

const postMock = vi.fn()

vi.mock("@/lib/api", () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}))

describe("AiEmotionDetector", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("detects emotions and auto-selects matching tags", async () => {
    const user = userEvent.setup()
    const handleSelectEmotions = vi.fn()

    postMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: {
          detectedEmotions: [{ emotionName: "Anxious", confidence: 0.84 }],
          overallSentiment: "negative",
          psychologySummary: "The note reads as anxious and slightly rushed.",
          tradingReadiness: "caution",
          tradingReadinessExplanation: "Slow down before taking fresh risk.",
        },
      },
    })

    render(
      <AiEmotionDetector
        textContent="I feel anxious after missing the London move and want to force a setup."
        apiTags={[
          { id: 1, name: "Anxious", color: null, description: null, emotionTypeId: 1, isDeleted: false },
          { id: 2, name: "Calm", color: null, description: null, emotionTypeId: 2, isDeleted: false },
        ]}
        selectedEmotions={[]}
        onSelectEmotions={handleSelectEmotions}
      />,
    )

    await user.click(screen.getByRole("button", { name: "AI Detect Emotions" }))

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/v1/ai-emotions/detect", {
        textContent: "I feel anxious after missing the London move and want to force a setup.",
      })
    })

    expect(handleSelectEmotions).toHaveBeenCalledWith(["1"])
    expect(screen.getByText("The note reads as anxious and slightly rushed.")).toBeInTheDocument()
    expect(screen.getByText("Proceed with caution")).toBeInTheDocument()
  })

  it("blocks oversized notes before calling the API", async () => {
    const user = userEvent.setup()
    const handleSelectEmotions = vi.fn()

    render(
      <AiEmotionDetector
        textContent={"a".repeat(5001)}
        apiTags={[]}
        selectedEmotions={[]}
        onSelectEmotions={handleSelectEmotions}
      />,
    )

    await user.click(screen.getByRole("button", { name: "AI Detect Emotions" }))

    expect(postMock).not.toHaveBeenCalled()
    expect(screen.getByText("Keep the note under 5000 characters for AI emotion detection.")).toBeInTheDocument()
    expect(handleSelectEmotions).not.toHaveBeenCalled()
  })
})
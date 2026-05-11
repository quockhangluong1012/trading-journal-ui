import { beforeEach, describe, expect, it, vi } from "vitest"

import { streamCoachReply, type CoachMessage } from "@/lib/coach-api"

const originalFetch = global.fetch

function createSseStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event))
      }

      controller.close()
    },
  })
}

describe("coach-api streaming", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it("streams assistant chunks incrementally and returns the final reply", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        createSseStream([
          'data: {"type":"chunk","content":"Hello"}\n\n',
          'data: {"type":"chunk","content":" world"}\n\n',
          'data: {"type":"done"}\n\n',
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
          },
        }
      )
    )

    vi.stubGlobal("fetch", fetchMock)

    const partialReplies: string[] = []
    const messages: CoachMessage[] = [{ role: "user", content: "Explain AMD." }]

    const response = await streamCoachReply(messages, "research", {
      onChunk: (partialReply) => {
        partialReplies.push(partialReply)
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "undefined/api/v1/ai-coach/chat/stream",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ messages, mode: "research" }),
      })
    )
    expect(partialReplies).toEqual(["Hello", "Hello world"])
    expect(response).toEqual({ reply: "Hello world" })
  })

  it("throws when the stream contains malformed JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        createSseStream(['data: {"type":"chunk","content":"Hello"\n\n']),
        {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
          },
        }
      )
    )

    vi.stubGlobal("fetch", fetchMock)

    await expect(
      streamCoachReply([{ role: "user", content: "Explain displacement." }])
    ).rejects.toThrow("Malformed coach stream event")
  })
})

afterAll(() => {
  vi.stubGlobal("fetch", originalFetch)
})
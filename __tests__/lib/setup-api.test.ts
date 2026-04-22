import { beforeEach, describe, expect, it, vi } from "vitest"

import { getTradingSetupDetail } from "@/lib/setup-api"

const apiGetMock = vi.fn()

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}))

describe("setup-api", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes flat node coordinates from the trading setup detail API", async () => {
    apiGetMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: {
          id: 7,
          name: "London breakout",
          description: "Wait for the reclaim candle.",
          stepCount: 1,
          createdAt: "2026-04-21T13:30:00.000Z",
          lastUpdatedAt: "2026-04-21T13:30:00.000Z",
          nodes: [
            {
              id: "setup-node-start",
              kind: "start",
              title: "Start",
              notes: null,
              x: 80,
              y: 160,
            },
            {
              id: "setup-node-step",
              kind: "step",
              title: "Validate context",
              notes: "Check bias before entry.",
              x: 320,
              y: 160,
            },
          ],
          edges: [
            {
              id: "edge-1",
              source: "setup-node-start",
              target: "setup-node-step",
              label: null,
            },
          ],
        },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    })

    const response = await getTradingSetupDetail(7)

    expect(apiGetMock).toHaveBeenCalledWith("/v1/trading-setups/7")
    expect(response.data.isSuccess).toBe(true)

    if (!response.data.isSuccess) {
      throw new Error("Expected the setup detail request to succeed.")
    }

    expect(response.data.value.nodes).toEqual([
      {
        id: "setup-node-start",
        kind: "start",
        title: "Start",
        notes: null,
        position: { x: 80, y: 160 },
      },
      {
        id: "setup-node-step",
        kind: "step",
        title: "Validate context",
        notes: "Check bias before entry.",
        position: { x: 320, y: 160 },
      },
    ])
  })

  it("preserves nested node positions when the detail payload is already normalized", async () => {
    apiGetMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: {
          id: 11,
          name: "NY reversal",
          description: null,
          stepCount: 1,
          createdAt: "2026-04-21T13:30:00.000Z",
          lastUpdatedAt: "2026-04-21T13:30:00.000Z",
          nodes: [
            {
              id: "setup-node-step",
              kind: "decision",
              title: "Liquidity sweep complete?",
              notes: null,
              position: { x: 240, y: 120 },
            },
          ],
          edges: [],
        },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    })

    const response = await getTradingSetupDetail(11)

    expect(response.data.isSuccess).toBe(true)

    if (!response.data.isSuccess) {
      throw new Error("Expected the setup detail request to succeed.")
    }

    expect(response.data.value.nodes).toEqual([
      {
        id: "setup-node-step",
        kind: "decision",
        title: "Liquidity sweep complete?",
        notes: null,
        position: { x: 240, y: 120 },
      },
    ])
  })

  it("rejects detail payloads with invalid node coordinates", async () => {
    apiGetMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: {
          id: 13,
          name: "Broken setup",
          description: null,
          stepCount: 1,
          createdAt: "2026-04-21T13:30:00.000Z",
          lastUpdatedAt: "2026-04-21T13:30:00.000Z",
          nodes: [
            {
              id: "setup-node-step",
              kind: "step",
              title: "Validate context",
              notes: null,
              x: null,
              y: 120,
            },
          ],
          edges: [],
        },
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    })

    await expect(getTradingSetupDetail(13)).rejects.toThrow("Invalid setup node coordinate.")
  })
})
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TemplateManager } from "@/components/trade/template-manager"

const getTemplatesMock = vi.fn()
const createTemplateMock = vi.fn()
const updateTemplateMock = vi.fn()
const deleteTemplateMock = vi.fn()
const getTradingSetupsMock = vi.fn()
const apiGetMock = vi.fn()
const toastMock = vi.fn()

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}))

vi.mock("@/lib/template-api", () => ({
  getTemplates: (...args: unknown[]) => getTemplatesMock(...args),
  createTemplate: (...args: unknown[]) => createTemplateMock(...args),
  updateTemplate: (...args: unknown[]) => updateTemplateMock(...args),
  deleteTemplate: (...args: unknown[]) => deleteTemplateMock(...args),
}))

vi.mock("@/lib/setup-api", () => ({
  getTradingSetups: (...args: unknown[]) => getTradingSetupsMock(...args),
}))

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}))

function buildResponse(value: unknown) {
  return {
    data: {
      isSuccess: true,
      value,
    },
  }
}

async function selectOption(user: ReturnType<typeof userEvent.setup>, name: RegExp, option: string) {
  await user.click(screen.getByRole("combobox", { name }))
  await user.click(await screen.findByRole("option", { name: option }))
}

describe("TemplateManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.hasPointerCapture ??= () => false
    window.HTMLElement.prototype.setPointerCapture ??= () => {}
    window.HTMLElement.prototype.releasePointerCapture ??= () => {}
    window.HTMLElement.prototype.scrollIntoView ??= () => {}

    getTemplatesMock.mockResolvedValue(buildResponse([]))
    createTemplateMock.mockResolvedValue(buildResponse(101))
    updateTemplateMock.mockResolvedValue(buildResponse(true))
    deleteTemplateMock.mockResolvedValue(buildResponse(true))
    getTradingSetupsMock.mockResolvedValue(
      buildResponse([
        {
          id: 8,
          name: "Morning Venom Model",
          description: "Open drive into reversal window.",
          stepCount: 4,
          createdAt: "2026-05-01T10:00:00.000Z",
          lastUpdatedAt: "2026-05-01T10:00:00.000Z",
        },
      ]),
    )

    apiGetMock.mockImplementation((url: string) => {
      switch (url) {
        case "/v1/trading-zones":
          return Promise.resolve(
            buildResponse([
              {
                id: 2,
                name: "London Killzone",
                description: null,
                fromTime: "07:00:00",
                toTime: "10:00:00",
              },
            ]),
          )
        case "/v1/technical-analysis":
          return Promise.resolve(
            buildResponse([
              {
                id: 3,
                name: "Fair Value Gap",
                shortName: "FVG",
                description: "Imbalance left by displacement.",
              },
              {
                id: 4,
                name: "Liquidity Sweep",
                shortName: "LS",
                description: "Liquidity taken before reversal.",
              },
            ]),
          )
        default:
          throw new Error(`Unexpected api.get call for ${url}`)
      }
    })
  })

  it("creates templates with a linked setup and technical analysis tags while omitting stop and target defaults", async () => {
    const user = userEvent.setup()

    render(<TemplateManager />)

    expect(await screen.findByText("No templates yet")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /new template/i }))

    const dialog = await screen.findByRole("dialog")

    expect(within(dialog).queryByText("Stop Loss")).not.toBeInTheDocument()
    expect(within(dialog).queryByText("Target T1")).not.toBeInTheDocument()
    expect(within(dialog).queryByText("Target T2")).not.toBeInTheDocument()
    expect(within(dialog).queryByText("Target T3")).not.toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/template name/i), "NQ Venom")
    await user.type(within(dialog).getByLabelText(/^asset$/i), "NQ")

    await selectOption(user, /direction/i, "Long")
    await selectOption(user, /trading zone/i, "London Killzone")
    await selectOption(user, /linked setup/i, "Morning Venom Model")
    await selectOption(user, /confidence level/i, "High")

    await user.click(within(dialog).getByRole("button", { name: /fair value gap/i }))
    await user.click(within(dialog).getByRole("button", { name: /create template/i }))

    await waitFor(() => {
      expect(createTemplateMock).toHaveBeenCalledWith({
        name: "NQ Venom",
        description: null,
        asset: "NQ",
        position: 0,
        tradingZoneId: 2,
        tradingSessionId: null,
        tradingSetupId: 8,
        defaultStopLoss: null,
        defaultTargetTier1: null,
        defaultTargetTier2: null,
        defaultTargetTier3: null,
        defaultConfidenceLevel: 4,
        defaultNotes: null,
        defaultChecklistIds: null,
        defaultEmotionTagIds: null,
        defaultTechnicalAnalysisTagIds: [3],
        isFavorite: false,
      })
    })
  })
})
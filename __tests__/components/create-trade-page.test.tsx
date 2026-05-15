import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CreateTradePage } from "@/components/create-trade-page"

const pushMock = vi.fn()
const addTradeMock = vi.fn()
const toastMock = vi.fn()
const apiGetMock = vi.fn()
const apiPostMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@/lib/trade-context", () => ({
  useTrades: () => ({ addTrade: addTradeMock, activeSession: null }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
}))

vi.mock("@/lib/template-api", () => ({
  getTemplateById: vi.fn(),
}))

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}))

vi.mock("@/components/trade/create-trade/trade-setup-section", () => ({
  TradeSetupSection: ({ handleInputChange }: { handleInputChange: (field: string, value: string) => void }) => (
    <div>
      <p>Trade setup section</p>
      <button
        type="button"
        onClick={() => {
          handleInputChange("asset", "EURUSD")
          handleInputChange("date", "2026-05-07")
        }}
      >
        Fill setup step
      </button>
    </div>
  ),
}))

vi.mock("@/components/trade/create-trade/risk-management-section", () => ({
  RiskManagementSection: ({ handleInputChange }: { handleInputChange: (field: string, value: string) => void }) => (
    <div>
      <p>Risk management section</p>
      <button
        type="button"
        onClick={() => {
          handleInputChange("entryPrice", "100")
          handleInputChange("stopLoss", "90")
          handleInputChange("targetTier1", "120")
        }}
      >
        Fill risk step
      </button>
    </div>
  ),
}))

vi.mock("@/components/trade/create-trade/pre-trade-checklist-section", () => ({
  PreTradeChecklistSection: () => <div>Checklist section</div>,
}))

vi.mock("@/components/trade/create-trade/market-context-section", () => ({
  MarketContextSection: () => <div>Market context section</div>,
}))

vi.mock("@/components/trade/create-trade/trading-psychology-section", () => ({
  TradingPsychologySection: () => <div>Psychology section</div>,
}))

vi.mock("@/components/trade/create-trade/notes-evidence-section", () => ({
  NotesEvidenceSection: () => <div>Notes evidence section</div>,
}))

vi.mock("@/components/trade/create-trade/ai-chart-screenshot-analysis", () => ({
  AiChartScreenshotAnalysis: () => <div>Chart screenshot analysis</div>,
}))

vi.mock("@/components/trade/create-trade/ai-pre-trade-validation", () => ({
  AiPreTradeValidation: () => <div>AI pre-trade validation</div>,
}))

vi.mock("@/components/trade/create-trade/ai-discipline-guardian", () => ({
  AiDisciplineGuardian: () => <div>AI discipline guardian</div>,
}))

vi.mock("@/components/trade/ict-trade-fields", () => ({
  IctContextFields: () => <div>ICT context fields</div>,
}))

function buildReferenceResponse(value: unknown) {
  return Promise.resolve({
    data: {
      isSuccess: true,
      value,
    },
  })
}

describe("CreateTradePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.scrollTo = vi.fn()

    apiGetMock.mockImplementation((url: string) => {
      switch (url) {
        case "/v1/emotions":
          return buildReferenceResponse([])
        case "/v1/checklist-models":
          return buildReferenceResponse([{ id: 1, name: "Core checklist", criteriaCount: 1 }])
        case "/v1/technical-analysis":
          return buildReferenceResponse([])
        case "/v1/trading-zones":
          return buildReferenceResponse([])
        case "/v1/trade-histories/assets":
          return buildReferenceResponse([])
        case "/v1/trading-setups":
          return buildReferenceResponse([])
        case "/v1/checklist-models/1":
          return buildReferenceResponse({ id: 1, name: "Core checklist", criteria: [] })
        default:
          throw new Error(`Unexpected api.get call for ${url}`)
      }
    })

    apiPostMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: 123,
      },
    })
  })

  it("renders the updated wizard shell and step guidance", async () => {
    render(<CreateTradePage />)

    expect(await screen.findByText("Wizard progress")).toBeInTheDocument()
    expect(screen.getByText("Evidence & Submit")).toBeInTheDocument()
    expect(screen.getByText(/Current focus:/)).toBeInTheDocument()
    expect(screen.getByText("Needs attention")).toBeInTheDocument()
  })

  it("blocks progression when the current step is incomplete", async () => {
    const user = userEvent.setup()

    render(<CreateTradePage />)

    await screen.findByText("Wizard progress")
    await user.click(screen.getByRole("button", { name: "Continue to Context" }))

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Complete this step first",
      }),
    )
    expect(screen.queryByText("Checklist section")).not.toBeInTheDocument()
  })

  it("shows a warning when saved asset names cannot be loaded", async () => {
    apiGetMock.mockImplementation((url: string) => {
      switch (url) {
        case "/v1/emotions":
          return buildReferenceResponse([])
        case "/v1/checklist-models":
          return buildReferenceResponse([{ id: 1, name: "Core checklist", criteriaCount: 1 }])
        case "/v1/technical-analysis":
          return buildReferenceResponse([])
        case "/v1/trading-zones":
          return buildReferenceResponse([])
        case "/v1/trade-histories/assets":
          return Promise.reject(new Error("assets unavailable"))
        case "/v1/trading-setups":
          return buildReferenceResponse([])
        case "/v1/checklist-models/1":
          return buildReferenceResponse({ id: 1, name: "Core checklist", criteria: [] })
        default:
          throw new Error(`Unexpected api.get call for ${url}`)
      }
    })

    render(<CreateTradePage />)

    expect(await screen.findByText("Wizard progress")).toBeInTheDocument()
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Some trade planner data could not be loaded",
        description: expect.stringContaining("asset names"),
      }),
    )
  })

  it("moves to the context step once the setup step is complete", async () => {
    const user = userEvent.setup()

    render(<CreateTradePage />)

    await screen.findByText("Wizard progress")
    await user.click(screen.getByRole("button", { name: "Fill setup step" }))
    await user.click(screen.getByRole("button", { name: "Fill risk step" }))
    await user.click(screen.getByRole("button", { name: "Continue to Context" }))

    expect(await screen.findByText("Checklist section")).toBeInTheDocument()
    expect(screen.getByText("Market context section")).toBeInTheDocument()
  })

  it("blocks jumping past incomplete intermediate steps from the progress cards", async () => {
    const user = userEvent.setup()

    render(<CreateTradePage />)

    await screen.findByText("Wizard progress")
    await user.click(screen.getByRole("button", { name: "Fill setup step" }))
    await user.click(screen.getByRole("button", { name: "Fill risk step" }))
    await user.click(screen.getByRole("button", { name: /Evidence & Submit/i }))

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Complete this step first",
      }),
    )
    expect(await screen.findByText("Checklist section")).toBeInTheDocument()
    expect(screen.queryByText("Notes evidence section")).not.toBeInTheDocument()
  })
})
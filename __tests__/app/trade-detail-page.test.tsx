import { Suspense } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PositionType } from "@/lib/enum/PositionType"
import { TradeStatus } from "@/lib/enum/TradeStatus"

const replaceMock = vi.fn()
const pushMock = vi.fn()
const refreshMock = vi.fn()
const updateTradeMock = vi.fn()
const deleteTradeMock = vi.fn()
const closeTradeMock = vi.fn()
const toastMock = vi.fn()
const apiGetMock = vi.fn()
const apiPutMock = vi.fn()

let authState: { user: { id: string } | null; isLoading: boolean } = {
  user: { id: "user-1" },
  isLoading: false,
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/trade/1",
  useRouter: () => ({ replace: replaceMock, push: pushMock, refresh: refreshMock }),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}))

vi.mock("@/lib/trade-context", () => ({
  useTrades: () => ({
    trades: [],
    updateTrade: updateTradeMock,
    deleteTrade: deleteTradeMock,
    closeTrade: closeTradeMock,
  }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    put: (...args: unknown[]) => apiPutMock(...args),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/components/app-page-shell", () => ({
  AppPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/app-shell-loader", () => ({
  AppShellLoader: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}))

vi.mock("@/components/trade/metric-cards", () => ({
  OverviewMetricCard: ({ label, value }: { label: string; value: string }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
  SnapshotPill: ({ label, value }: { label: string; value: string }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}))

vi.mock("@/components/trade/price-level-bar", () => ({
  PriceLevelBar: () => <div>Price level bar</div>,
}))

vi.mock("@/components/trade/trade-status-alert", () => ({
  TradeStatusAlert: () => <div>Trade status alert</div>,
}))

vi.mock("@/components/trade/trade-detail-skeleton", () => ({
  TradeDetailSkeleton: () => <div>Loading detail skeleton</div>,
}))

function buildResponse<T>(value: T) {
  return Promise.resolve({
    data: {
      isSuccess: true,
      value,
    },
  })
}

function buildTradeDetail() {
  return {
    asset: "EURUSD",
    tradingSetupId: 5,
    position: PositionType.Long,
    entryPrice: 1.0845,
    targetTier1: 1.09,
    targetTier2: null,
    targetTier3: null,
    stopLoss: 1.081,
    notes: "Stayed patient through the London liquidity sweep.",
    date: "2026-05-07T08:30:00.000Z",
    status: TradeStatus.Open,
    exitPrice: null,
    pnl: null,
    tradingResult: null,
    hitStopLoss: false,
    closedDate: null,
    screenShots: [],
    emotionTags: [],
    confidenceLevel: 4,
    technicalAnalysisTags: [],
    tradingZoneId: null,
    tradingSessionId: null,
    selectedChecklists: [],
    riskGuardrail: null,
    aiSummary: null,
    powerOf3Phase: null,
    dailyBias: null,
    marketStructure: null,
    premiumDiscount: null,
  }
}

function createResolvedParams(id: string) {
  const params = Promise.resolve({ id }) as Promise<{ id: string }> & {
    status: "fulfilled"
    value: { id: string }
  }

  params.status = "fulfilled"
  params.value = { id }

  return params
}

describe("trade detail page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState = {
      user: { id: "user-1" },
      isLoading: false,
    }
    window.scrollTo = vi.fn()

    Element.prototype.hasPointerCapture = vi.fn(() => false)
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()

    apiGetMock.mockImplementation((url: string) => {
      switch (url) {
        case "/v1/emotions":
          return buildResponse([])
        case "/v1/checklist-models":
          return buildResponse([])
        case "/v1/technical-analysis":
          return buildResponse([])
        case "/v1/trading-zones":
          return buildResponse([])
        case "/v1/trading-setups":
          return buildResponse([
            {
              id: 5,
              name: "Morning Venom Model",
              description: "London sweep into displacement and FVG continuation.",
              stepCount: 4,
              createdAt: "2026-05-07T08:00:00.000Z",
              lastUpdatedAt: "2026-05-07T08:00:00.000Z",
            },
            {
              id: 9,
              name: "Afternoon Judas Swing",
              description: "PM reversal setup after liquidity purge.",
              stepCount: 3,
              createdAt: "2026-05-07T13:00:00.000Z",
              lastUpdatedAt: "2026-05-07T13:00:00.000Z",
            },
          ])
        case "/v1/trade-histories/1":
          return buildResponse(buildTradeDetail())
        default:
          throw new Error(`Unexpected api.get call for ${url}`)
      }
    })

    apiPutMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: true,
      },
    })
  })

  it("shows the linked setup and lets you change it from edit mode", async () => {
    const user = userEvent.setup()
    const module = await import("../../app/trade/[id]/page")
    const TradeDetailPage = module.default

    render(
      <Suspense fallback={<div>Suspending trade detail</div>}>
        <TradeDetailPage params={createResolvedParams("1")} />
      </Suspense>,
    )

    expect(await screen.findByText("Morning Venom Model")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /edit trade/i }))

    const setupSelect = await screen.findByRole("combobox", { name: /linked setup/i })
    await user.click(setupSelect)
    await user.click(await screen.findByText("Afternoon Judas Swing"))
    await user.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        "/v1/trade-histories",
        expect.objectContaining({
          tradingSetupId: 9,
        }),
      )
    })

    expect(updateTradeMock).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        tradingSetupId: "9",
      }),
    )
  })

  it("renders ICT edit controls and saves updated ICT context", async () => {
    const user = userEvent.setup()
    const module = await import("../../app/trade/[id]/page")
    const TradeDetailPage = module.default

    render(
      <Suspense fallback={<div>Suspending trade detail</div>}>
        <TradeDetailPage params={createResolvedParams("1")} />
      </Suspense>,
    )

    expect(await screen.findByText("Morning Venom Model")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /edit trade/i }))

    expect(await screen.findByText(/ICT Context/i)).toBeInTheDocument()
    expect(screen.getByText(/Daily Bias/i)).toBeInTheDocument()
    expect(screen.getByText(/Power of 3 \(AMD\) Phase/i)).toBeInTheDocument()
    expect(screen.getByText(/Market Structure/i)).toBeInTheDocument()
    expect(screen.getByText(/Premium \/ Discount/i)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Bearish" }))
    await user.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        "/v1/trade-histories",
        expect.objectContaining({
          dailyBias: 1,
        }),
      )
    })

    expect(updateTradeMock).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        dailyBias: 1,
      }),
    )
  })

  it("resets unsaved ICT edits when edit mode is canceled", async () => {
    const user = userEvent.setup()
    const module = await import("../../app/trade/[id]/page")
    const TradeDetailPage = module.default

    render(
      <Suspense fallback={<div>Suspending trade detail</div>}>
        <TradeDetailPage params={createResolvedParams("1")} />
      </Suspense>,
    )

    expect(await screen.findByText("Morning Venom Model")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /edit trade/i }))
    await user.click(screen.getByRole("button", { name: "Bearish" }))
    await user.click(screen.getByRole("button", { name: /cancel/i }))

    await user.click(screen.getByRole("button", { name: /edit trade/i }))
    await user.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith(
        "/v1/trade-histories",
        expect.objectContaining({
          dailyBias: null,
        }),
      )
    })
  })
})
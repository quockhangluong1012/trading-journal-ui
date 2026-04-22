import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import DashboardPage from "../../app/page"
import type { TradingSetupDetailDto } from "@/lib/setup-api"

const replaceSpy = vi.fn()

let authState: {
  user: {
    username: string
    email: string
    fullName: string
  } | null
  isLoading: boolean
} = {
  user: {
    username: "trader.one",
    email: "trader@example.com",
    fullName: "Trader One",
  },
  isLoading: false,
}

let todaySetupState: {
  setup: TradingSetupDetailDto | null
  isLoading: boolean
} = {
  setup: null,
  isLoading: false,
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: replaceSpy }),
}))

vi.mock("@/components/app-shell-loader", () => ({
  AppShellLoader: ({ title, description }: { title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}))

vi.mock("@/components/header", () => ({
  Header: () => <div>Header</div>,
}))

vi.mock("@/components/dashboard/dashboard-command-center", () => ({
  DashboardCommandCenter: ({ todaySetupBadge }: { todaySetupBadge?: ReactNode }) => (
    <div>
      <div>Dashboard Command Center</div>
      {todaySetupBadge}
    </div>
  ),
}))

vi.mock("@/components/dashboard/stats-cards", () => ({
  StatsCards: () => <div>Stats Cards</div>,
}))

vi.mock("@/components/dashboard/win-loss-chart", () => ({
  WinLossChart: () => <div>Win Loss Chart</div>,
}))

vi.mock("@/components/dashboard/profit-chart", () => ({
  ProfitChart: () => <div>Profit Chart</div>,
}))

vi.mock("@/components/dashboard/calendar-widget", () => ({
  CalendarWidget: () => <div>Calendar Widget</div>,
}))

vi.mock("@/components/dashboard/open-positions-table", () => ({
  OpenPositionsTable: () => <div>Open Positions</div>,
}))

vi.mock("@/components/session/active-session-widget", () => ({
  ActiveSessionWidget: () => <div>Active Session</div>,
}))

vi.mock("@/components/dashboard/today-setup-dialog", () => ({
  TodaySetupDialog: ({ open, setup }: { open: boolean; setup: TradingSetupDetailDto | null }) => (
    open ? <div data-testid="today-setup-dialog">{setup?.name}</div> : null
  ),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}))

vi.mock("@/hooks/use-dashboard-overview", () => ({
  useDashboardOverview: () => ({
    stats: {
      totalPnL: 0,
      winRate: 0,
      totalTrades: 0,
      openPositions: 0,
    },
    winLossData: [],
    profitTrajectory: [],
    openPositions: [],
    isLoading: false,
    isRefreshing: false,
    lastUpdatedAt: null,
    syncWarning: null,
    refresh: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-today-setup", () => ({
  useTodaySetup: () => ({
    setup: todaySetupState.setup,
    isLoading: todaySetupState.isLoading,
    refresh: vi.fn(),
  }),
}))

function createTodaySetup(overrides: Partial<TradingSetupDetailDto> = {}): TradingSetupDetailDto {
  return {
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
        position: { x: 80, y: 160 },
      },
      {
        id: "setup-node-step",
        kind: "step",
        title: "Validate context",
        notes: "Check bias before entry.",
        position: { x: 320, y: 160 },
      },
      {
        id: "setup-node-end",
        kind: "end",
        title: "Execute",
        notes: null,
        position: { x: 560, y: 160 },
      },
    ],
    edges: [
      { id: "edge-1", source: "setup-node-start", target: "setup-node-step", label: null },
      { id: "edge-2", source: "setup-node-step", target: "setup-node-end", label: "All conditions align" },
    ],
    ...overrides,
  }
}

describe("dashboard page", () => {
  beforeEach(() => {
    authState = {
      user: {
        username: "trader.one",
        email: "trader@example.com",
        fullName: "Trader One",
      },
      isLoading: false,
    }
    todaySetupState = {
      setup: null,
      isLoading: false,
    }
    replaceSpy.mockReset()
  })

  it("shows the today setup badge only when a setup exists for today", () => {
    todaySetupState.setup = createTodaySetup()

    const { rerender } = render(<DashboardPage />)

    expect(screen.getByRole("button", { name: /today setup: wait for the reclaim candle\./i })).toBeInTheDocument()

    todaySetupState.setup = null
    rerender(<DashboardPage />)

    expect(screen.queryByRole("button", { name: /today setup:/i })).not.toBeInTheDocument()
  })

  it("opens the read only today setup dialog when the badge is clicked", async () => {
    const user = userEvent.setup()
    todaySetupState.setup = createTodaySetup()

    render(<DashboardPage />)

    await user.click(screen.getByRole("button", { name: /today setup: wait for the reclaim candle\./i }))

    expect(screen.getByTestId("today-setup-dialog")).toHaveTextContent("London breakout")
  })
})
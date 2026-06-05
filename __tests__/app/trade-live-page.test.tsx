import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const replaceSpy = vi.fn()

let authState: { user: { id: string } | null; isLoading: boolean } = {
  user: { id: "user-1" },
  isLoading: false,
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceSpy }),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
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
  Header: () => <header>Header</header>,
}))

vi.mock("@/components/trade/live-tradingview-widget", () => ({
  LiveTradingViewWidget: ({ className }: { className?: string }) => (
    <div data-testid="live-tradingview-widget" data-classname={className}>
      Live TradingView Widget
    </div>
  ),
}))

describe("live trade page", () => {
  beforeEach(() => {
    authState = {
      user: { id: "user-1" },
      isLoading: false,
    }
    replaceSpy.mockReset()
  })

  it("renders the shared header above the live TradingView workspace", async () => {
    const module = await import("../../app/trade/live/page")
    const LiveTradePage = module.default

    render(<LiveTradePage />)

    expect(screen.getByText("Header")).toBeInTheDocument()
    expect(screen.getByTestId("live-tradingview-widget")).toBeInTheDocument()
  })
})

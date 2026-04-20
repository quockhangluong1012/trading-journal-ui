import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const replaceSpy = vi.fn()

let shouldSuspendSearchParams = false
let currentSearchParams = new URLSearchParams()
let authState: { user: { id: string } | null; isLoading: boolean } = {
  user: { id: "user-1" },
  isLoading: false,
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/trade/new",
  useRouter: () => ({ replace: replaceSpy }),
  useSearchParams: () => {
    if (shouldSuspendSearchParams) {
      throw new Promise(() => {})
    }

    return currentSearchParams
  },
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

vi.mock("@/components/create-trade-page", () => ({
  CreateTradePage: ({ returnTo }: { returnTo: string }) => (
    <div data-testid="create-trade-page">{returnTo}</div>
  ),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}))

describe("trade/new page", () => {
  beforeEach(() => {
    shouldSuspendSearchParams = false
    currentSearchParams = new URLSearchParams()
    authState = {
      user: { id: "user-1" },
      isLoading: false,
    }
    replaceSpy.mockReset()
    vi.resetModules()
  })

  it("shows the route loading fallback when search params suspend", async () => {
    shouldSuspendSearchParams = true

    const module = await import("../../app/trade/new/page")
    const TradeNewPage = module.default

    render(<TradeNewPage />)

    expect(screen.getByText("Loading trade planner")).toBeInTheDocument()
    expect(screen.getByText("Preparing your trade setup workspace.")).toBeInTheDocument()
  })

  it("renders the trade page with a sanitized return path when authenticated", async () => {
    currentSearchParams = new URLSearchParams("next=%2Freview")

    const module = await import("../../app/trade/new/page")
    const TradeNewPage = module.default

    render(<TradeNewPage />)

    expect(screen.getByText("Header")).toBeInTheDocument()
    expect(screen.getByTestId("create-trade-page")).toHaveTextContent("/review")
  })

  it("redirects unauthenticated users back to login with the current path", async () => {
    authState = {
      user: null,
      isLoading: false,
    }

    const module = await import("../../app/trade/new/create-trade-route-page-client")
    const { CreateTradeRoutePageClient } = module

    render(<CreateTradeRoutePageClient />)

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith("/login?next=%2Ftrade%2Fnew")
    })

    expect(screen.getByText("Redirecting to sign in")).toBeInTheDocument()
  })

  it("shows the auth loading state without redirecting", async () => {
    authState = {
      user: null,
      isLoading: true,
    }

    const module = await import("../../app/trade/new/create-trade-route-page-client")
    const { CreateTradeRoutePageClient } = module

    render(<CreateTradeRoutePageClient />)

    expect(screen.getByText("Loading trade planner")).toBeInTheDocument()
    expect(screen.getByText("Preparing your trade setup workspace.")).toBeInTheDocument()
    expect(replaceSpy).not.toHaveBeenCalled()
  })
})
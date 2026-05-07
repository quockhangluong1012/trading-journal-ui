import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const replaceSpy = vi.fn()
const toastSpy = vi.fn()
const apiGetMock = vi.fn()
const apiDeleteMock = vi.fn()

vi.mock("next/navigation", () => ({
  usePathname: () => "/history",
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

vi.mock("@/components/app-page-shell", () => ({
  AppPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/trade/ai-history-search-bar", () => ({
  AiHistorySearchBar: () => <div>AI history search</div>,
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: {
      username: "trader.one",
      email: "trader@example.com",
    },
    isLoading: false,
  }),
}))

vi.mock("@/lib/trade-context", () => ({
  useTrades: () => ({ userSessions: [] }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastSpy }),
}))

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    delete: (...args: unknown[]) => apiDeleteMock(...args),
  },
}))

describe("history page", () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.useFakeTimers()
    replaceSpy.mockReset()
    toastSpy.mockReset()
    apiDeleteMock.mockReset()
    apiGetMock.mockReset()
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/v1/emotions") {
        return new Promise(() => {})
      }

      return Promise.resolve({
        data: {
          isSuccess: true,
          value: {
            values: [],
            totalItems: 0,
          },
        },
      })
    })
    vi.resetModules()
  })

  it("renders the history intro for authenticated users", async () => {
    const module = await import("../../app/history/page")
    const HistoryPage = module.default

    render(<HistoryPage />)

    expect(screen.getByRole("heading", { name: "Trade History" })).toBeInTheDocument()
    expect(screen.getByText("Trade ledger")).toBeInTheDocument()
    expect(replaceSpy).not.toHaveBeenCalled()
  })
})
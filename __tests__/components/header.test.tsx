import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Header } from "@/components/header"
import { SidebarProvider } from "@/components/ui/sidebar"

const logoutSpy = vi.fn()
const usePathnameMock = vi.fn(() => "/")
const createDailyNotesState = (overrides: Partial<ReturnType<typeof useDailyNotesMock>> = {}) => ({
  note: null,
  isLoading: false,
  isSaving: false,
  shouldShowPopup: false,
  dismissPopup: vi.fn(),
  save: vi.fn(),
  refresh: vi.fn(),
  ...overrides,
})
const useDailyNotesMock = vi.fn(() => createDailyNotesState())

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: {
      username: "trader.one",
      email: "trader@example.com",
      fullName: "Trader One",
      isAdmin: false,
    },
    logout: logoutSpy,
    isLoading: false,
  }),
}))

vi.mock("@/hooks/use-daily-notes", () => ({
  useDailyNotes: () => useDailyNotesMock(),
}))

vi.mock("@/components/dashboard/daily-notes-dialog", () => ({
  DailyNotesDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Daily notes dialog</div> : null,
}))

describe("Header", () => {
  beforeEach(() => {
    usePathnameMock.mockReset()
    usePathnameMock.mockReturnValue("/")
    useDailyNotesMock.mockReset()
    useDailyNotesMock.mockImplementation(() => createDailyNotesState())
  })

  it("does not show the trading plan banner in the shared header on the dashboard", () => {
    render(
      <SidebarProvider>
        <Header />
      </SidebarProvider>
    )

    expect(screen.queryByRole("button", { name: /start your daily briefing/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/trading journal/i)).not.toBeInTheDocument()
  })

  it("shows the trading plan banner on non-dashboard trader routes", () => {
    usePathnameMock.mockReturnValue("/history")

    render(
      <SidebarProvider>
        <Header />
      </SidebarProvider>
    )

    expect(screen.getByRole("button", { name: /start your daily briefing/i })).toBeInTheDocument()
  })

  it("hides the trading plan banner on admin routes", () => {
    usePathnameMock.mockReturnValue("/admin")

    render(
      <SidebarProvider>
        <Header />
      </SidebarProvider>
    )

    expect(screen.queryByRole("button", { name: /start your daily briefing/i })).not.toBeInTheDocument()
  })

  it("opens the trading plan dialog from the header banner on non-dashboard routes", async () => {
    const user = userEvent.setup()

    usePathnameMock.mockReturnValue("/history")
    useDailyNotesMock.mockImplementation(() => createDailyNotesState({ shouldShowPopup: true }))

    render(
      <SidebarProvider>
        <Header />
      </SidebarProvider>
    )

    await user.click(screen.getByRole("button", { name: /start your daily briefing/i }))

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })

  it("shows the Sign out link inside the account menu", async () => {
    const user = userEvent.setup()

    render(
      <SidebarProvider>
        <Header />
      </SidebarProvider>
    )

    await user.click(screen.getByRole("button", { name: /account menu/i }))

    expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument()
  })
})
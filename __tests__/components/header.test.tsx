import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Header } from "@/components/header"
import { SidebarProvider } from "@/components/ui/sidebar"

const logoutSpy = vi.fn()

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
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

describe("Header", () => {
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
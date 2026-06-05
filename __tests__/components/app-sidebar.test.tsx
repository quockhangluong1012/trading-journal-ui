import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

let currentPathname = "/history"

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}))

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: {
      username: "trader.one",
      email: "trader@example.com",
      fullName: "Trader One",
      isAdmin: false,
    },
    isLoading: false,
  }),
}))

function renderSidebar() {
  return render(
    <SidebarProvider defaultOpen>
      <AppSidebar />
    </SidebarProvider>,
  )
}

function getDesktopSidebar(container: HTMLElement) {
  const sidebar = container.querySelector('[data-slot="sidebar"][data-state]')
  if (!(sidebar instanceof HTMLElement)) {
    throw new Error("Desktop sidebar was not rendered")
  }

  return sidebar
}

describe("AppSidebar", () => {
  beforeEach(() => {
    currentPathname = "/history"
  })

  it("collapses the sidebar after a clicked menu item finishes navigating", async () => {
    const user = userEvent.setup()
    const view = renderSidebar()

    expect(getDesktopSidebar(view.container)).toHaveAttribute("data-state", "expanded")

    await user.click(screen.getByRole("link", { name: /dashboard/i }))

    expect(getDesktopSidebar(view.container)).toHaveAttribute("data-state", "expanded")

    currentPathname = "/"
    view.rerender(
      <SidebarProvider defaultOpen>
        <AppSidebar />
      </SidebarProvider>,
    )

    await waitFor(() => {
      expect(getDesktopSidebar(view.container)).toHaveAttribute("data-state", "collapsed")
    })
  })
})

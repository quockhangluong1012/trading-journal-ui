import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LessonsList } from "@/components/lessons/lessons-list"
import { LessonCategory, LessonSeverity, LessonSortOption, LessonStatus } from "@/lib/lessons-api"

const pushMock = vi.fn()
const searchLessonsMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@/lib/lessons-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/lessons-api")>("@/lib/lessons-api")

  return {
    ...actual,
    searchLessons: (...args: unknown[]) => searchLessonsMock(...args),
  }
})

describe("LessonsList", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    searchLessonsMock.mockResolvedValue({
      data: {
        value: {
          values: [
            {
              id: 1,
              title: "AMD displacement checklist",
              category: LessonCategory.EntryTiming,
              severity: LessonSeverity.Critical,
              status: LessonStatus.Reviewing,
              tags: ["AMD", "London open"],
              keyTakeaway: "Wait for displacement.",
              impactScore: 9,
              linkedTradesCount: 2,
              createdDate: "2026-05-06T00:00:00.000Z",
            },
          ],
          totalItems: 1,
        },
      },
    })
  })

  it("sends tag, impact, and linked-trade filters while rendering lesson tags", async () => {
    const user = userEvent.setup()

    render(<LessonsList onRefreshDashboard={vi.fn()} />)

    await waitFor(() => expect(searchLessonsMock).toHaveBeenCalled())
    expect(await screen.findByText("#AMD")).toBeInTheDocument()
    expect(screen.getByText("#London open")).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText("Tags: AMD, NQ"), "AMD, London open")
    await user.type(screen.getByPlaceholderText("Search notes, takeaways, or themes..."), "displacement")
    await user.type(screen.getByPlaceholderText("Impact 1-10"), "8")
    await user.click(screen.getByRole("button", { name: /linked trades only/i }))

    await waitFor(() => {
      expect(searchLessonsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 10,
          searchTerm: "displacement",
          tags: ["AMD", "London open"],
          minimumImpactScore: 8,
          linkedTradesOnly: true,
          sortBy: LessonSortOption.Newest,
        })
      )
    })

    expect(screen.getByText("Impact 8+")).toBeInTheDocument()
  })
})
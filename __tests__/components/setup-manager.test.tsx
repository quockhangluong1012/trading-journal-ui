import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SetupManager } from "@/components/settings/setup-manager"
import type { TradingSetupDetailDto, TradingSetupSummaryDto } from "@/lib/setup-api"

const getTradingSetupsMock = vi.fn()
const getTradingSetupDetailMock = vi.fn()
const createTradingSetupMock = vi.fn()
const updateTradingSetupMock = vi.fn()
const deleteTradingSetupMock = vi.fn()
const toastMock = vi.fn()

vi.mock("@xyflow/react", async () => {
  const React = await import("react")

  return {
    addEdge: (connection: Record<string, unknown>, currentEdges: Array<Record<string, unknown>>) => [
      ...currentEdges,
      {
        id: `edge-${currentEdges.length + 1}`,
        ...connection,
      },
    ],
    Background: () => <div data-testid="flow-background" />,
    BackgroundVariant: {
      Dots: "dots",
    },
    Controls: () => <div data-testid="flow-controls" />,
    Handle: () => <div data-testid="flow-handle" />,
    MarkerType: {
      ArrowClosed: "arrow-closed",
    },
    MiniMap: () => <div data-testid="flow-minimap" />,
    Position: {
      Left: "left",
      Right: "right",
    },
    ReactFlow: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="react-flow">{children}</div>
    ),
    useEdgesState: (initialEdges: Array<Record<string, unknown>>) => {
      const [edges, setEdges] = React.useState(initialEdges)
      const onEdgesChange = React.useCallback(() => {}, [])

      return [edges, setEdges, onEdgesChange]
    },
    useNodesState: (initialNodes: Array<Record<string, unknown>>) => {
      const [nodes, setNodes] = React.useState(initialNodes)
      const onNodesChange = React.useCallback(() => {}, [])

      return [nodes, setNodes, onNodesChange]
    },
  }
})

vi.mock("@/lib/api", () => ({
  attachToken: vi.fn(),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}))

vi.mock("@/lib/setup-api", () => ({
  createTradingSetup: (...args: unknown[]) => createTradingSetupMock(...args),
  deleteTradingSetup: (...args: unknown[]) => deleteTradingSetupMock(...args),
  getTradingSetupDetail: (...args: unknown[]) => getTradingSetupDetailMock(...args),
  getTradingSetups: (...args: unknown[]) => getTradingSetupsMock(...args),
  updateTradingSetup: (...args: unknown[]) => updateTradingSetupMock(...args),
}))

function createSetupSummary(overrides: Partial<TradingSetupSummaryDto> = {}): TradingSetupSummaryDto {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Setup",
    description: overrides.description ?? null,
    stepCount: overrides.stepCount ?? 3,
    createdAt: overrides.createdAt ?? "2026-04-21T10:00:00.000Z",
    lastUpdatedAt: overrides.lastUpdatedAt ?? "2026-04-21T10:00:00.000Z",
  }
}

function createSetupDetail(summary: TradingSetupSummaryDto): TradingSetupDetailDto {
  return {
    ...summary,
    nodes: [
      {
        id: `setup-node-start-${summary.id}`,
        kind: "start",
        title: "Start",
        notes: null,
        position: { x: 80, y: 160 },
      },
      {
        id: `setup-node-step-${summary.id}`,
        kind: "step",
        title: `${summary.name} checkpoint`,
        notes: "Validate context before entry.",
        position: { x: 320, y: 160 },
      },
      {
        id: `setup-node-end-${summary.id}`,
        kind: "end",
        title: "Finish",
        notes: null,
        position: { x: 560, y: 160 },
      },
    ],
    edges: [
      {
        id: `setup-edge-1-${summary.id}`,
        source: `setup-node-start-${summary.id}`,
        target: `setup-node-step-${summary.id}`,
        label: null,
      },
      {
        id: `setup-edge-2-${summary.id}`,
        source: `setup-node-step-${summary.id}`,
        target: `setup-node-end-${summary.id}`,
        label: "All conditions align",
      },
    ],
  }
}

describe("SetupManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    createTradingSetupMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: 99,
      },
    })
    updateTradingSetupMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: true,
      },
    })
    deleteTradingSetupMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: true,
      },
    })
  })

  it("shows setups newest first in the library and opens read-only view mode", async () => {
    const user = userEvent.setup()
    const setups = [
      createSetupSummary({ id: 1, name: "Asia range", lastUpdatedAt: "2026-04-19T08:30:00.000Z" }),
      createSetupSummary({ id: 2, name: "London breakdown", lastUpdatedAt: "2026-04-21T09:15:00.000Z" }),
      createSetupSummary({ id: 3, name: "NY reversal", lastUpdatedAt: "2026-04-20T16:45:00.000Z" }),
    ]

    getTradingSetupsMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: setups,
      },
    })
    getTradingSetupDetailMock.mockImplementation(async (setupId: number) => ({
      data: {
        isSuccess: true,
        value: createSetupDetail(setups.find((setup) => setup.id === setupId)!),
      },
    }))

    render(<SetupManager />)

    await waitFor(() => expect(getTradingSetupsMock).toHaveBeenCalledTimes(1))

    expect(screen.getAllByRole("heading", { level: 2 }).map((element) => element.textContent)).toEqual([
      "London breakdown",
      "NY reversal",
      "Asia range",
    ])

    const londonCard = screen.getByText("London breakdown").closest("article")
    expect(londonCard).not.toBeNull()

    await user.click(within(londonCard!).getByRole("button", { name: "View" }))

    await waitFor(() => expect(screen.getByText("View mode")).toBeInTheDocument())

    expect(screen.getByRole("button", { name: "Back to setups" })).toBeInTheDocument()
    expect(screen.queryByText("Setup controls")).not.toBeInTheDocument()
    expect(getTradingSetupDetailMock).toHaveBeenCalledWith(2)
  })

  it("opens edit mode with the workspace panel when edit is selected", async () => {
    const user = userEvent.setup()
    const setups = [
      createSetupSummary({ id: 1, name: "Asia range", lastUpdatedAt: "2026-04-19T08:30:00.000Z" }),
      createSetupSummary({ id: 2, name: "London breakdown", lastUpdatedAt: "2026-04-21T09:15:00.000Z" }),
    ]

    getTradingSetupsMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: setups,
      },
    })
    getTradingSetupDetailMock.mockImplementation(async (setupId: number) => ({
      data: {
        isSuccess: true,
        value: createSetupDetail(setups.find((setup) => setup.id === setupId)!),
      },
    }))

    render(<SetupManager />)

    await waitFor(() => expect(getTradingSetupsMock).toHaveBeenCalledTimes(1))

    const asiaCard = screen.getByText("Asia range").closest("article")
    expect(asiaCard).not.toBeNull()

    await user.click(within(asiaCard!).getByRole("button", { name: "Edit" }))

    await waitFor(() => expect(screen.getByText("Edit mode")).toBeInTheDocument())

    expect(screen.getByText("Setup controls")).toBeInTheDocument()
    expect(screen.getByLabelText("Setup name")).toHaveValue("Asia range")
    expect(screen.getByText("Node toolbox")).toBeInTheDocument()
    expect(getTradingSetupDetailMock).toHaveBeenCalledWith(1)
  })

  it("deletes a setup directly from the library after confirmation", async () => {
    const user = userEvent.setup()
    const initialSetups = [
      createSetupSummary({ id: 1, name: "Asia range", lastUpdatedAt: "2026-04-19T08:30:00.000Z" }),
      createSetupSummary({ id: 2, name: "London breakdown", lastUpdatedAt: "2026-04-21T09:15:00.000Z" }),
    ]

    getTradingSetupsMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: initialSetups,
      },
    })

    render(<SetupManager />)

    await waitFor(() => expect(getTradingSetupsMock).toHaveBeenCalledTimes(1))

    const londonCard = screen.getByText("London breakdown").closest("article")
    expect(londonCard).not.toBeNull()

    await user.click(within(londonCard!).getByRole("button", { name: "Delete" }))

    expect(screen.getByText("Delete this setup?")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Delete setup" }))

    await waitFor(() => expect(deleteTradingSetupMock).toHaveBeenCalledWith(2))

    expect(screen.queryByText("London breakdown")).not.toBeInTheDocument()
    expect(screen.getByText("Asia range")).toBeInTheDocument()
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Setup deleted",
    }))
  })

  it("deletes the currently open setup from the workspace and returns to the library", async () => {
    const user = userEvent.setup()
    const setups = [
      createSetupSummary({ id: 1, name: "Asia range", lastUpdatedAt: "2026-04-19T08:30:00.000Z" }),
      createSetupSummary({ id: 2, name: "London breakdown", lastUpdatedAt: "2026-04-21T09:15:00.000Z" }),
    ]

    getTradingSetupsMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: setups,
      },
    })
    getTradingSetupDetailMock.mockImplementation(async (setupId: number) => ({
      data: {
        isSuccess: true,
        value: createSetupDetail(setups.find((setup) => setup.id === setupId)!),
      },
    }))

    render(<SetupManager />)

    await waitFor(() => expect(getTradingSetupsMock).toHaveBeenCalledTimes(1))

    const londonCard = screen.getByText("London breakdown").closest("article")
    expect(londonCard).not.toBeNull()

    await user.click(within(londonCard!).getByRole("button", { name: "View" }))

    await waitFor(() => expect(screen.getByText("View mode")).toBeInTheDocument())

    await user.click(screen.getByRole("button", { name: "Delete" }))
    await user.click(screen.getByRole("button", { name: "Delete setup" }))

    await waitFor(() => expect(deleteTradingSetupMock).toHaveBeenCalledWith(2))
    await waitFor(() => expect(screen.getByText("Saved flowcharts")).toBeInTheDocument())

    expect(screen.queryByText("London breakdown")).not.toBeInTheDocument()
    expect(screen.getByText("Asia range")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Back to setups" })).not.toBeInTheDocument()
  })

  it("shows an error toast when library deletion fails", async () => {
    const user = userEvent.setup()
    const setups = [
      createSetupSummary({ id: 1, name: "Asia range", lastUpdatedAt: "2026-04-19T08:30:00.000Z" }),
    ]

    getTradingSetupsMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: setups,
      },
    })
    deleteTradingSetupMock.mockRejectedValue({
      response: {
        data: {
          description: "The setup could not be removed.",
        },
      },
    })

    render(<SetupManager />)

    await waitFor(() => expect(getTradingSetupsMock).toHaveBeenCalledTimes(1))

    const asiaCard = screen.getByText("Asia range").closest("article")
    expect(asiaCard).not.toBeNull()

    await user.click(within(asiaCard!).getByRole("button", { name: "Delete" }))
    await user.click(screen.getByRole("button", { name: "Delete setup" }))

    await waitFor(() => expect(deleteTradingSetupMock).toHaveBeenCalledWith(1))

    expect(getTradingSetupsMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Delete this setup?")).toBeInTheDocument()
    expect(screen.getByText("Asia range")).toBeInTheDocument()
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Unable to delete setup",
      description: "The setup could not be removed.",
      variant: "destructive",
    }))
  })

  it("asks for confirmation before leaving a dirty workspace", async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const setups = [
      createSetupSummary({ id: 1, name: "Asia range", lastUpdatedAt: "2026-04-19T08:30:00.000Z" }),
    ]

    getTradingSetupsMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: setups,
      },
    })
    getTradingSetupDetailMock.mockImplementation(async (setupId: number) => ({
      data: {
        isSuccess: true,
        value: createSetupDetail(setups.find((setup) => setup.id === setupId)!),
      },
    }))

    render(<SetupManager />)

    await waitFor(() => expect(getTradingSetupsMock).toHaveBeenCalledTimes(1))

    const asiaCard = screen.getByText("Asia range").closest("article")
    expect(asiaCard).not.toBeNull()

    await user.click(within(asiaCard!).getByRole("button", { name: "Edit" }))

    await waitFor(() => expect(screen.getByText("Edit mode")).toBeInTheDocument())

    const setupNameInput = screen.getByLabelText("Setup name")
    await user.clear(setupNameInput)
    await user.type(setupNameInput, "Asia range updated")
    await user.click(screen.getByRole("button", { name: "Close" }))
    await user.click(screen.getByRole("button", { name: "Back to setups" }))

    expect(confirmSpy).toHaveBeenCalledWith("You have unsaved changes. Return to the setup library without saving?")
    await waitFor(() => expect(screen.getByText("Saved flowcharts")).toBeInTheDocument())

    confirmSpy.mockRestore()
  }, 10000)
})
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIVE_CHART_KILLZONES,
  LiveTradingViewWidget,
  bindLiveOrderContextMenu,
  buildLiveTradeHistoryPayload,
  buildLiveKillzoneSegments,
  doesLivePriceTriggerPendingOrder,
  getActiveLiveKillzone,
  type LivePendingOrder,
} from "@/components/trade/live-tradingview-widget";

const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());
const tradingViewWidgetMock = vi.hoisted(() => vi.fn());

type TradingViewContextMenuCallback = (
  unixTime: number,
  price?: number,
) => Array<{ text: string; click: () => void }>;

let tradingViewContextMenuCallback: TradingViewContextMenuCallback | null = null;

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const toSeconds = (iso: string) => Date.parse(iso) / 1000;

function clearTradingViewScripts() {
  document
    .querySelectorAll('script[src="https://s3.tradingview.com/tv.js"]')
    .forEach((script) => script.remove());
}

function installTradingViewWidgetMock() {
  tradingViewWidgetMock.mockImplementation(function MockWidget(this: {
    remove: () => void;
    onChartReady: (callback: () => void) => void;
    onContextMenu: (callback: TradingViewContextMenuCallback) => void;
    activeChart: () => { getVisibleRange: () => null };
  }) {
    this.remove = vi.fn();
    this.activeChart = () => ({
      getVisibleRange: () => null,
    });
    this.onChartReady = (callback) => callback();
    this.onContextMenu = (callback) => {
      tradingViewContextMenuCallback = callback;
    };
  });

  Object.defineProperty(window, "TradingView", {
    configurable: true,
    value: {
      widget: tradingViewWidgetMock,
    },
  });
}

function mockLiveOrderReferenceData() {
  apiGetMock.mockImplementation((url: string) => {
    switch (url) {
      case "/v1/trading-zones":
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: [
              {
                id: 7,
                name: "London",
                description: null,
                fromTime: "02:00",
                toTime: "05:00",
              },
            ],
          },
        });
      case "/v1/checklist-models":
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: [
              {
                id: 1,
                name: "Core checklist",
                description: null,
                criteriaCount: 1,
              },
            ],
          },
        });
      case "/v1/checklist-models/1":
        return Promise.resolve({
          data: {
            isSuccess: true,
            value: {
              id: 1,
              name: "Core checklist",
              description: null,
              criteria: [
                {
                  id: 11,
                  name: "Waited for displacement",
                  checkListType: 2,
                },
              ],
            },
          },
        });
      default:
        throw new Error(`Unexpected api.get call for ${url}`);
    }
  });
}

function createPendingOrder(overrides: Partial<LivePendingOrder> = {}): LivePendingOrder {
  return {
    id: "order-1",
    asset: "NAS100",
    side: "short",
    entryPrice: 17000.5,
    stopLoss: 17025,
    targetTier1: 16950,
    notes: "",
    confidenceLevel: 3,
    tradeHistoryChecklists: [11],
    tradingZoneId: 7,
    tradingZoneName: "London",
    checklistModelId: 1,
    createdAt: "2026-06-04T10:00:00.000Z",
    ...overrides,
  };
}

describe("live TradingView ICT killzone overlay", () => {
  beforeEach(() => {
    localStorage.clear();
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    toastMock.mockReset();
    tradingViewWidgetMock.mockReset();
    tradingViewContextMenuCallback = null;
    clearTradingViewScripts();
    Reflect.deleteProperty(window, "TradingView");
    apiPostMock.mockResolvedValue({
      data: {
        isSuccess: true,
        value: 789,
      },
    });
    mockLiveOrderReferenceData();
  });

  it("builds live order items for TradingView's chart context menu", () => {
    const onPlaceOrder = vi.fn();
    const widget = {
      onContextMenu: vi.fn(),
    };

    const cleanup = bindLiveOrderContextMenu(
      widget,
      onPlaceOrder,
    );

    const callback = widget.onContextMenu.mock.calls[0][0];
    const items = callback(1_780_000_000, 17000.5);

    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("Place long order @ 17,000.50");
    expect(items[1].text).toBe("Place short order @ 17,000.50");

    items[0].click();

    expect(onPlaceOrder).toHaveBeenCalledWith("long", 17000.5);

    cleanup();

    expect(callback(1_780_000_000, 17000.5)).toEqual([]);
  });

  it("positions session bands from the visible chart range", () => {
    const range = {
      from: toSeconds("2026-06-04T05:00:00.000Z"),
      to: toSeconds("2026-06-04T16:00:00.000Z"),
      source: "widget" as const,
    };

    const segments = buildLiveKillzoneSegments(range);
    const london = segments.find((segment) => segment.id === "london-open");
    const newYork = segments.find((segment) => segment.id === "new-york-am");

    expect(london).toMatchObject({
      label: "London Open",
      start: toSeconds("2026-06-04T06:00:00.000Z"),
      end: toSeconds("2026-06-04T09:00:00.000Z"),
    });
    expect(london?.leftPct).toBeCloseTo(9.09, 2);
    expect(london?.widthPct).toBeCloseTo(27.27, 2);

    expect(newYork).toMatchObject({
      label: "New York AM",
      start: toSeconds("2026-06-04T11:00:00.000Z"),
      end: toSeconds("2026-06-04T14:00:00.000Z"),
    });
  });

  it("recomputes x positions when the chart visible range moves", () => {
    const firstRange = {
      from: toSeconds("2026-06-04T05:00:00.000Z"),
      to: toSeconds("2026-06-04T16:00:00.000Z"),
      source: "widget" as const,
    };
    const movedRange = {
      from: toSeconds("2026-06-04T06:00:00.000Z"),
      to: toSeconds("2026-06-04T17:00:00.000Z"),
      source: "widget" as const,
    };

    const firstLondon = buildLiveKillzoneSegments(firstRange).find(
      (segment) => segment.id === "london-open",
    );
    const movedLondon = buildLiveKillzoneSegments(movedRange).find(
      (segment) => segment.id === "london-open",
    );

    expect(firstLondon?.leftPct).toBeGreaterThan(movedLondon?.leftPct ?? 0);
    expect(movedLondon?.leftPct).toBe(0);
  });

  it("handles overnight Asian killzone clipping", () => {
    const range = {
      from: toSeconds("2026-06-04T23:00:00.000Z"),
      to: toSeconds("2026-06-05T06:00:00.000Z"),
      source: "widget" as const,
    };

    const asian = buildLiveKillzoneSegments(range).find(
      (segment) => segment.id === "asian-range",
    );

    expect(asian).toMatchObject({
      label: "Asian Range",
      start: toSeconds("2026-06-05T00:00:00.000Z"),
      end: toSeconds("2026-06-05T04:00:00.000Z"),
    });
    expect(asian?.leftPct).toBeCloseTo(14.29, 2);
  });

  it("detects the active New York AM killzone in New York time", () => {
    expect(getActiveLiveKillzone(new Date("2026-06-04T11:30:00.000Z"))).toMatchObject({
      id: "new-york-am",
      label: "New York AM",
    });
  });

  it("repositions sessions when the selected killzone timezone changes", () => {
    const range = {
      from: toSeconds("2026-06-04T05:00:00.000Z"),
      to: toSeconds("2026-06-04T16:00:00.000Z"),
      source: "widget" as const,
    };

    const newYorkAmInUtc = buildLiveKillzoneSegments(
      range,
      LIVE_CHART_KILLZONES,
      "Etc/UTC",
    ).find((segment) => segment.id === "new-york-am");

    expect(newYorkAmInUtc).toMatchObject({
      label: "New York AM",
      start: toSeconds("2026-06-04T07:00:00.000Z"),
      end: toSeconds("2026-06-04T10:00:00.000Z"),
    });
    expect(newYorkAmInUtc?.leftPct).toBeCloseTo(18.18, 2);
  });

  it("uses the selected timezone when detecting the active killzone", () => {
    expect(
      getActiveLiveKillzone(
        new Date("2026-06-04T07:30:00.000Z"),
        LIVE_CHART_KILLZONES,
        "Etc/UTC",
      ),
    ).toMatchObject({
      id: "new-york-am",
      label: "New York AM",
    });
  });

  it("detects pending order triggers from an app-owned price update", () => {
    expect(
      doesLivePriceTriggerPendingOrder(
        createPendingOrder({ side: "long", entryPrice: 100 }),
        99.5,
      ),
    ).toBe(true);
    expect(
      doesLivePriceTriggerPendingOrder(
        createPendingOrder({ side: "short", entryPrice: 100 }),
        100.5,
      ),
    ).toBe(true);
    expect(
      doesLivePriceTriggerPendingOrder(
        createPendingOrder({ side: "short", entryPrice: 100 }),
        99.5,
      ),
    ).toBe(false);
    expect(
      doesLivePriceTriggerPendingOrder(
        createPendingOrder({ side: "long", entryPrice: 100 }),
        101,
        99,
      ),
    ).toBe(true);
  });

  it("builds a CreateTrade payload with backend-required live order fields", () => {
    const payload = buildLiveTradeHistoryPayload(
      createPendingOrder({ notes: "" }),
      new Date("2026-06-04T12:15:00.000Z"),
      17000.5,
    );

    expect(payload).toMatchObject({
      asset: "NAS100",
      position: 2,
      entryPrice: 17000.5,
      stopLoss: 17025,
      targetTier1: 16950,
      status: 1,
      confidenceLevel: 3,
      tradeHistoryChecklists: [11],
      tradingZoneId: 7,
      tradingSessionId: null,
    });
    expect(payload.notes).toContain("Live pending order triggered at 17,000.50.");
  });

  it("renders the non-blocking overlay above the hosted chart", () => {
    render(<LiveTradingViewWidget />);

    expect(screen.getByLabelText("ICT kill zone overlay")).toHaveClass(
      "pointer-events-none",
    );
    expect(
      screen.getByRole("button", { name: "Toggle ICT kill zones" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("combobox", { name: "Kill zone timezone" }),
    ).toBeInTheDocument();
  });

  it("renders chart timeframes as individual buttons", async () => {
    const user = userEvent.setup();

    render(<LiveTradingViewWidget />);

    expect(
      screen.queryByRole("combobox", { name: "Chart timeframe" }),
    ).not.toBeInTheDocument();

    for (const label of ["1m", "5m", "15m", "1H", "4H", "1D", "1W"]) {
      expect(
        screen.getByRole("radio", { name: `Switch to ${label} timeframe` }),
      ).toBeInTheDocument();
    }

    expect(
      screen.getByRole("radio", { name: "Switch to 1H timeframe" }),
    ).toHaveAttribute("aria-checked", "true");

    await user.click(
      screen.getByRole("radio", { name: "Switch to 5m timeframe" }),
    );

    expect(
      screen.getByRole("radio", { name: "Switch to 5m timeframe" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("stores the live chart order ticket as a pending order before creating trade history", async () => {
    const user = userEvent.setup();

    render(<LiveTradingViewWidget />);

    await user.click(
      screen.getByRole("button", { name: "Open live order ticket" }),
    );

    const ticket = screen.getByRole("form", { name: "Live order ticket" });

    expect(within(ticket).getByLabelText("Asset")).toHaveValue("NAS100");

    await user.click(within(ticket).getByRole("button", { name: "Short" }));
    await user.clear(within(ticket).getByLabelText("Entry price"));
    await user.type(within(ticket).getByLabelText("Entry price"), "17000.5");
    await user.type(within(ticket).getByLabelText("Stop loss"), "17025");
    await user.type(within(ticket).getByLabelText("Target T1"), "16950");
    await user.click(await within(ticket).findByRole("button", { name: /London/ }));
    await user.click(await within(ticket).findByText("Waited for displacement"));
    await user.click(
      within(ticket).getByRole("button", { name: "Place short order" }),
    );

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Pending order NAS100 short at 17,000.50"),
    ).toBeInTheDocument();

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Pending order saved",
        description: "NAS100 short order is waiting for 17,000.50.",
      }),
    );
  });

  it("cancels pending live orders from the chart overlay", async () => {
    const user = userEvent.setup();

    render(<LiveTradingViewWidget />);

    await user.click(
      screen.getByRole("button", { name: "Open live order ticket" }),
    );

    const ticket = screen.getByRole("form", { name: "Live order ticket" });

    await user.click(within(ticket).getByRole("button", { name: "Short" }));
    await user.clear(within(ticket).getByLabelText("Entry price"));
    await user.type(within(ticket).getByLabelText("Entry price"), "17000.5");
    await user.type(within(ticket).getByLabelText("Stop loss"), "17025");
    await user.type(within(ticket).getByLabelText("Target T1"), "16950");
    await user.click(await within(ticket).findByRole("button", { name: /London/ }));
    await user.click(await within(ticket).findByText("Waited for displacement"));
    await user.click(
      within(ticket).getByRole("button", { name: "Place short order" }),
    );

    await user.click(
      screen.getByRole("button", {
        name: "Cancel pending NAS100 short order at 17,000.50",
      }),
    );

    expect(
      screen.queryByLabelText("Pending order NAS100 short at 17,000.50"),
    ).not.toBeInTheDocument();
  });

  it("creates an active trade history row when the pending order price triggers", async () => {
    const user = userEvent.setup();

    render(<LiveTradingViewWidget />);

    await user.click(
      screen.getByRole("button", { name: "Open live order ticket" }),
    );

    const ticket = screen.getByRole("form", { name: "Live order ticket" });

    await user.click(within(ticket).getByRole("button", { name: "Short" }));
    await user.clear(within(ticket).getByLabelText("Entry price"));
    await user.type(within(ticket).getByLabelText("Entry price"), "17000.5");
    await user.type(within(ticket).getByLabelText("Stop loss"), "17025");
    await user.type(within(ticket).getByLabelText("Target T1"), "16950");
    await user.click(await within(ticket).findByRole("button", { name: /London/ }));
    await user.click(await within(ticket).findByText("Waited for displacement"));
    await user.click(
      within(ticket).getByRole("button", { name: "Place short order" }),
    );

    await user.type(screen.getByLabelText("Last price"), "17000.5");
    await user.click(screen.getByRole("button", { name: "Update live price" }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        "/v1/trade-histories",
        expect.objectContaining({
          asset: "NAS100",
          position: 2,
          entryPrice: 17000.5,
          stopLoss: 17025,
          targetTier1: 16950,
          status: 1,
          tradeHistoryChecklists: [11],
          tradingZoneId: 7,
        }),
      );
    });

    expect(
      screen.queryByLabelText("Pending order NAS100 short at 17,000.50"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Active order NAS100 short at 17,000.50"),
    ).toBeInTheDocument();
  });

  it("lets the live order ticket be dragged to another chart position", async () => {
    const user = userEvent.setup();

    render(<LiveTradingViewWidget />);

    await user.click(
      screen.getByRole("button", { name: "Open live order ticket" }),
    );

    const ticket = screen.getByRole("form", { name: "Live order ticket" });
    const dragHandle = within(ticket).getByRole("button", {
      name: "Drag live order ticket",
    });
    const chartContainer = ticket.parentElement;

    expect(chartContainer).not.toBeNull();

    Object.defineProperty(chartContainer, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 800,
        width: 1000,
        height: 800,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });
    Object.defineProperty(ticket, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        left: 320,
        top: 40,
        right: 680,
        bottom: 460,
        width: 360,
        height: 420,
        x: 320,
        y: 40,
        toJSON: () => {},
      }),
    });

    fireEvent.pointerDown(dragHandle, {
      pointerId: 1,
      clientX: 340,
      clientY: 60,
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 520,
      clientY: 220,
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      clientX: 520,
      clientY: 220,
    });

    expect(ticket).toHaveStyle({
      left: "500px",
      top: "200px",
      right: "auto",
    });
  });

  it("opens the live order ticket from the hosted chart context menu price", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    installTradingViewWidgetMock();

    render(<LiveTradingViewWidget />);

    await waitFor(() => {
      const scripts = document.querySelectorAll<HTMLScriptElement>(
        'script[src="https://s3.tradingview.com/tv.js"]',
      );
      expect(scripts.length).toBeGreaterThan(0);
    });

    const scripts = document.querySelectorAll<HTMLScriptElement>(
      'script[src="https://s3.tradingview.com/tv.js"]',
    );
    fireEvent.load(scripts[scripts.length - 1]);

    await waitFor(() => {
      expect(tradingViewContextMenuCallback).not.toBeNull();
    });

    const items = tradingViewContextMenuCallback!(1_780_000_000, 17000.5);

    await act(async () => {
      items[1].click();
    });

    const ticket = screen.getByRole("form", { name: "Live order ticket" });

    expect(within(ticket).getByRole("button", { name: "Short" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(ticket).getByLabelText("Entry price")).toHaveValue(17000.5);
  });
});

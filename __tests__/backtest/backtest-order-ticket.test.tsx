import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  BacktestOrderTicket,
  clampBacktestOrderTicketPosition,
  isBacktestOrderTicketShortcut,
} from "@/components/backtest/backtest-order-ticket";

vi.mock("@/components/backtest/order-panel", () => ({
  OrderPanel: ({
    sessionId,
    currentPrice,
    previousPrice,
  }: {
    sessionId: number;
    currentPrice: number;
    previousPrice?: number | null;
  }) => (
    <div data-testid="order-panel">
      Order panel {sessionId} {currentPrice} {previousPrice}
    </div>
  ),
}));

function mockRect(element: Element, rect: Partial<DOMRect>) {
  element.getBoundingClientRect = vi.fn(() => ({
    x: rect.left ?? 0,
    y: rect.top ?? 0,
    left: rect.left ?? 0,
    top: rect.top ?? 0,
    right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 0),
    bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
    width: rect.width ?? 0,
    height: rect.height ?? 0,
    toJSON: () => ({}),
  }) as DOMRect);
}

describe("BacktestOrderTicket", () => {
  it("detects Alt+B as the order ticket shortcut", () => {
    expect(isBacktestOrderTicketShortcut({ altKey: true, ctrlKey: false, key: "b", metaKey: false })).toBe(true);
    expect(isBacktestOrderTicketShortcut({ altKey: true, ctrlKey: false, key: "B", metaKey: false })).toBe(true);
    expect(isBacktestOrderTicketShortcut({ altKey: false, ctrlKey: false, key: "b", metaKey: false })).toBe(false);
    expect(isBacktestOrderTicketShortcut({ altKey: true, ctrlKey: true, key: "b", metaKey: false })).toBe(false);
  });

  it("opens the floating order ticket from a chart price request", () => {
    const { rerender } = render(
      <div>
        <BacktestOrderTicket
          sessionId={42}
          currentPrice={24394.1}
          openRequest={{ id: 0, price: null }}
        />
      </div>,
    );

    expect(screen.queryByLabelText("Backtest order ticket")).not.toBeInTheDocument();

    rerender(
      <div>
        <BacktestOrderTicket
          sessionId={42}
          currentPrice={24394.1}
          openRequest={{ id: 1, price: 24394.1 }}
        />
      </div>,
    );

    expect(screen.getByLabelText("Backtest order ticket")).toBeInTheDocument();
    expect(screen.getByTestId("order-panel")).toHaveTextContent("Order panel 42 24394.1");
  });

  it("opens and closes the floating order ticket", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <BacktestOrderTicket sessionId={42} currentPrice={1.234} previousPrice={1.2} />
      </div>,
    );

    expect(screen.queryByLabelText("Backtest order ticket")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(screen.getByLabelText("Backtest order ticket")).toBeInTheDocument();
    expect(screen.getByTestId("order-panel")).toHaveTextContent("Order panel 42 1.234 1.2");

    await user.click(screen.getByRole("button", { name: "Close order ticket" }));

    expect(screen.queryByLabelText("Backtest order ticket")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Place order" })).toBeInTheDocument();
  });

  it("drags the ticket within the chart host bounds", async () => {
    const user = userEvent.setup();

    render(
      <div data-testid="chart-host">
        <BacktestOrderTicket sessionId={42} currentPrice={1.234} />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Place order" }));

    const host = screen.getByTestId("chart-host");
    const ticket = screen.getByLabelText("Backtest order ticket");
    const handle = screen.getByRole("button", { name: "Move order ticket" });

    mockRect(host, { left: 0, top: 0, width: 800, height: 500 });
    mockRect(ticket, { left: 300, top: 40, width: 360, height: 300 });

    fireEvent.pointerDown(handle, {
      pointerId: 7,
      pointerType: "mouse",
      button: 0,
      clientX: 300,
      clientY: 40,
    });
    fireEvent.pointerMove(window, {
      pointerId: 7,
      clientX: 410,
      clientY: 120,
    });
    fireEvent.pointerUp(window, { pointerId: 7 });

    expect(ticket).toHaveStyle({
      left: "410px",
      top: "120px",
      right: "auto",
    });
  });

  it("nudges the ticket with arrow keys from the drag handle", async () => {
    const user = userEvent.setup();

    render(
      <div data-testid="chart-host">
        <BacktestOrderTicket sessionId={42} currentPrice={1.234} />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Place order" }));

    const host = screen.getByTestId("chart-host");
    const ticket = screen.getByLabelText("Backtest order ticket");
    const handle = screen.getByRole("button", { name: "Move order ticket" });

    mockRect(host, { left: 0, top: 0, width: 800, height: 500 });
    mockRect(ticket, { left: 300, top: 40, width: 360, height: 300 });

    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });

    expect(ticket).toHaveStyle({
      left: "316px",
      top: "88px",
      right: "auto",
    });
  });

  it("clamps ticket coordinates to the available area", () => {
    expect(clampBacktestOrderTicketPosition({ x: -20, y: 900 }, 400, 300)).toEqual({
      x: 0,
      y: 300,
    });
    expect(clampBacktestOrderTicketPosition({ x: 220, y: 120 }, 400, 300)).toEqual({
      x: 220,
      y: 120,
    });
  });
});

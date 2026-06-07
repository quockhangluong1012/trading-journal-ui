"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { BarChart3, GripVertical, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OrderPanel } from "@/components/backtest/order-panel";
import { cn } from "@/lib/utils";

interface BacktestOrderTicketProps {
  sessionId: number;
  currentPrice: number;
  previousPrice?: number | null;
  openRequest?: BacktestOrderTicketOpenRequest;
}

export interface BacktestOrderTicketPosition {
  x: number;
  y: number;
}

export interface BacktestOrderTicketOpenRequest {
  id: number;
  price?: number | null;
}

interface BacktestOrderTicketDragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  maxX: number;
  maxY: number;
}

export function clampBacktestOrderTicketPosition(
  position: BacktestOrderTicketPosition,
  maxX: number,
  maxY: number,
): BacktestOrderTicketPosition {
  return {
    x: Math.min(Math.max(position.x, 0), maxX),
    y: Math.min(Math.max(position.y, 0), maxY),
  };
}

export function isBacktestOrderTicketShortcut(event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey">) {
  return event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "b";
}

function normalizeTicketPrice(price: number | null | undefined): number | null {
  return typeof price === "number" && Number.isFinite(price) && price > 0 ? price : null;
}

function formatTicketPrice(price: number | null) {
  if (price === null) {
    return null;
  }

  return price.toLocaleString("en-US", {
    maximumFractionDigits: price >= 100 ? 2 : 5,
    minimumFractionDigits: price >= 100 ? 2 : 5,
  });
}

export function BacktestOrderTicket({
  sessionId,
  currentPrice,
  previousPrice = null,
  openRequest,
}: BacktestOrderTicketProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [ticketPosition, setTicketPosition] = useState<BacktestOrderTicketPosition | null>(null);
  const [ticketVersion, setTicketVersion] = useState(0);
  const [openedAtPrice, setOpenedAtPrice] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const ticketRef = useRef<HTMLElement>(null);
  const dragStateRef = useRef<BacktestOrderTicketDragState | null>(null);
  const lastOpenRequestIdRef = useRef<number | null>(openRequest?.id ?? null);

  const openTicket = useCallback((price: number | null | undefined = currentPrice) => {
    setOpenedAtPrice(normalizeTicketPrice(price) ?? normalizeTicketPrice(currentPrice));
    setTicketVersion((version) => version + 1);
    setIsOpen(true);
  }, [currentPrice]);

  const getTicketDragBounds = useCallback(() => {
    const ticket = ticketRef.current;
    const chartContainer = ticket?.parentElement;

    if (!ticket || !chartContainer) {
      return null;
    }

    const ticketRect = ticket.getBoundingClientRect();
    const containerRect = chartContainer.getBoundingClientRect();
    const currentX = ticketPosition?.x ?? ticketRect.left - containerRect.left;
    const currentY = ticketPosition?.y ?? ticketRect.top - containerRect.top;

    return {
      currentX,
      currentY,
      maxX: Math.max(0, containerRect.width - ticketRect.width),
      maxY: Math.max(0, containerRect.height - ticketRect.height),
    };
  }, [ticketPosition]);

  const handleDragPointerMove = useCallback((event: PointerEvent) => {
    const dragState = dragStateRef.current;

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    event.preventDefault();
    setTicketPosition(
      clampBacktestOrderTicketPosition(
        {
          x: dragState.startX + event.clientX - dragState.startClientX,
          y: dragState.startY + event.clientY - dragState.startClientY,
        },
        dragState.maxX,
        dragState.maxY,
      ),
    );
  }, []);

  const handleDragPointerEnd = useCallback((event: PointerEvent) => {
    const dragState = dragStateRef.current;

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);
    window.removeEventListener("pointermove", handleDragPointerMove);
    window.removeEventListener("pointerup", handleDragPointerEnd);
    window.removeEventListener("pointercancel", handleDragPointerEnd);
  }, [handleDragPointerMove]);

  const handleDragPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType !== "touch" && event.pointerType !== "pen") {
      return;
    }

    const bounds = getTicketDragBounds();
    if (!bounds) {
      return;
    }

    event.preventDefault();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: bounds.currentX,
      startY: bounds.currentY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
    };
    setTicketPosition(
      clampBacktestOrderTicketPosition(
        { x: bounds.currentX, y: bounds.currentY },
        bounds.maxX,
        bounds.maxY,
      ),
    );
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", handleDragPointerMove);
    window.addEventListener("pointerup", handleDragPointerEnd);
    window.addEventListener("pointercancel", handleDragPointerEnd);
  }, [getTicketDragBounds, handleDragPointerEnd, handleDragPointerMove]);

  const handleDragHandleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 48 : 16;
    const deltas: Record<string, BacktestOrderTicketPosition> = {
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
    };
    const delta = deltas[event.key];

    if (!delta) {
      return;
    }

    const bounds = getTicketDragBounds();
    if (!bounds) {
      return;
    }

    event.preventDefault();
    setTicketPosition(
      clampBacktestOrderTicketPosition(
        {
          x: bounds.currentX + delta.x,
          y: bounds.currentY + delta.y,
        },
        bounds.maxX,
        bounds.maxY,
      ),
    );
  }, [getTicketDragBounds]);

  useEffect(() => {
    return () => {
      dragStateRef.current = null;
      window.removeEventListener("pointermove", handleDragPointerMove);
      window.removeEventListener("pointerup", handleDragPointerEnd);
      window.removeEventListener("pointercancel", handleDragPointerEnd);
    };
  }, [handleDragPointerEnd, handleDragPointerMove]);

  useEffect(() => {
    if (!openRequest || openRequest.id === lastOpenRequestIdRef.current) {
      return;
    }

    lastOpenRequestIdRef.current = openRequest.id;
    openTicket(openRequest.price);
  }, [openRequest, openTicket]);

  const openedAtPriceLabel = formatTicketPrice(openedAtPrice);

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        className="absolute right-3 top-3 z-40 h-9 rounded-md bg-background/90 px-3 text-xs font-semibold shadow-sm backdrop-blur"
        onClick={() => openTicket(currentPrice)}
        title="Place order"
        aria-label="Place order"
      >
        <BarChart3 className="mr-1.5 h-4 w-4" />
        Place Order
      </Button>
    );
  }

  return (
    <section
      ref={ticketRef}
      aria-label="Backtest order ticket"
      className={cn(
        "absolute right-3 top-3 z-50 flex h-[min(680px,calc(100%-1.5rem))] max-h-[calc(100%-1.5rem)] w-[min(390px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-lg border border-border/70 bg-card/95 text-sm shadow-xl backdrop-blur-md",
        isDragging && "select-none shadow-2xl",
      )}
      style={
        ticketPosition
          ? {
              left: `${ticketPosition.x}px`,
              top: `${ticketPosition.y}px`,
              right: "auto",
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-card/95 px-2.5 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-grab items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs font-semibold text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
          onPointerDown={handleDragPointerDown}
          onKeyDown={handleDragHandleKeyDown}
          aria-label="Move order ticket"
          title="Move order ticket"
        >
          <GripVertical className="h-4 w-4 shrink-0" />
          <span className="truncate">Order Ticket</span>
          {openedAtPriceLabel ? (
            <span className="shrink-0 tabular-nums text-primary">@ {openedAtPriceLabel}</span>
          ) : null}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-md"
          onClick={() => setIsOpen(false)}
          aria-label="Close order ticket"
          title="Close order ticket"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <OrderPanel
          key={ticketVersion}
          sessionId={sessionId}
          currentPrice={currentPrice}
          previousPrice={previousPrice}
        />
      </div>
    </section>
  );
}

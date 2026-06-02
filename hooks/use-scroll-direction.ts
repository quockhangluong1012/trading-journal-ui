"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseScrollDirectionOptions {
  /** Minimum accumulated deltaY before toggling visibility (default 40) */
  threshold?: number;
  /** Delay in ms before auto-showing the header after scrolling stops (default 3000) */
  autoShowDelay?: number;
}

/**
 * Detects scroll intent via wheel events and returns whether the target
 * should be visible. Useful for auto-hiding headers/toolbars on pages where
 * the main container uses overflow-hidden and native scroll events don't fire.
 *
 * - Scroll down (deltaY > 0) → isVisible = false
 * - Scroll up (deltaY < 0)   → isVisible = true
 * - No wheel activity for `autoShowDelay` ms → isVisible = true
 */
export function useScrollDirection({
  threshold = 40,
  autoShowDelay = 3000,
}: UseScrollDirectionOptions = {}): boolean {
  const [isVisible, setIsVisible] = useState(true);
  const accumulatedDelta = useRef(0);
  const autoShowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAutoShow = useCallback(() => {
    if (autoShowTimer.current) {
      clearTimeout(autoShowTimer.current);
    }

    autoShowTimer.current = setTimeout(() => {
      setIsVisible(true);
      accumulatedDelta.current = 0;
    }, autoShowDelay);
  }, [autoShowDelay]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      // Ignore horizontal scroll (shift+wheel)
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;
      }

      accumulatedDelta.current += event.deltaY;

      if (accumulatedDelta.current > threshold) {
        setIsVisible(false);
        accumulatedDelta.current = 0;
        resetAutoShow();
      } else if (accumulatedDelta.current < -threshold) {
        setIsVisible(true);
        accumulatedDelta.current = 0;
        resetAutoShow();
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (autoShowTimer.current) {
        clearTimeout(autoShowTimer.current);
      }
    };
  }, [threshold, resetAutoShow]);

  return isVisible;
}

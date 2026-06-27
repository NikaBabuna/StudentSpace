/* =============================================================================
 * features/dashboard/hooks/use-chart-focus.ts — pin/hover focus for composed charts
 * ----------------------------------------------------------------------------- */
"use client";

import { useCallback, useEffect, useState } from "react";

export function useChartFocus<T>(pinAttribute: string) {
  const [pinned, setPinned] = useState<T | null>(null);
  const [hovered, setHovered] = useState<T | null>(null);
  const highlight = pinned ?? hovered;

  const clearFocus = useCallback(() => {
    setPinned(null);
    setHovered(null);
  }, []);

  const pinFocus = useCallback((value: T | null) => {
    if (value == null) return;
    setPinned(value);
    setHovered(null);
  }, []);

  const hoverFocus = useCallback(
    (value: T | null) => {
      if (!pinned) setHovered(value);
    },
    [pinned]
  );

  useEffect(() => {
    if (!pinned && !hovered) return;
    const clearUnlessPinTarget = (e: PointerEvent) => {
      const target = e.target as Element;
      if (target.closest(`[${pinAttribute}]`)) return;
      clearFocus();
    };
    document.addEventListener("pointerdown", clearUnlessPinTarget);
    return () => document.removeEventListener("pointerdown", clearUnlessPinTarget);
  }, [pinned, hovered, pinAttribute, clearFocus]);

  return {
    pinned,
    hovered,
    highlight,
    clearFocus,
    pinFocus,
    hoverFocus,
    setHovered,
  };
}

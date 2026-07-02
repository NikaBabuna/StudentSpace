/* =============================================================================
 * ui/use-escape-close.ts — Escape-key dismissal for dialogs
 * -----------------------------------------------------------------------------
 * Every hand-rolled portal dialog should close on Escape, the same way it
 * closes on overlay click. One hook keeps the behaviour identical everywhere:
 *
 *   useEscapeClose(onClose)          — dialog is mounted only while open
 *   useEscapeClose(onClose, open)    — dialog component stays mounted
 * ========================================================================== */
"use client";

import { useEffect } from "react";

export function useEscapeClose(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

/* =============================================================================
 * lib/utils.ts — Tailwind class name helper
 * -----------------------------------------------------------------------------
 * Role: Merges conditional class names and resolves Tailwind conflicts.
 * Dependencies: clsx, tailwind-merge
 * Used by: All UI components and feature clients
 * Exports: cn(...inputs) → single className string
 * ========================================================================== */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

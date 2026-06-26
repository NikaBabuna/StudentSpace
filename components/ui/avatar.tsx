/* =============================================================================
 * ui/avatar.tsx — initials avatar
 * -----------------------------------------------------------------------------
 * Renders a person's initials in a colored bubble. The color is chosen
 * deterministically from the name, so the same person always gets the same
 * tone, and all tones are theme-aware tints.
 * ========================================================================== */
import * as React from "react";

import { cn } from "@/lib/utils";

/** Theme-aware tint/text pairs — every option reads well in light and dark. */
const AVATAR_TONES = [
  "bg-accent-tint text-accent",
  "bg-ok-tint text-ok",
  "bg-warn-tint text-warn",
  "bg-danger-tint text-danger",
  "bg-surface-3 text-ink-2",
] as const;

const SIZES = {
  sm: "size-8 text-[12px]",
  md: "size-9 text-[13px]",
  lg: "size-[42px] text-[15px]",
} as const;

/** Deterministic bucket from a string (stable across renders/sessions). */
function toneFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

/** First letters of up to two words, uppercased. */
function initialsFrom(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

type AvatarProps = {
  /** Full name — drives both the initials and the color. */
  name?: string;
  /** Override the displayed initials (falls back to deriving from `name`). */
  initials?: string;
  size?: keyof typeof SIZES;
  /** Override the auto color with an explicit tint/text class pair. */
  tone?: string;
  className?: string;
};

function Avatar({ name = "", initials, size = "md", tone, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        SIZES[size],
        tone ?? toneFor(name || initials || "?"),
        className
      )}
    >
      {initials ?? initialsFrom(name)}
    </span>
  );
}

export { Avatar };

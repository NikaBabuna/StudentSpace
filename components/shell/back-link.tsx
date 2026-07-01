/* =============================================================================
 * shell/back-link.tsx — consistent "back" navigation link
 * -----------------------------------------------------------------------------
 * Replaces legacy muted text + unicode-arrow links. Matches sidebar nav styling:
 * chevron, medium weight, hover surface tint.
 * ========================================================================== */
import Link from "next/link";

import { ChevronLeftIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type BackLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
        className
      )}
    >
      <ChevronLeftIcon size={15} className="shrink-0 opacity-75" />
      {children}
    </Link>
  );
}

/* =============================================================================
 * components/icons.tsx — shared SVG icon set
 * -----------------------------------------------------------------------------
 * One home for every inline icon, so SVG paths stop being copy-pasted across
 * pages (the old codebase repeated the same <svg> markup in many files).
 *
 * Conventions (matching the redesign mockup):
 *   • 1em-scaled via the `size` prop (default 18) so icons inherit text size.
 *   • `stroke="currentColor"`, fill none, 1.6 stroke — they take the text color
 *     of their context, so `text-accent`, `text-muted`, etc. just work.
 *   • `Logo` is the one exception: a filled brand mark using the accent tokens.
 *
 * Usage:  <ChartIcon className="text-muted" />   <Logo size={28} />
 * ========================================================================== */
import * as React from "react";

export type IconProps = React.SVGProps<SVGSVGElement> & {
  /** Width/height in px. Defaults to 18. */
  size?: number;
};

/** Shared wrapper that applies the common stroke styling + sizing. */
function Icon({ size = 18, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/* -----------------------------------------------------------------------------
 * Brand mark — the two-circle "student" glyph from the mockup. Filled, uses the
 * accent tokens so it reads on both themes. Sized independently of stroke icons.
 * -------------------------------------------------------------------------- */
export function Logo({ size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <circle cx="9" cy="11" r="5.8" stroke="currentColor" strokeWidth="1.8" />
      <circle
        cx="13.8"
        cy="6.1"
        r="2.9"
        style={{ fill: "currentColor", stroke: "var(--accent)", strokeWidth: 1.5 }}
      />
    </svg>
  );
}

/* ---- Navigation ---------------------------------------------------------- */

export const DashboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.2" />
    <rect x="10" y="2.5" width="5.5" height="5.5" rx="1.2" />
    <rect x="2.5" y="10" width="5.5" height="5.5" rx="1.2" />
    <rect x="10" y="10" width="5.5" height="5.5" rx="1.2" />
  </Icon>
);

export const ClassesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3.5h7.5a2 2 0 0 1 2 2V15a2 2 0 0 0-2-2H3z" />
    <path d="M15 3.5H9.5a2 2 0 0 0-2 2" />
  </Icon>
);

export const ScheduleIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="3.5" width="13" height="12" rx="2" />
    <path d="M2.5 7h13M6 2.5v2.5M12 2.5v2.5" />
  </Icon>
);

export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 4.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7l-3.5 3V4.5z" />
  </Icon>
);

export const HomeworkIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="2.5" width="11" height="13" rx="2" />
    <path d="M6.5 6.5h5M6.5 9.5h5M6.5 12.5h3" />
  </Icon>
);

export const MaterialsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 5.5a1.5 1.5 0 0 1 1.5-1.5h2.2l1.3 1.6H14a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 14 14.6H4A1.5 1.5 0 0 1 2.5 13z" />
  </Icon>
);

export const AnalyticsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 15V3M3 15h12" />
    <path d="M6 12V9M9.5 12V6M13 12V8" />
  </Icon>
);

export const InboxIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 9.5 4.2 4a1.5 1.5 0 0 1 1.4-1h6.8a1.5 1.5 0 0 1 1.4 1l1.7 5.5V13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 2.5 13z" />
    <path d="M2.5 9.5H6l1 2h4l1-2h3.5" />
  </Icon>
);

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="2.3" />
    <path d="M9 1.8v2M9 14.2v2M3.1 3.1l1.4 1.4M13.5 13.5l1.4 1.4M1.8 9h2M14.2 9h2M3.1 14.9l1.4-1.4M13.5 4.5l1.4-1.4" />
  </Icon>
);

/* ---- Utility ------------------------------------------------------------- */

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="3.4" />
    <path d="M9 1.5v1.8M9 14.7v1.8M1.5 9h1.8M14.7 9h1.8M3.4 3.4l1.3 1.3M13.3 13.3l1.3 1.3M14.6 3.4l-1.3 1.3M4.7 13.3l-1.3 1.3" />
  </Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 10.2A6.2 6.2 0 0 1 7.8 3a6.2 6.2 0 1 0 7.2 7.2z" />
  </Icon>
);

export const LogoutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 15.5H4A1.5 1.5 0 0 1 2.5 14V4A1.5 1.5 0 0 1 4 2.5h3M12 12l3-3-3-3M15 9H7" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 3.5v11M3.5 9h11" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4.5 11.5 9 7 13.5" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 4.5 6.5 9 11 13.5" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 7 9 11.5 13.5 7" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 9.5 7 13l7.5-8" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" />
  </Icon>
);

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.75 4.75h12.5M2.75 9h12.5M2.75 13.25h12.5" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="6.5" />
    <path d="M9 8.25v3.5" />
    <path d="M9 5.75h.01" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="4.8" />
    <path d="M11.5 11.5 15 15" />
  </Icon>
);

export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 7a4.5 4.5 0 0 1 9 0c0 3.5 1.2 4.6 1.5 5h-12c.3-.4 1.5-1.5 1.5-5z" />
    <path d="M7.3 14.5a1.8 1.8 0 0 0 3.4 0" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7" cy="6.5" r="2.4" />
    <path d="M2.8 14.5a4.2 4.2 0 0 1 8.4 0" />
    <path d="M11.5 4.4a2.4 2.4 0 0 1 0 4.2M12.8 14.5a4.2 4.2 0 0 0-1.2-3" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 9h11M10.5 5l4 4-4 4" />
  </Icon>
);

export const RepeatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12.5 1.5l3 3-3 3" />
    <path d="M2.5 8.5v-.5a3 3 0 0 1 3-3h10" />
    <path d="M5.5 16.5l-3-3 3-3" />
    <path d="M15.5 9.5v.5a3 3 0 0 1-3 3h-10" />
  </Icon>
);

export const PauseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 4v10M11.5 4v10" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 3.5l9 5.5-9 5.5z" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 5h12M7 5V3.5h4V5M5 5l.7 9.5h6.6L13 5" />
  </Icon>
);

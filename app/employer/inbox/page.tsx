/* =============================================================================
 * app/employer/inbox/page.tsx — employer inbox (placeholder)
 * -----------------------------------------------------------------------------
 * Role: The organisation inbox is still being built; this tab shows a
 *       "coming in the next update" placeholder. Gated by the employer layout.
 * Dependencies: EmployerComingSoon, components/icons
 * Used by: Route /employer/inbox
 * Inputs/outputs: Static placeholder UI only
 * ========================================================================== */
import { InboxIcon } from "@/components/icons";
import { EmployerComingSoon } from "@/features/employer/components/EmployerComingSoon";

export default function EmployerInboxPage() {
  return (
    <EmployerComingSoon
      title="Inbox"
      icon={<InboxIcon size={22} />}
      description="Invites and organisation notifications will live here in a future update."
    />
  );
}

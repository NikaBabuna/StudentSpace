/* app/classes/loading.tsx — full-shell skeleton shown while a class route's
 * layout is still fetching (e.g. navigating in from the dashboard). Without this
 * boundary the previous page would stay frozen until the class layout resolves;
 * with it the user gets an instant shell on click. Tab-to-tab navigation inside
 * a class is handled by the lighter classes/[id]/loading.tsx instead. */
import { ShellSkeleton } from "@/components/shell/loading-skeleton";

export default function ClassesLoading() {
  return <ShellSkeleton />;
}

/* =============================================================================
 * app/(shell)/dashboard/analytics/page.tsx — analytics route
 * ----------------------------------------------------------------------------- */
import AnalyticsClient from "@/features/dashboard/components/AnalyticsClient";
import { loadAnalyticsData } from "@/features/dashboard/lib/load-analytics-data";

export default async function AnalyticsPage() {
  const data = await loadAnalyticsData();
  return <AnalyticsClient {...data} />;
}

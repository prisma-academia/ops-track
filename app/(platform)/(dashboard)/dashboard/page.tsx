import { requirePlatformPage } from "@/lib/auth/page-guards";
import { getPlatformOverviewData } from "@/lib/platform/overview";
import { PlatformOverviewDashboard } from "./overview-dashboard";

export default async function PlatformOverviewPage() {
  await requirePlatformPage();
  const data = await getPlatformOverviewData();
  return <PlatformOverviewDashboard data={data} />;
}

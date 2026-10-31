import { WorkspaceBlocked } from "@/components/tenant/workspace-notice";
import { loadTenantPageContext } from "@/lib/db/page-context";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { getTranslations } from "next-intl/server";

export default async function MaintenancePage() {
  const t = await getTranslations("maintenance");
  const page = await loadTenantPageContext();
  const settings = page.tenant ? parseTenantSettings(page.tenant.settingsJson) : null;
  const title = settings?.maintenanceMode ? "Under maintenance" : t("title");
  const body = settings?.maintenanceMode ? settings.maintenanceMessage : t("body");

  return <WorkspaceBlocked title={title} body={body} />;
}

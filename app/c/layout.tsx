import { WorkspaceBlocked } from "@/components/tenant/workspace-notice";
import { requireExistingTenant } from "@/lib/auth/tenant-page";
import { parseTenantSettings } from "@/lib/tenant/settings";

/**
 * Client-area layout. Centralizes host→tenant resolution and enforces the
 * tenant lifecycle: a nonexistent tenant 404s, a suspended/archived tenant
 * or a workspace in maintenance mode shows the maintenance screen. Turning
 * off the client portal closes this area without locking the admin workspace.
 */
export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const page = await requireExistingTenant();
  if (page.mode === "tenant" && page.tenant) {
    const settings = parseTenantSettings(page.tenant.settingsJson);
    if (!settings.allowClientPortal) {
      return (
        <WorkspaceBlocked
          title="Client portal is off"
          body="This workspace has closed the client area. Contact the station or fleet team if you still need access."
        />
      );
    }
  }
  return <>{children}</>;
}

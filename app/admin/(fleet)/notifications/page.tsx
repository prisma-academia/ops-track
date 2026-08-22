import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getChannelSettings } from "@/lib/notifications/dispatch";
import { NotificationsManager } from "@/components/notifications/notifications-manager";

export const metadata = { title: "Notifications" };

export default async function FleetNotificationsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_NOTIFICATIONS_READ.key, "FLEET");

  const orgWhere = {
    tenantId: actor.tenantId,
    ...(actor.organizationId ? { id: actor.organizationId } : {}),
  };

  const [settings, messages, users, organizations] = await Promise.all([
    getChannelSettings(actor.tenantId, "FLEET"),
    prisma.notificationMessage.findMany({
      where: { tenantId: actor.tenantId, module: "FLEET" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { deliveries: true } },
      },
    }),
    prisma.tenantUser.findMany({
      where: { tenantId: actor.tenantId, status: "ACTIVE", activeModules: { has: "FLEET" } },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.organization.findMany({
      where: orgWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <NotificationsManager
      module="FLEET"
      settings={settings}
      messages={JSON.parse(JSON.stringify(messages))}
      users={users}
      organizations={organizations}
    />
  );
}

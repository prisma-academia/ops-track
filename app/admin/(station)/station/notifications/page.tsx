import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getChannelSettings } from "@/lib/notifications/dispatch";
import { NotificationsManager } from "@/components/notifications/notifications-manager";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

export const metadata = { title: "Notifications" };

export default async function StationNotificationsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_NOTIFICATIONS_READ.key, "STATION");
  const activeOrgId = await resolveActiveOrgId(actor);

  const stationWhere = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const [settings, messages, users, stations] = await Promise.all([
    getChannelSettings(actor.tenantId, "STATION"),
    prisma.notificationMessage.findMany({
      where: { tenantId: actor.tenantId, module: "STATION" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { deliveries: true } },
      },
    }),
    prisma.tenantUser.findMany({
      where: { tenantId: actor.tenantId, status: "ACTIVE", activeModules: { has: "STATION" } },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.station.findMany({
      where: stationWhere,
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <NotificationsManager
      module="STATION"
      settings={settings}
      messages={JSON.parse(JSON.stringify(messages))}
      users={users}
      stations={stations}
    />
  );
}

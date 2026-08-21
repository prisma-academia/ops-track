import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { InventoryAlertsManager } from "./inventory-alerts-manager";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

export const metadata = { title: "Inventory Alerts" };

export default async function InventoryAlertsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_WAYBILLS_READ.key);

  const activeOrgId = await resolveActiveOrgId(actor);

  const alertWhere: any = { tenantId: actor.tenantId, category: "INVENTORY_VARIANCE" };
  if (activeOrgId) {
    alertWhere.station = { organizationId: activeOrgId };
  }

  const stationWhere: any = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const alerts = await prisma.ticket.findMany({
    where: alertWhere,
    orderBy: { createdAt: "desc" },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      raisedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      varianceLog: true,
    },
  });

  const stations = await prisma.station.findMany({
    where: stationWhere,
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  const serializedAlerts = JSON.parse(JSON.stringify(alerts));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <InventoryAlertsManager
      initialAlerts={serializedAlerts}
      stations={serializedStations}
    />
  );
}

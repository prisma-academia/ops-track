import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { InventoryAlertsManager } from "./inventory-alerts-manager";

export default async function InventoryAlertsPage() {
  const actor = await requireTenantPage();

  const [alerts, stations] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        tenantId: actor.tenantId,
        category: "INVENTORY_VARIANCE",
      },
      include: {
        varianceLog: {
          include: { tank: true, waybill: true },
        },
        raisedBy: { select: { firstName: true, lastName: true, email: true } },
        station: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.station.findMany({
      where: { tenantId: actor.tenantId },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <InventoryAlertsManager initialAlerts={alerts} stations={stations} />;
}

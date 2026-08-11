import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FleetPnlReportManager } from "./fleet-pnl-report-manager";

export default async function FleetPnlReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key);

  const transactions = await prisma.transaction.findMany({
    where: { 
      tenantId: actor.tenantId,
      category: {
        in: ["TRANSPORT_PAYMENT", "FLEET_EXPENSE"]
      }
    },
    orderBy: { createdAt: "desc" },
    include: {
      truck: {
        select: {
          id: true,
          plateNumber: true,
          name: true,
        },
      }
    }
  });

  const trucks = await prisma.truck.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true, plateNumber: true },
    orderBy: { plateNumber: "asc" },
  });

  const serializedTransactions = JSON.parse(JSON.stringify(transactions));
  const serializedTrucks = JSON.parse(JSON.stringify(trucks));

  return (
    <FleetPnlReportManager
      initialTransactions={serializedTransactions}
      trucks={serializedTrucks}
    />
  );
}

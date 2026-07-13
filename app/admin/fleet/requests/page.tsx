import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FleetRequestsManager } from "./fleet-requests-manager";
import { getStationStockData } from "@/lib/queries/station-stock";

export default async function FleetRequestsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const requests = await prisma.stationSupplyRequest.findMany({
    where: { 
      tenantId: actor.tenantId,
      status: { in: ["PENDING", "APPROVED"] } 
    },
    orderBy: { createdAt: "desc" },
    include: {
      station: { select: { id: true, name: true, code: true } },
      requestedBy: { select: { firstName: true, lastName: true } },
      batch: { select: { reference: true } }
    },
  });

  const serializedRequests = JSON.parse(JSON.stringify(requests));
  const stockData = await getStationStockData(actor.tenantId);

  return (
    <div className="flex-1 space-y-6">
      <FleetRequestsManager initialRequests={serializedRequests} stockData={stockData} />
    </div>
  );
}

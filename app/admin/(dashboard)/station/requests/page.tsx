import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { StationRequestsManager } from "./requests-manager";
import { getStationStockData } from "@/lib/queries/station-stock";

export default async function StationRequestsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key);

  const requests = await prisma.stationSupplyRequest.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      requestedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      waybillAllocation: {
        include: {
          waybill: true
        }
      },
      batch: {
        select: {
          reference: true,
        }
      }
    },
  });

  const serializedRequests = JSON.parse(JSON.stringify(requests));
  
  let stationsWithStock = await getStationStockData(actor.tenantId);

  // Filter for permissions if not owner
  if (!actor.isOwner) {
    const myStations = await prisma.station.findMany({
      where: { tenantId: actor.tenantId, staff: { some: { id: actor.userId } } },
      select: { id: true }
    });
    const myStationIds = new Set(myStations.map(s => s.id));
    stationsWithStock = stationsWithStock.filter(s => myStationIds.has(s.stationId));
  }

  return (
    <div className="flex-1 space-y-6">
      <StationRequestsManager initialRequests={serializedRequests} stockData={stationsWithStock} />
    </div>
  );
}

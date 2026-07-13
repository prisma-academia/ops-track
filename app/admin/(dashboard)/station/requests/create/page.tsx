import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateStationRequestForm } from "./create-form";
import { getStationStockData } from "@/lib/queries/station-stock";
import { prisma } from "@/lib/db/client";

export default async function CreateStationRequestPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_WRITE.key);

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

  // Map to the shape expected by the create-form (id vs stationId)
  const formattedStations = stationsWithStock.map(s => ({
    ...s,
    id: s.stationId,
    name: s.stationName,
    code: s.stationCode
  }));

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground uppercase tracking-widest">Request Fuel</h2>
        <p className="text-sm text-muted-foreground">Submit fuel requisitions for your stations.</p>
      </div>

      <CreateStationRequestForm stations={formattedStations} />
    </div>
  );
}

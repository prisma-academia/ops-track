import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { WaybillsManager } from "./waybills-manager";

export default async function WaybillsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_WAYBILLS_READ.key);

  const waybills = await prisma.waybill.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { dispatchedAt: "desc" },
    include: {
      allocations: {
        include: {
          station: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
      recordedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  const rows = waybills.map((w) => {
    const totalReceived = w.allocations.reduce((acc, a) => acc + (a.litersReceived ? Number(a.litersReceived) : 0), 0);
    const anyDelivered = w.allocations.some(a => a.status === "DELIVERED");
    const allDelivered = w.allocations.length > 0 && w.allocations.every(a => a.status === "DELIVERED");
    
    let combinedStatus = "DISPATCHED";
    if (allDelivered) combinedStatus = "COMPLETED";
    else if (anyDelivered) combinedStatus = "DELIVERED"; // In this system DELIVERED might mean partially delivered, or we can use "DELIVERED" for any and COMPLETED for all. Wait, type only allows "DISPATCHED" | "DELIVERED" | "COMPLETED"

    return {
      id: w.id,
      number: w.number,
      status: combinedStatus as any,
      productType: w.productType,
      litersLoaded: Number(w.litersLoaded),
      litersReceived: anyDelivered ? totalReceived : null,
      truckPlate: w.truckPlate,
      driverName: w.driverName,
      driverPhone: w.driverPhone,
      dispatchedAt: w.dispatchedAt.toISOString(),
      deliveredAt: null,
      stations: w.allocations.map(a => a.station),
    };
  });

  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <WaybillsManager
      initialWaybills={rows}
      stations={serializedStations}
    />
  );
}

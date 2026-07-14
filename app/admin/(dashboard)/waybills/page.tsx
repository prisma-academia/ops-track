import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { WaybillsManager } from "./waybills-manager";
import { buildOffsetPageMeta } from "@/lib/api/pagination";

export default async function WaybillsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_WAYBILLS_READ.key);
  const take = 25;

  const [totalCount, waybills] = await Promise.all([
    prisma.waybill.count({ where: { tenantId: actor.tenantId } }),
    prisma.waybill.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { dispatchedAt: "desc" },
      take,
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
    }),
  ]);

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
    const anyDelivered = w.allocations.some(a => ["DELIVERED", "COMPLETED"].includes(a.status));
    const allDelivered = w.allocations.length > 0 && w.allocations.every(a => ["DELIVERED", "COMPLETED"].includes(a.status));
    
    let combinedStatus = "DISPATCHED";
    if (allDelivered) combinedStatus = "COMPLETED";
    else if (anyDelivered) combinedStatus = "DELIVERED";

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

  const initialMeta = buildOffsetPageMeta(totalCount, 1, take);
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <WaybillsManager
      initialWaybills={rows}
      initialMeta={initialMeta}
      stations={serializedStations}
      canCreate={
        actor.permissions.has(PERMISSIONS.TENANT_FLEET_WRITE.key) ||
        actor.permissions.has(PERMISSIONS.TENANT_WAYBILLS_WRITE.key)
      }
    />
  );
}

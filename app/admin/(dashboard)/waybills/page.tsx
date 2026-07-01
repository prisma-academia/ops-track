import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { WaybillsManager } from "./waybills-manager";

export default async function WaybillsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_WAYBILLS_READ.key);

  const allocations = await prisma.waybillAllocation.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { waybill: { dispatchedAt: "desc" } },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      waybill: {
        include: {
          recordedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
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

  const rows = allocations.map((a) => ({
    id: a.waybillId, // Keep waybillId as row ID so clicking navigates to the whole Waybill Details
    allocationId: a.id,
    number: a.waybill.number,
    status: a.status as "DISPATCHED" | "DELIVERED",
    productType: a.waybill.productType,
    litersLoaded: Number(a.litersToDispense), // Map this allocation volume as litersLoaded for backward compatibility in table component
    litersReceived: a.litersReceived ? Number(a.litersReceived) : null,
    truckPlate: a.waybill.truckPlate,
    driverName: a.waybill.driverName,
    driverPhone: a.waybill.driverPhone,
    dispatchedAt: a.waybill.dispatchedAt.toISOString(),
    deliveredAt: a.deliveredAt ? a.deliveredAt.toISOString() : null,
    station: a.station,
  }));

  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <WaybillsManager
      initialWaybills={rows}
      stations={serializedStations}
    />
  );
}

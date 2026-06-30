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
      station: {
        select: {
          id: true,
          name: true,
          code: true,
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

  const rows = waybills.map((w) => ({
    id: w.id,
    number: w.number,
    status: w.status as "DISPATCHED" | "DELIVERED",
    productType: w.productType,
    litersLoaded: Number(w.litersLoaded),
    litersReceived: w.litersReceived ? Number(w.litersReceived) : null,
    truckPlate: w.truckPlate,
    driverName: w.driverName,
    driverPhone: w.driverPhone,
    dispatchedAt: w.dispatchedAt.toISOString(),
    deliveredAt: w.deliveredAt ? w.deliveredAt.toISOString() : null,
    station: w.station,
  }));

  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <WaybillsManager
      initialWaybills={rows}
      stations={serializedStations}
    />
  );
}

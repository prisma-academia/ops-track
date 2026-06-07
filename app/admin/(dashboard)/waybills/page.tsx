import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { WaybillsManager } from "./waybills-manager";

export default async function WaybillsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_OPERATIONS_READ.key);

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

  const serializedWaybills = JSON.parse(JSON.stringify(waybills));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <WaybillsManager
      initialWaybills={serializedWaybills}
      stations={serializedStations}
    />
  );
}

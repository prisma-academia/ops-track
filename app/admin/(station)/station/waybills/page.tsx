import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { WaybillsManager } from "./waybills-manager";
import { buildOffsetPageMeta } from "@/lib/api/pagination";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { resolveWaybillTransportInfo } from "@/lib/waybill-transport";

export default async function WaybillsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_WAYBILLS_READ.key);
  const take = 25;

  const activeOrgId = await resolveActiveOrgId(actor);

  const waybillWhere: any = { tenantId: actor.tenantId };
  if (activeOrgId) {
    waybillWhere.allocations = {
      some: {
        station: { organizationId: activeOrgId }
      }
    };
  }

  const stationWhere: any = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const [totalCount, waybills] = await Promise.all([
    prisma.waybill.count({ where: waybillWhere }),
    prisma.waybill.findMany({
      where: waybillWhere,
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
            delivery: {
              include: {
                transport: {
                  include: {
                    transporter: true,
                    truck: true,
                    driver: true,
                  },
                },
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
    where: stationWhere,
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

    const transport = w.allocations.find((a) => a.delivery?.transport)?.delivery?.transport || w.allocations[0]?.delivery?.transport;
    const tInfo = resolveWaybillTransportInfo(transport, w);

    return {
      id: w.id,
      number: w.number,
      status: combinedStatus as any,
      productType: w.productType,
      litersLoaded: Number(w.litersLoaded),
      litersReceived: anyDelivered ? totalReceived : null,
      truckPlate: tInfo.truckPlate,
      driverName: tInfo.driverName,
      driverPhone: w.driverPhone,
      dispatchedAt: w.dispatchedAt.toISOString(),
      deliveredAt: null,
      stations: w.allocations.map(a => a.station),
      isOneTime: tInfo.isOneTime,
      oneTimeTransporterName: tInfo.oneTimeTransporterName,
      oneTimeTruckPlate: tInfo.oneTimeTruckPlate,
      oneTimeDriverName: tInfo.oneTimeDriverName,
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

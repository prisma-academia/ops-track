import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_READ.key);
    const url = new URL(request.url);
    const { page, take, skip } = parseOffsetPagination(url.searchParams);

    const [totalCount, waybills] = await Promise.all([
      prisma.waybill.count({ where: { tenantId: actor.tenantId } }),
      prisma.waybill.findMany({
        where: { tenantId: actor.tenantId },
        orderBy: { dispatchedAt: "desc" },
        take,
        skip,
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
        status: combinedStatus,
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

    return ok(rows, buildOffsetPageMeta(totalCount, page, take));
  } catch (e) {
    return handleError(e);
  }
}

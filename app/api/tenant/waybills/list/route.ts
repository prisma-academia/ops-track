import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_READ.key, "STATION");
    const url = new URL(request.url);
    const { page, take, skip } = parseOffsetPagination(url.searchParams);
    
    const stationId = url.searchParams.get("stationId") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const product = url.searchParams.get("product") || undefined;
    const loadedMin = url.searchParams.get("loadedMin") ? Number(url.searchParams.get("loadedMin")) : undefined;
    const loadedMax = url.searchParams.get("loadedMax") ? Number(url.searchParams.get("loadedMax")) : undefined;
    const dateStart = url.searchParams.get("dateStart") ? new Date(url.searchParams.get("dateStart") as string) : undefined;
    const dateEnd = url.searchParams.get("dateEnd") ? new Date(url.searchParams.get("dateEnd") as string) : undefined;

    const whereClause: any = {
      tenantId: actor.tenantId,
      ...(product ? { productType: product as any } : {}),
      ...(loadedMin !== undefined || loadedMax !== undefined ? { litersLoaded: { gte: loadedMin, lte: loadedMax } } : {}),
      ...(dateStart || dateEnd ? { dispatchedAt: { gte: dateStart, lte: dateEnd } } : {}),
    };

    if (stationId || status) {
      whereClause.allocations = {
        some: {
          ...(stationId ? { stationId } : {}),
          ...(status ? { status: status as any } : {}),
        }
      };
    }

    const [totalCount, waybills] = await Promise.all([
      prisma.waybill.count({ where: whereClause }),
      prisma.waybill.findMany({
        where: whereClause,
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

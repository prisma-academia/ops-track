import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key, "STATION");
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");

    const station = await prisma.station.findUnique({
      where: { id: stationId },
    });

    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const where = { stationId, tenantId: actor.tenantId };
    const include = {
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
      waybill: {
        include: {
          recordedBy: { select: { firstName: true, lastName: true } },
        },
      },
    };

    const mapAllocation = (a: any) => {
      const transport = a.delivery?.transport;
      const isOneTime = Boolean(transport?.isOneTime);
      const truckPlate = isOneTime
        ? (transport?.oneTimeTruckPlate || a.waybill?.truckPlate)
        : (a.waybill?.truckPlate && a.waybill.truckPlate !== "N/A"
            ? a.waybill.truckPlate
            : (transport?.truck?.plateNumber || transport?.truck?.name || a.waybill?.truckPlate));
      const driverName = isOneTime
        ? (transport?.oneTimeDriverName || a.waybill?.driverName)
        : (a.waybill?.driverName && a.waybill.driverName !== "Unknown Driver"
            ? a.waybill.driverName
            : (transport?.driver ? `${transport.driver.firstName} ${transport.driver.lastName}`.trim() : a.waybill?.driverName));
      const transportCompany = isOneTime
        ? (transport?.oneTimeTransporterName || a.waybill?.transportCompany)
        : (transport?.transporter?.name || a.waybill?.transportCompany);

      return {
        ...a,
        waybill: a.waybill ? {
          ...a.waybill,
          truckPlate,
          driverName,
          transportCompany,
          isOneTime,
          oneTimeTransporterName: transport?.oneTimeTransporterName ?? null,
          oneTimeTruckPlate: transport?.oneTimeTruckPlate ?? null,
          oneTimeDriverName: transport?.oneTimeDriverName ?? null,
        } : a.waybill,
      };
    };

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rows] = await Promise.all([
        prisma.waybillAllocation.count({ where }),
        prisma.waybillAllocation.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          skip,
          include,
        }),
      ]);
      return ok(rows.map(mapAllocation), buildOffsetPageMeta(totalCount, page, take));
    }

    const allocations = await prisma.waybillAllocation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include,
    });

    return ok(allocations.map(mapAllocation));
  } catch (e) {
    return handleError(e);
  }
}

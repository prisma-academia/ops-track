import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

const RecordShiftSchema = z.object({
  id: z.string().optional(),
  nozzleId: z.string().min(1),
  attendantId: z.string().min(1),
  openingMeter: z.coerce.number().nonnegative(),
  shiftDate: z.string().transform((v) => new Date(v)),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_READ.key);
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const include = {
      nozzle: {
        include: {
          pump: {
            include: {
              tank: true,
            },
          },
        },
      },
      attendant: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      reconciledBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    };

    let rows: any[] = [];
    let meta: any = {};

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rawRows] = await Promise.all([
        prisma.shiftLog.count({
          where: {
            tenantId: actor.tenantId,
            nozzle: {
              pump: {
                stationId,
              },
            },
          },
        }),
        prisma.shiftLog.findMany({
          where: {
            tenantId: actor.tenantId,
            nozzle: {
              pump: {
                stationId,
              },
            },
          },
          orderBy: { shiftDate: "desc" },
          take,
          skip,
          include,
        }),
      ]);
      rows = rawRows;
      meta = buildOffsetPageMeta(totalCount, page, take);
    } else {
      const { cursor, take } = parsePagination(url.searchParams);
      
      rows = await prisma.shiftLog.findMany({
        where: {
          tenantId: actor.tenantId,
          nozzle: {
            pump: {
              stationId,
            },
          },
        },
        orderBy: { shiftDate: "desc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        include,
      });
      meta = buildPageMeta(rows, take);
    }

    return ok(rows, meta);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_WRITE.key);
    const body = RecordShiftSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    // Verify nozzle belongs to this station
    const nozzle = await prisma.nozzle.findUnique({
      where: { id: body.nozzleId },
      include: { pump: true },
    });
    if (!nozzle || nozzle.tenantId !== actor.tenantId || nozzle.pump.stationId !== stationId) {
      throw new DomainError(400, "invalid_nozzle", "Nozzle does not belong to this station.");
    }

    // Verify attendant belongs to this tenant
    const attendant = await prisma.tenantUser.findUnique({
      where: { id: body.attendantId },
    });
    if (!attendant || attendant.tenantId !== actor.tenantId) {
      throw new DomainError(400, "invalid_attendant", "Attendant does not exist in this tenant.");
    }

    // Verify there is no ongoing active shift on this nozzle
    const ongoingShift = await prisma.shiftLog.findFirst({
      where: {
        nozzleId: body.nozzleId,
        closingMeter: null,
      },
    });
    if (ongoingShift) {
      throw new DomainError(400, "active_shift_exists", "An active shift is already running on this nozzle.");
    }

    const shiftLog = await prisma.shiftLog.create({
      data: {
        id: body.id,
        tenantId: actor.tenantId,
        nozzleId: body.nozzleId,
        attendantId: body.attendantId,
        openingMeter: body.openingMeter,
        closingMeter: null,
        litersSold: null,
        declaredCash: null,
        declaredPos: null,
        declaredTransfer: null,
        shiftDate: body.shiftDate,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "shift.open",
      tenantId: actor.tenantId,
      targetType: "ShiftLog",
      targetId: shiftLog.id,
      after: { attendantId: body.attendantId, nozzleId: body.nozzleId } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ shiftLog });
  } catch (e) {
    return handleError(e);
  }
}

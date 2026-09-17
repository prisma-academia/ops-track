import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CloseShiftSchema = z.object({
  closingMeter: z.coerce.number().nonnegative(),
  declaredCash: z.coerce.number().nonnegative(),
  declaredPos: z.coerce.number().nonnegative(),
  declaredTransfer: z.coerce.number().nonnegative(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; shiftId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, shiftId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_WRITE.key, "STATION");
    const body = CloseShiftSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    // Fetch shift log details
    const shiftLog = await prisma.shiftLog.findUnique({
      where: { id: shiftId },
      include: {
        nozzle: {
          include: {
            pump: {
              include: {
                tank: true,
              },
            },
          },
        },
      },
    });

    if (!shiftLog || shiftLog.tenantId !== actor.tenantId || shiftLog.nozzle.pump.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Shift log not found.");
    }

    if (shiftLog.closingMeter !== null) {
      throw new DomainError(400, "already_closed", "This shift log is already closed.");
    }

    if (body.closingMeter < Number(shiftLog.openingMeter)) {
      throw new DomainError(
        400,
        "invalid_meter_readings",
        `Closing meter reading (${body.closingMeter}) cannot be less than opening reading (${Number(shiftLog.openingMeter)}).`
      );
    }

    const litersSold = body.closingMeter - Number(shiftLog.openingMeter);

    const tankId = shiftLog.nozzle.pump.tank.id;
    const tankCurrentLiters = Number(shiftLog.nozzle.pump.tank.currentLiters);

    const updatedShiftLog = await prisma.$transaction(async (tx) => {
      const updated = await tx.shiftLog.update({
        where: { id: shiftId },
        data: {
          closingMeter: body.closingMeter,
          litersSold,
          declaredCash: body.declaredCash,
          declaredPos: body.declaredPos,
          declaredTransfer: body.declaredTransfer,
          closedAt: new Date(),
        },
        include: {
          attendant: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return updated;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "shift.close",
      tenantId: actor.tenantId,
      targetType: "ShiftLog",
      targetId: shiftId,
      after: {
        closingMeter: body.closingMeter,
        litersSold,
        declaredCash: body.declaredCash,
        declaredPos: body.declaredPos,
        declaredTransfer: body.declaredTransfer,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ shiftLog: updatedShiftLog });
  } catch (e) {
    return handleError(e);
  }
}

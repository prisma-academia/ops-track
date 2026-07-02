import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; shiftId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, shiftId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_WRITE.key);
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

    if (shiftLog.reconciledAt) {
      throw new DomainError(400, "already_reconciled", "This shift log has already been reconciled.");
    }

    // Determine product type and find the active PriceControl for this product at the station
    const productType = shiftLog.nozzle.pump.tank.productType;

    const priceControl = await prisma.priceControl.findFirst({
      where: {
        stationId,
        productType,
        effectiveFrom: {
          lte: shiftLog.shiftDate,
        },
      },
      orderBy: {
        effectiveFrom: "desc",
      },
    });

    if (!priceControl) {
      throw new DomainError(
        400,
        "price_control_missing",
        `No price control found for product ${productType} active on ${shiftLog.shiftDate.toISOString().split("T")[0]}. Please configure pricing first.`
      );
    }

    const pricePerLiter = Number(priceControl.pricePerLiter);
    const litersSold = Number(shiftLog.litersSold);

    // Calculations
    const expectedRevenue = litersSold * pricePerLiter;
    const declaredRevenue =
      Number(shiftLog.declaredCash) +
      Number(shiftLog.declaredPos) +
      Number(shiftLog.declaredTransfer);

    const varianceCash = declaredRevenue - expectedRevenue;

    // Get the tank connected to this nozzle's pump
    const tankId = shiftLog.nozzle.pump.tank.id;
    const tankCurrentLiters = Number(shiftLog.nozzle.pump.tank.currentLiters);

    // Guard: ensure tank won't go negative
    if (tankCurrentLiters - litersSold < 0) {
      throw new DomainError(
        400,
        "insufficient_tank_volume",
        `Cannot reconcile: deducting ${litersSold.toLocaleString()} L would bring tank below 0 (current: ${tankCurrentLiters.toLocaleString()} L). Record a dipping first.`
      );
    }

    const updatedShiftLog = await prisma.$transaction(async (tx) => {
      // Update the shift log with reconciliation data
      const updated = await tx.shiftLog.update({
        where: { id: shiftId },
        data: {
          reconciledById: actor.userId,
          varianceCash,
          reconciledAt: new Date(),
        },
        include: {
          reconciledBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Deduct litersSold from the tank's currentLiters
      await tx.tank.update({
        where: { id: tankId },
        data: { currentLiters: { decrement: litersSold } },
      });

      return updated;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "shift.reconcile",
      tenantId: actor.tenantId,
      targetType: "ShiftLog",
      targetId: shiftId,
      after: {
        litersSold,
        pricePerLiter,
        expectedRevenue,
        declaredRevenue,
        varianceCash,
        reconciledById: actor.userId,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({
      shiftLog: updatedShiftLog,
      reconciliation: {
        pricePerLiter,
        expectedRevenue,
        declaredRevenue,
        varianceCash,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

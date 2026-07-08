import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateDippingSchema = z.object({
  tankId: z.string().min(1),
  dippingLiters: z.coerce.number().nonnegative(),
  reason: z.string().min(1),
  pricePerLiter: z.coerce.number().positive().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key);
    const body = CreateDippingSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    // Verify tank ownership and connection to station
    const tank = await prisma.tank.findUnique({
      where: { id: body.tankId },
    });
    if (!tank || tank.stationId !== stationId || tank.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Tank not found.");
    }

    // Validate that no active/ongoing shifts are running on nozzles connected to this tank
    const activeShifts = await prisma.shiftLog.findMany({
      where: {
        closingMeter: null,
        nozzle: {
          pump: {
            tankId: body.tankId,
          },
        },
      },
      include: {
        nozzle: {
          include: {
            pump: true,
          },
        },
        attendant: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (activeShifts.length > 0) {
      const activeDetails = activeShifts
        .map(
          (s) =>
            `${s.nozzle.pump.name} - ${s.nozzle.name} (${s.attendant.firstName ?? ""} ${s.attendant.lastName ?? ""})`
        )
        .join(", ");
      throw new DomainError(
        400,
        "active_shifts_running",
        `Cannot record dipping: Active shifts must be closed first on nozzles connected to this tank: ${activeDetails}.`
      );
    }

    // Execute actions
    const result = await prisma.$transaction(async (tx) => {
      // Validate capacity inside transaction to prevent race conditions
      const latestTank = await tx.tank.findUnique({
        where: { id: body.tankId },
      });
      if (!latestTank) {
         throw new DomainError(404, "not_found", "Tank not found.");
      }
      
      const newLevel = body.dippingLiters;
      if (newLevel > Number(latestTank.capacity)) {
        throw new DomainError(400, "capacity_exceeded", `Dipping volume (${body.dippingLiters} L) would push tank "${latestTank.name}" to ${newLevel.toLocaleString()} L, exceeding capacity of ${Number(latestTank.capacity).toLocaleString()} L.`);
      }

      // If pricePerLiter is provided, create a new PriceControl entry
      if (body.pricePerLiter !== undefined) {
        await tx.priceControl.create({
          data: {
            tenantId: actor.tenantId,
            stationId,
            productType: tank.productType,
            pricePerLiter: body.pricePerLiter,
            effectiveFrom: new Date(),
          },
        });
      }

      // Create TankDipping record
      const dipping = await tx.tankDipping.create({
        data: {
          tenantId: actor.tenantId,
          tankId: body.tankId,
          dippingLiters: body.dippingLiters,
          reason: body.reason,
          recordedAt: new Date(),
        },
      });

      // Update tank currentLiters atomically to match the physical dip
      await tx.tank.update({
        where: { id: body.tankId },
        data: { currentLiters: body.dippingLiters },
      });

      return dipping;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tank_dipping.record",
      tenantId: actor.tenantId,
      targetType: "TankDipping",
      targetId: result.id,
      after: {
        tankId: body.tankId,
        dippingLiters: body.dippingLiters,
        reason: body.reason,
        priceUpdated: body.pricePerLiter !== undefined,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ dipping: result });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_READ.key);

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: { tanks: true },
    });

    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const tankIds = station.tanks.map((t) => t.id);

    // Fetch routine tank dippings
    const dippings = await prisma.tankDipping.findMany({
      where: {
        tankId: { in: tankIds },
        tenantId: actor.tenantId,
      },
      include: {
        tank: true,
      },
      orderBy: { recordedAt: "desc" },
    });

    // Fetch waybill dippings
    const waybillDippings = await prisma.waybillDipping.findMany({
      where: {
        tankId: { in: tankIds },
        tenantId: actor.tenantId,
      },
      include: {
        tank: true,
        waybill: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ dippings, waybillDippings });
  } catch (e) {
    return handleError(e);
  }
}

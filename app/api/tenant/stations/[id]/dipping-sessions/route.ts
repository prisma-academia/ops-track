import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const OpenSessionSchema = z.object({
  tankId: z.string().min(1),
  openingLiters: z.coerce.number().nonnegative(),
  pricePerLiter: z.coerce.number().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key);
    const body = OpenSessionSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify station
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    // Verify tank
    const tank = await prisma.tank.findUnique({ where: { id: body.tankId } });
    if (!tank || tank.stationId !== stationId || tank.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Tank not found.");
    }

    // Check if there is already an open session
    const activeSession = await prisma.dippingSession.findFirst({
      where: {
        tankId: body.tankId,
        status: "OPEN",
      },
    });

    if (activeSession) {
      throw new DomainError(400, "active_session_exists", "Cannot open a new session while one is already active.");
    }

    // Validate that no active/ongoing shifts are running
    const activeShifts = await prisma.shiftLog.findMany({
      where: {
        closingMeter: null,
        nozzle: { pump: { tankId: body.tankId } },
      },
    });

    if (activeShifts.length > 0) {
      throw new DomainError(400, "active_shifts_running", "Cannot record dipping: Active shifts must be closed first.");
    }

    const session = await prisma.$transaction(async (tx) => {
      // Create price control for this new price
      await tx.priceControl.create({
        data: {
          tenantId: actor.tenantId,
          stationId,
          productType: tank.productType,
          pricePerLiter: body.pricePerLiter,
        },
      });

      // Create session
      const newSession = await tx.dippingSession.create({
        data: {
          tenantId: actor.tenantId,
          stationId,
          tankId: body.tankId,
          openingLiters: body.openingLiters,
          pricePerLiter: body.pricePerLiter,
          status: "OPEN",
        },
      });

      // Update tank liters
      await tx.tank.update({
        where: { id: body.tankId },
        data: { currentLiters: body.openingLiters },
      });

      return newSession;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "dipping_session.open",
      tenantId: actor.tenantId,
      targetType: "DippingSession",
      targetId: session.id,
      after: { tankId: body.tankId, openingLiters: body.openingLiters, price: body.pricePerLiter } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ session });
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

    const sessions = await prisma.dippingSession.findMany({
      where: { stationId, tenantId: actor.tenantId },
      include: {
        closings: { orderBy: { recordedAt: "desc" } },
        tank: true,
      },
      orderBy: { openedAt: "desc" },
    });

    return ok({ sessions });
  } catch (e) {
    return handleError(e);
  }
}

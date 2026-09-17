import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { checkAndCreateVarianceTicket } from "@/lib/variance";

const OpenSessionSchema = z.object({
  clientId: z.string().optional(),
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key, "STATION");
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

    // Block dipping session if there are unapproved sales logs from the previous dipping session
    const lastSessionForBlock = await prisma.dippingSession.findFirst({
      where: { tankId: body.tankId, tenantId: actor.tenantId },
      orderBy: { openedAt: "desc" },
      include: { closings: true },
    });

    if (lastSessionForBlock && lastSessionForBlock.closings.length > 0) {
      const closingIds = lastSessionForBlock.closings.map(c => c.id);
      const pendingSales = await prisma.salesLog.findFirst({
        where: {
          dippingClosingId: { in: closingIds },
          status: { notIn: ["APPROVED"] },
        },
      });

      if (pendingSales) {
        throw new DomainError(
          400,
          "pending_sales_exists",
          "Cannot open a new dipping session: There are unapproved or rejected sales from the previous session. Please approve or resolve them first."
        );
      }
    }

    // Variance detection: fetch last session for this tank
    const lastSession = await prisma.dippingSession.findFirst({
      where: { tankId: body.tankId, tenantId: actor.tenantId },
      orderBy: { openedAt: "desc" },
      include: { closings: { orderBy: { recordedAt: "desc" }, take: 1 } },
    });

    let varianceExpected = 0;
    let shouldCheckVariance = false;

    if (lastSession && lastSession.closings.length > 0) {
      const lastClosing = lastSession.closings[0];
      let expectedVolume = lastClosing.closingLiters;

      // Add waybill deliveries that occurred after the last closing
      const deliveries = await prisma.waybillDipping.findMany({
        where: {
          tankId: body.tankId,
          createdAt: { gt: lastClosing.recordedAt },
        },
      });

      for (const d of deliveries) {
        if (d.afterLiters && d.beforeLiters) {
          expectedVolume = expectedVolume.plus(d.afterLiters.minus(d.beforeLiters));
        }
      }

      varianceExpected = expectedVolume.toNumber();
      shouldCheckVariance = true;
    }

    // Check if unresolved variance tickets block this operation
    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    const settings = (tenant?.settingsJson as Record<string, unknown>) || {};
    const blockOnVariance = settings.blockOnUnresolvedVariance === true;

    if (blockOnVariance) {
      const unresolvedVariance = await prisma.ticket.findFirst({
        where: {
          tenantId: actor.tenantId,
          category: "INVENTORY_VARIANCE",
          status: { in: ["OPEN", "PENDING_APPROVAL"] },
          varianceLog: {
            tankId: body.tankId,
          }
        },
      });
      if (unresolvedVariance) {
        throw new DomainError(400, "unresolved_variance", "Cannot open session: There is an unresolved variance ticket for this tank.");
      }
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

      // Check if session with client ID already exists
      let existingSession = null;
      if (body.clientId) {
        existingSession = await tx.dippingSession.findUnique({
          where: { id: body.clientId },
        });
      }

      if (existingSession) {
        return existingSession;
      }

      // Create session
      const newSession = await tx.dippingSession.create({
        data: {
          id: body.clientId || undefined,
          tenantId: actor.tenantId,
          stationId,
          tankId: body.tankId,
          openingLiters: body.openingLiters,
          pricePerLiter: body.pricePerLiter,
          status: "OPEN",
        },
      });

      if (shouldCheckVariance) {
        await checkAndCreateVarianceTicket({
          tenantId: actor.tenantId,
          stationId,
          raisedById: actor.userId,
          varianceType: "TANK_DIPPING",
          expectedVolume: varianceExpected,
          actualVolume: body.openingLiters,
          tankId: body.tankId,
          referenceNumber: tank.name, // Use tank name for reference
          tx,
        });
      }

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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_READ.key, "STATION");

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

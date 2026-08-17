import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CloseSessionSchema = z.object({
  id: z.string().optional(), // Client-generated ID
  closingLiters: z.coerce.number().nonnegative(),
  reason: z.enum(["END_OF_DAY", "PRICE_CHANGE", "ROUTINE"]),
  newPricePerLiter: z.coerce.number().positive().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string, sessionId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, sessionId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key, "STATION");
    const body = CloseSessionSchema.parse(await request.json());
    const meta = requestMeta(request);

    let session = await prisma.dippingSession.findUnique({
      where: { id: sessionId },
      include: { closings: { orderBy: { recordedAt: "desc" } }, tank: true },
    });

    // Removed dangerous fallback: closings must be attached to the exact session ID requested.

    if (!session || session.tenantId !== actor.tenantId || session.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Session not found.");
    }

    if (session.status === "COMPLETED") {
      throw new DomainError(400, "session_completed", "Cannot add closings to a completed session.");
    }

    if (body.reason === "PRICE_CHANGE" && !body.newPricePerLiter) {
      throw new DomainError(400, "missing_price", "A new price per liter is required when reason is PRICE_CHANGE.");
    }

    // Determine applied price: last closing's newPricePerLiter, or session's pricePerLiter
    const appliedPrice = session.closings.length > 0
      ? (session.closings[0].newPricePerLiter ?? session.pricePerLiter)
      : session.pricePerLiter;

    const closingId = body.id || undefined; // If client sends a generated ID, use it

    const closing = await prisma.$transaction(async (tx) => {
      // Create closing
      const newClosing = await tx.dippingClosing.create({
        data: {
          id: closingId,
          sessionId: session.id,
          closingLiters: body.closingLiters,
          reason: body.reason,
          newPricePerLiter: body.newPricePerLiter,
          appliedPrice,
        },
      });

      // Update tank liters
      await tx.tank.update({
        where: { id: session.tankId },
        data: { currentLiters: body.closingLiters },
      });

      // Close the session if reason is END_OF_DAY
      if (body.reason === "END_OF_DAY") {
        await tx.dippingSession.update({
          where: { id: session.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }

      // If price change, add to price controls
      if (body.reason === "PRICE_CHANGE" && body.newPricePerLiter) {
        await tx.priceControl.create({
          data: {
            tenantId: actor.tenantId,
            stationId,
            productType: session.tank.productType,
            pricePerLiter: body.newPricePerLiter,
          },
        });
      }

      return newClosing;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "dipping_session.close",
      tenantId: actor.tenantId,
      targetType: "DippingClosing",
      targetId: closing.id,
      after: { sessionId: session.id, closingLiters: body.closingLiters, reason: body.reason } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ closing });
  } catch (e) {
    return handleError(e);
  }
}



import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { soldLitersForClosingInterval } from "@/lib/dipping/expected-opening";
import { reconcileTankCurrentLiters } from "@/lib/inventory/tank-balance";
import { StockMovementService } from "@/lib/inventory/stock-movement-service";

const CorrectDippingSchema = z.object({
  openingLiters: z.coerce.number().nonnegative(),
  closingLiters: z.coerce.number().nonnegative(),
  pricePerLiter: z.coerce.number().positive(),
  reason: z.string().min(3).max(2000),
});

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; sessionId: string; closingId: string }> },
) {
  try {
    await requireCsrf(request);
    const { id: stationId, sessionId, closingId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key, "STATION");
    const body = CorrectDippingSchema.parse(await request.json());
    const meta = requestMeta(request);

    const session = await prisma.dippingSession.findUnique({
      where: { id: sessionId },
      include: {
        tank: true,
        closings: { orderBy: { recordedAt: "asc" } },
      },
    });

    if (!session || session.tenantId !== actor.tenantId || session.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Session not found.");
    }

    const closingIndex = session.closings.findIndex((c) => c.id === closingId);
    if (closingIndex < 0) {
      throw new DomainError(404, "not_found", "Closing not found.");
    }

    const closing = session.closings[closingIndex];
    const oldOpeningInterval =
      closingIndex === 0
        ? session.openingLiters.toNumber()
        : session.closings[closingIndex - 1].closingLiters.toNumber();
    const oldClosing = closing.closingLiters.toNumber();
    const oldPrice = closing.appliedPrice.toNumber();

    const salesLog = await prisma.salesLog.findFirst({
      where: { dippingClosingId: closing.id, tenantId: actor.tenantId },
      include: { payments: true },
    });

    if (!salesLog) {
      throw new DomainError(
        400,
        "no_sales",
        "No sales report is linked to this dipping.",
      );
    }

    if (salesLog.status === "APPROVED") {
      throw new DomainError(
        400,
        "already_approved",
        "Cannot correct a dipping with an approved sales report.",
      );
    }

    const newLitersSold = soldLitersForClosingInterval(
      body.openingLiters,
      body.closingLiters,
    );

    const result = await prisma.$transaction(async (tx) => {
      if (closingIndex === 0) {
        await tx.dippingSession.update({
          where: { id: session.id },
          data: {
            openingLiters: body.openingLiters,
            openingGapConfirmed: false,
          },
        });
      } else {
        const priorClosing = session.closings[closingIndex - 1];
        await tx.dippingClosing.update({
          where: { id: priorClosing.id },
          data: { closingLiters: body.openingLiters },
        });
      }

      await tx.dippingClosing.update({
        where: { id: closing.id },
        data: {
          closingLiters: body.closingLiters,
          appliedPrice: body.pricePerLiter,
        },
      });

      const sessionMatchesOldPrice =
        Math.abs(session.pricePerLiter.toNumber() - oldPrice) < 0.000_1;
      if (sessionMatchesOldPrice) {
        await tx.dippingSession.update({
          where: { id: session.id },
          data: { pricePerLiter: body.pricePerLiter },
        });
      }

      let updatedSale = null;
      if (salesLog) {
        const expectedAmount = newLitersSold * body.pricePerLiter;
        const approvedPaid = salesLog.payments
          .filter((p) => p.status === "APPROVED")
          .reduce((sum, p) => sum + p.amount.toNumber(), 0);
        const appliedCredit = salesLog.appliedCredit.toNumber();
        const reconciled = approvedPaid + appliedCredit;
        const needsReview = Math.abs(reconciled - expectedAmount) > 1;

        updatedSale = await tx.salesLog.update({
          where: { id: salesLog.id },
          data: {
            litersSold: newLitersSold,
            pricePerLiter: body.pricePerLiter,
            status: needsReview ? "PARTIAL" : salesLog.status,
            reason: needsReview
              ? "Dipping corrected. Review the payments."
              : salesLog.reason,
          },
        });
      }

      const tankDelta = body.closingLiters - oldClosing;
      if (Math.abs(tankDelta) > 0.001) {
        await StockMovementService.recordAdjustment(
          tx as never,
          {
            tenantId: actor.tenantId,
            stationId,
            tankId: session.tankId,
            productType: session.tank.productType,
            quantity: tankDelta,
            referenceId: closing.id,
            notes: `Dipping correction: ${body.reason}`,
            recordedById: actor.userId,
          },
          { applyToTank: false },
        );
      }

      await reconcileTankCurrentLiters(tx as never, session.tankId);

      if (salesLog) {
        await tx.dipCorrection.create({
          data: {
            tenantId: actor.tenantId,
            sessionId: session.id,
            salesLogId: salesLog.id,
            oldOpeningLiters: oldOpeningInterval,
            newOpeningLiters: body.openingLiters,
            oldClosingLiters: oldClosing,
            newClosingLiters: body.closingLiters,
            reason: body.reason,
            correctedById: actor.userId,
          },
        });
      }

      return { updatedSale, litersSold: newLitersSold };
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "dipping_closing.correct",
      tenantId: actor.tenantId,
      targetType: "DippingClosing",
      targetId: closing.id,
      after: {
        sessionId: session.id,
        closingId: closing.id,
        salesLogId: salesLog?.id ?? null,
        oldOpening: oldOpeningInterval,
        newOpening: body.openingLiters,
        oldClosing,
        newClosing: body.closingLiters,
        oldPrice,
        newPrice: body.pricePerLiter,
        litersSold: result.litersSold,
        reason: body.reason,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({
      litersSold: result.litersSold,
      expectedRevenue: result.litersSold * body.pricePerLiter,
      salesLog: result.updatedSale,
    });
  } catch (e) {
    return handleError(e);
  }
}
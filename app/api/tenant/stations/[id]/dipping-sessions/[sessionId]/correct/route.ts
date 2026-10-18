import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { fetchExpectedOpeningBeforeSession } from "@/lib/dipping/session-context";
import { soldLitersForClosingInterval } from "@/lib/dipping/expected-opening";
import { reconcileTankCurrentLiters } from "@/lib/inventory/tank-balance";
import { StockMovementService } from "@/lib/inventory/stock-movement-service";

const CorrectSchema = z.object({
  closingLiters: z.coerce.number().nonnegative(),
  reason: z.string().min(3).max(2000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  try {
    await requireCsrf(request);
    const { id: stationId, sessionId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key, "STATION");
    const body = CorrectSchema.parse(await request.json());
    const meta = requestMeta(request);

    const session = await prisma.dippingSession.findUnique({
      where: { id: sessionId },
      include: {
        tank: true,
        closings: { orderBy: { recordedAt: "desc" }, take: 1 },
      },
    });

    if (!session || session.tenantId !== actor.tenantId || session.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Session not found.");
    }

    const closing = session.closings[0];
    if (!closing) {
      throw new DomainError(400, "no_closing", "This session has no closing dip to correct.");
    }

    const salesLog = await prisma.salesLog.findFirst({
      where: { dippingClosingId: closing.id, tenantId: actor.tenantId },
      include: { payments: true },
    });

    if (!salesLog) {
      throw new DomainError(404, "not_found", "No sales report is linked to this dipping.");
    }

    const expectedOpening = await fetchExpectedOpeningBeforeSession(prisma, session);
    if (expectedOpening == null) {
      throw new DomainError(
        400,
        "no_prior_close",
        "Cannot correct: there is no previous closing to restore as the opening.",
      );
    }

    const oldOpening = session.openingLiters.toNumber();
    const oldClosing = closing.closingLiters.toNumber();
    const newOpening = expectedOpening;
    const newClosing = body.closingLiters;
    const newLitersSold = soldLitersForClosingInterval(newOpening, newClosing);

    const result = await prisma.$transaction(async (tx) => {
      await tx.dippingSession.update({
        where: { id: session.id },
        data: {
          openingLiters: newOpening,
          openingGapConfirmed: false,
        },
      });

      await tx.dippingClosing.update({
        where: { id: closing.id },
        data: { closingLiters: newClosing },
      });

      const price = salesLog.pricePerLiter.toNumber();
      const expectedAmount = newLitersSold * price;
      const approvedPaid = salesLog.payments
        .filter((p) => p.status === "APPROVED")
        .reduce((sum, p) => sum + p.amount.toNumber(), 0);
      const appliedCredit = salesLog.appliedCredit.toNumber();
      const reconciled = approvedPaid + appliedCredit;
      const needsReview = Math.abs(reconciled - expectedAmount) > 1;

      const updatedSale = await tx.salesLog.update({
        where: { id: salesLog.id },
        data: {
          litersSold: newLitersSold,
          status: needsReview ? "PARTIAL" : salesLog.status,
          reason: needsReview ? "Dip corrected. Review the payments." : salesLog.reason,
        },
      });

      const tankDelta = newClosing - oldClosing;
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
            notes: `Dip correction: ${body.reason}`,
            recordedById: actor.userId,
          },
          { applyToTank: false },
        );
      }

      await reconcileTankCurrentLiters(tx as never, session.tankId);

      const correction = await tx.dipCorrection.create({
        data: {
          tenantId: actor.tenantId,
          sessionId: session.id,
          salesLogId: salesLog.id,
          oldOpeningLiters: oldOpening,
          newOpeningLiters: newOpening,
          oldClosingLiters: oldClosing,
          newClosingLiters: newClosing,
          reason: body.reason,
          correctedById: actor.userId,
        },
      });

      return { updatedSale, correction };
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "dipping_session.correct",
      tenantId: actor.tenantId,
      targetType: "DippingSession",
      targetId: session.id,
      after: {
        oldOpening,
        newOpening,
        oldClosing,
        newClosing: body.closingLiters,
        salesLogId: salesLog.id,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({
      salesLog: result.updatedSale,
      correction: result.correction,
      litersSold: newLitersSold,
    });
  } catch (e) {
    return handleError(e);
  }
}

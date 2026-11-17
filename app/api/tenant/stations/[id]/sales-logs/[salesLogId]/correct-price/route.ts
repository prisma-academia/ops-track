import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CorrectPriceSchema = z.object({
  pricePerLiter: z.coerce.number().positive(),
  reason: z.string().min(3).max(2000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; salesLogId: string }> },
) {
  try {
    await requireCsrf(request);
    const { id: stationId, salesLogId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key, "STATION");
    const body = CorrectPriceSchema.parse(await request.json());
    const meta = requestMeta(request);

    const salesLog = await prisma.salesLog.findUnique({
      where: { id: salesLogId },
      include: {
        payments: true,
        dippingClosing: {
          include: { session: true },
        },
      },
    });

    if (!salesLog || salesLog.tenantId !== actor.tenantId || salesLog.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Sales log not found.");
    }

    if (!salesLog.dippingClosingId || !salesLog.dippingClosing) {
      throw new DomainError(
        400,
        "no_dipping",
        "This sales report is not linked to a dipping closing.",
      );
    }

    if (salesLog.status === "APPROVED") {
      throw new DomainError(
        400,
        "already_approved",
        "Cannot correct price on an approved sales report.",
      );
    }

    const oldPrice = salesLog.pricePerLiter.toNumber();
    const newPrice = body.pricePerLiter;
    if (Math.abs(oldPrice - newPrice) < 0.000_1) {
      throw new DomainError(400, "unchanged", "The new price matches the current price.");
    }

    const closing = salesLog.dippingClosing;
    const session = closing.session;
    const litersSold = salesLog.litersSold.toNumber();
    const expectedAmount = litersSold * newPrice;
    const approvedPaid = salesLog.payments
      .filter((p) => p.status === "APPROVED")
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const appliedCredit = salesLog.appliedCredit.toNumber();
    const reconciled = approvedPaid + appliedCredit;
    const needsReview = Math.abs(reconciled - expectedAmount) > 1;

    const sessionPriceMatchesOld =
      session.pricePerLiter.toNumber() === oldPrice;

    const updatedSale = await prisma.$transaction(async (tx) => {
      await tx.salesLog.update({
        where: { id: salesLog.id },
        data: {
          pricePerLiter: newPrice,
          status: needsReview ? "PARTIAL" : salesLog.status,
          reason: needsReview
            ? "Price corrected. Review the payments."
            : salesLog.reason,
        },
      });

      await tx.dippingClosing.update({
        where: { id: closing.id },
        data: { appliedPrice: newPrice },
      });

      if (sessionPriceMatchesOld) {
        await tx.dippingSession.update({
          where: { id: session.id },
          data: { pricePerLiter: newPrice },
        });
      }

      return tx.salesLog.findUnique({ where: { id: salesLog.id } });
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sales_log.correct_price",
      tenantId: actor.tenantId,
      targetType: "SalesLog",
      targetId: salesLog.id,
      after: {
        salesLogId: salesLog.id,
        dippingClosingId: closing.id,
        oldPrice,
        newPrice,
        sessionPriceUpdated: sessionPriceMatchesOld,
        reason: body.reason,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({
      salesLog: updatedSale,
      pricePerLiter: newPrice,
      expectedAmount,
      needsReview,
    });
  } catch (e) {
    return handleError(e);
  }
}
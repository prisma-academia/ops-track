import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { sendPushNotification } from "@/lib/notifications";
import { rollupSalesLogStatus, salesPaymentInclude } from "@/lib/sales/payments";

const PatchPaymentSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]).optional(),
  reason: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; salesLogId: string; paymentId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, salesLogId, paymentId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_WRITE.key, "STATION");
    const body = PatchPaymentSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const payment = await prisma.salesPayment.findFirst({
      where: { id: paymentId, salesLogId, tenantId: actor.tenantId },
      include: { salesLog: true },
    });

    if (!payment || payment.salesLog.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Payment not found.");
    }

    if (body.receiptUrl !== undefined && !body.status) {
      const updated = await prisma.salesPayment.update({
        where: { id: paymentId },
        data: { receiptUrl: body.receiptUrl },
        include: salesPaymentInclude,
      });
      if (payment.method === "POS") {
        await prisma.salesLog.update({
          where: { id: salesLogId },
          data: { posReceiptUrl: body.receiptUrl },
        });
      } else {
        await prisma.salesLog.update({
          where: { id: salesLogId },
          data: { transferReceiptUrl: body.receiptUrl },
        });
      }
      return ok({ payment: updated });
    }

    if (!body.status) {
      throw new DomainError(400, "invalid_input", "A review status or receipt URL is required.");
    }

    const reviewStatus = body.status;

    if (reviewStatus === "REJECTED" && !body.reason?.trim()) {
      throw new DomainError(400, "reason_required", "A reason is required when rejecting a payment.");
    }

    const methodLabel = payment.method === "POS" ? "POS" : "Transfer";

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const updated = await tx.salesPayment.update({
        where: { id: paymentId },
        data: {
          status: reviewStatus,
          reason: body.reason || null,
        },
        include: salesPaymentInclude,
      });

      await tx.salesPaymentReview.create({
        data: {
          tenantId: actor.tenantId,
          paymentId,
          status: reviewStatus,
          reason: body.reason || null,
          reviewedById: actor.userId,
        },
      });

      const allPayments = await tx.salesPayment.findMany({ where: { salesLogId } });
      const rollup = rollupSalesLogStatus(allPayments);

      await tx.salesLog.update({
        where: { id: salesLogId },
        data: {
          status: rollup,
          reason: reviewStatus === "REJECTED" ? body.reason || null : payment.salesLog.reason,
          approvedById: actor.userId,
          approvedAt: new Date(),
        },
      });

      return updated;
    });

    const salesLog = await prisma.salesLog.findUnique({
      where: { id: salesLogId },
      include: {
        recordedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            expoPushTokens: true,
          },
        },
        payments: { include: salesPaymentInclude },
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sales.review",
      tenantId: actor.tenantId,
      targetType: "SalesPayment",
      targetId: paymentId,
      after: {
        status: reviewStatus,
        method: payment.method,
        reason: body.reason,
        salesLogId,
        rollupStatus: salesLog?.status,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (reviewStatus === "REJECTED" && salesLog?.recordedBy?.expoPushTokens?.length) {
      try {
        const formattedDate = new Date(salesLog.logDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const remarks = body.reason ? `: "${body.reason}"` : "";
        await sendPushNotification(
          salesLog.recordedBy.expoPushTokens,
          `${methodLabel} of ₦${Number(payment.amount).toLocaleString("en-NG")} rejected`,
          `Your ${salesLog.productType} ${methodLabel.toLowerCase()} payment of ₦${Number(payment.amount).toLocaleString("en-NG")} for ${formattedDate} was rejected${remarks}.`,
          {
            salesLogId,
            paymentId,
            stationId,
            action: "sales.payment.rejected",
          },
        );
      } catch (err) {
        console.error("Failed to send push notification:", err);
      }
    }

    return ok({
      payment: updatedPayment,
      salesLog,
    });
  } catch (e) {
    return handleError(e);
  }
}

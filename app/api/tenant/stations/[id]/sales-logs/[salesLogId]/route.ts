import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { sendPushNotification } from "@/lib/notifications";
import { rollupSalesLogStatus, salesPaymentInclude } from "@/lib/sales/payments";

const ReviewSalesLogSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().nullable().optional(),
});

/** Legacy whole-sale review: applies the decision to every pending payment on the log. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; salesLogId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, salesLogId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_WRITE.key, "STATION");
    const body = ReviewSalesLogSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const salesLog = await prisma.salesLog.findUnique({
      where: { id: salesLogId },
      include: { payments: true },
    });

    if (!salesLog || salesLog.tenantId !== actor.tenantId || salesLog.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Sales log not found.");
    }

    if (body.status === "REJECTED" && !body.reason?.trim()) {
      throw new DomainError(400, "reason_required", "A reason is required when rejecting a sales report.");
    }

    const pending = salesLog.payments.filter((p) => p.status === "PENDING");
    if (pending.length === 0 && salesLog.payments.length > 0) {
      throw new DomainError(400, "invalid_input", "No pending payments to review. Review each payment method instead.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (pending.length > 0) {
        for (const payment of pending) {
          await tx.salesPayment.update({
            where: { id: payment.id },
            data: { status: body.status, reason: body.reason || null },
          });
          await tx.salesPaymentReview.create({
            data: {
              tenantId: actor.tenantId,
              paymentId: payment.id,
              status: body.status,
              reason: body.reason || null,
              reviewedById: actor.userId,
            },
          });
        }
      }

      const allPayments = await tx.salesPayment.findMany({ where: { salesLogId } });
      const rollup = allPayments.length > 0 ? rollupSalesLogStatus(allPayments) : body.status;

      return tx.salesLog.update({
        where: { id: salesLogId },
        data: {
          status: rollup,
          reason: body.reason || null,
          approvedById: actor.userId,
          approvedAt: new Date(),
        },
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
          approvedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          payments: { include: salesPaymentInclude },
        },
      });
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sales.review",
      tenantId: actor.tenantId,
      targetType: "SalesLog",
      targetId: salesLogId,
      after: {
        status: body.status,
        reason: body.reason,
        approvedById: actor.userId,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (body.status === "REJECTED" && updated.recordedBy?.expoPushTokens?.length) {
      try {
        const formattedDate = new Date(updated.logDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const remarks = updated.reason ? `: "${updated.reason}"` : "";
        await sendPushNotification(
          updated.recordedBy.expoPushTokens,
          "Daily Sales Report Rejected",
          `Your ${updated.productType} sales report for ${formattedDate} was rejected${remarks}.`,
          {
            salesLogId: updated.id,
            stationId: updated.stationId,
            action: "sales.rejected",
          },
        );
      } catch (err) {
        console.error("Failed to send push notification:", err);
      }
    }

    return ok({ salesLog: updated });
  } catch (e) {
    return handleError(e);
  }
}

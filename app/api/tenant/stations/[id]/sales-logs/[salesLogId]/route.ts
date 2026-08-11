import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { sendPushNotification } from "@/lib/notifications";

const ReviewSalesLogSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),

  reason: z.string().nullable().optional(),
});

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

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    // Verify sales log existence and ownership
    const salesLog = await prisma.salesLog.findUnique({
      where: { id: salesLogId },
    });

    if (!salesLog || salesLog.tenantId !== actor.tenantId || salesLog.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Sales log not found.");
    }

    if (body.status === "REJECTED" && !body.reason?.trim()) {
      throw new DomainError(400, "reason_required", "A reason is required when rejecting a sales report.");
    }

    const updated = await prisma.salesLog.update({
      where: { id: salesLogId },
      data: {
        status: body.status,

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
      },
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

    if (updated.status === "REJECTED" && updated.recordedBy?.expoPushTokens?.length) {
      try {
        const title = "Daily Sales Report Rejected";
        const formattedDate = new Date(updated.logDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const product = updated.productType;
        const remarks = updated.reason ? `: "${updated.reason}"` : "";
        const notifBody = `Your ${product} sales report for ${formattedDate} was rejected${remarks}.`;
        
        await sendPushNotification(
          updated.recordedBy.expoPushTokens,
          title,
          notifBody,
          {
            salesLogId: updated.id,
            stationId: updated.stationId,
            action: "sales.rejected",
          }
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

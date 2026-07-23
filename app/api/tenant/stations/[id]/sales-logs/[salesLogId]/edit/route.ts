import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const EditSalesLogSchema = z.object({
  amountCash: z.coerce.number().min(0),
  amountPos: z.coerce.number().min(0),
  amountTransfer: z.coerce.number().min(0),
  cashReceiptUrl: z.string().nullable().optional(),
  posReceiptUrl: z.string().nullable().optional(),
  transferReceiptUrl: z.string().nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; salesLogId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, salesLogId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_WRITE.key); // Same permission as sales write
    const body = EditSalesLogSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    if (body.amountCash <= 0 && body.amountPos <= 0 && body.amountTransfer <= 0) {
      throw new DomainError(400, "invalid_input", "At least one revenue amount must be greater than zero.");
    }

    const salesLog = await prisma.salesLog.findUnique({
      where: { id: salesLogId },
    });

    if (!salesLog || salesLog.tenantId !== actor.tenantId || salesLog.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Sales log not found.");
    }

    if (salesLog.status === "APPROVED") {
      throw new DomainError(400, "already_approved", "Cannot edit an approved sales report.");
    }

    const updated = await prisma.salesLog.update({
      where: { id: salesLogId },
      data: {
        amountCash: body.amountCash,
        amountPos: body.amountPos,
        amountTransfer: body.amountTransfer,
        cashReceiptUrl: body.cashReceiptUrl,
        posReceiptUrl: body.posReceiptUrl,
        transferReceiptUrl: body.transferReceiptUrl,
        status: "PENDING", // Resubmit for review
        flaggedAmount: false,
        flaggedLiters: false,
        flaggedReceipt: false,
        reason: null,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sales.edit",
      tenantId: actor.tenantId,
      targetType: "SalesLog",
      targetId: salesLogId,
      after: {
        amountCash: body.amountCash,
        amountPos: body.amountPos,
        amountTransfer: body.amountTransfer,
        status: "PENDING",
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ salesLog: updated });
  } catch (e) {
    return handleError(e);
  }
}

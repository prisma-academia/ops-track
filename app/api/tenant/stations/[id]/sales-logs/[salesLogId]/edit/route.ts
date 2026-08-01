import { requireCsrf } from "@/lib/api/csrf-guard";
import { DomainError, handleError } from "@/lib/api/errors";
import { ok } from "@/lib/api/respond";
import { audit, requestMeta } from "@/lib/auth/audit";
import { PERMISSIONS, requireTenantActor } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const EditSalesLogSchema = z.object({
  amountPos: z.coerce.number().min(0),
  amountTransfer: z.coerce.number().min(0),
  posBankAccountId: z.string().nullable().optional(),
  transferBankAccountId: z.string().nullable().optional(),
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

    if (body.amountPos <= 0 && body.amountTransfer <= 0) {
      throw new DomainError(400, "invalid_input", "At least one revenue amount must be greater than zero.");
    }

    if (body.amountPos > 0 && !body.posBankAccountId) {
      throw new DomainError(400, "invalid_input", "POS bank account is required for POS payments.");
    }

    if (body.amountTransfer > 0 && !body.transferBankAccountId) {
      throw new DomainError(400, "invalid_input", "Transfer bank account is required for bank transfer payments.");
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
        amountPos: body.amountPos,
        amountTransfer: body.amountTransfer,
        posBankAccountId: body.posBankAccountId || null,
        transferBankAccountId: body.transferBankAccountId || null,
        posReceiptUrl: body.posReceiptUrl,
        transferReceiptUrl: body.transferReceiptUrl,
        status: "PENDING", // Resubmit for review

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
      after: { amountPos: updated.amountPos, amountTransfer: updated.amountTransfer } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ salesLog: updated });
  } catch (e) {
    return handleError(e);
  }
}

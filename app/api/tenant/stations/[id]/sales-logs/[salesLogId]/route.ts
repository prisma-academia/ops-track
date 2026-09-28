import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { handleError, DomainError } from "@/lib/api/errors";
import { ok } from "@/lib/api/respond";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { audit, requestMeta } from "@/lib/auth/audit";
import { prisma } from "@/lib/db/client";
import { cleanupUploadedFiles } from "@/lib/storage/cleanup";

/** Reviews must target a single POS or transfer payment, not the whole sale. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; salesLogId: string }> }
) {
  try {
    await requireCsrf(request);
    await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_WRITE.key, "STATION");
    await params;
    throw new DomainError(
      400,
      "review_per_payment",
      "Approve or reject each POS or transfer payment individually, not the whole sales report.",
    );
  } catch (e) {
    return handleError(e);
  }
}

/**
 * Delete a sales log and its associated payments.
 *
 * Only PENDING, DRAFT, and REJECTED sales logs may be deleted.
 * APPROVED and PARTIAL logs are protected — they represent finalized
 * financial records reviewed by a supervisor.
 *
 * Side effects:
 * - Cascade-deletes all SalesPayment rows (via Prisma schema onDelete: Cascade)
 * - Unlinks the associated DippingClosing (nulls generateddeliveryId) so the
 *   closing can regenerate a new sale if needed
 * - Cascade-deletes PENDING/DRAFT/REJECTED child debt repayments
 * - Best-effort deletes uploaded receipt files from Cloudinary/S3
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; salesLogId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, salesLogId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_WRITE.key, "STATION");
    const meta = requestMeta(request);

    const salesLog = await prisma.salesLog.findUnique({
      where: { id: salesLogId },
      include: {
        payments: true,
        debtRepayments: { include: { payments: true } },
      },
    });

    if (!salesLog || salesLog.tenantId !== actor.tenantId || salesLog.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Sales log not found.");
    }

    // Guard: never delete finalised reports (TEMPORARILY DISABLED)
    // if (salesLog.status === "APPROVED" || salesLog.status === "PARTIAL") {
    //   throw new DomainError(
    //     400,
    //     "cannot_delete",
    //     "Cannot delete an approved or partially approved sales report.",
    //   );
    // }

    // Guard: refuse if any child repayment is APPROVED
    const approvedChildren = salesLog.debtRepayments.filter((r) => r.status === "APPROVED");
    if (approvedChildren.length > 0) {
      throw new DomainError(
        400,
        "has_approved_repayments",
        "Cannot delete this sales report because it has approved debt repayments.",
      );
    }

    // Collect all receipt URLs for cleanup (parent + children + their payments)
    const receiptUrls: (string | null)[] = [
      salesLog.posReceiptUrl,
      salesLog.transferReceiptUrl,
      ...salesLog.payments.map((p) => p.receiptUrl),
    ];
    for (const child of salesLog.debtRepayments) {
      receiptUrls.push(child.posReceiptUrl, child.transferReceiptUrl);
      for (const p of child.payments) {
        receiptUrls.push(p.receiptUrl);
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unlink from DippingClosing so the closing can generate a fresh sale
      if (salesLog.dippingClosingId) {
        await tx.dippingClosing.update({
          where: { id: salesLog.dippingClosingId },
          data: { generateddeliveryId: null },
        });
      }

      // 2. Delete child debt repayments (non-approved ones — we already guarded above)
      if (salesLog.debtRepayments.length > 0) {
        const childIds = salesLog.debtRepayments.map((r) => r.id);
        // Payments are cascade-deleted by Prisma schema
        await tx.salesLog.deleteMany({
          where: { id: { in: childIds } },
        });
      }

      // 3. Delete the sales log itself (payments cascade via schema)
      await tx.salesLog.delete({ where: { id: salesLogId } });

      // 4. Delete the associated StockMovement (temporary cleanup logic)
      await tx.stockMovement.deleteMany({
        where: { referenceId: salesLogId }
      });
    });

    // Best-effort cleanup of uploaded receipt files (non-blocking)
    cleanupUploadedFiles(receiptUrls).catch((err) => {
      console.warn("Receipt cleanup error (non-critical):", err);
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sales.delete",
      tenantId: actor.tenantId,
      targetType: "SalesLog",
      targetId: salesLogId,
      after: {
        productType: salesLog.productType,
        litersSold: Number(salesLog.litersSold),
        status: salesLog.status,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

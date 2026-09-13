import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { isStationLedgerTransaction } from "@/lib/finance/fleet-ledger";

const MetadataSchema = z.object({
  description: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
});

// ────────────────────────────────────────────
// PATCH  – update metadata-only fields
// ────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key,
      "FLEET",
    );
    const body = MetadataSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.transaction.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing || isStationLedgerTransaction(existing)) {
      throw new DomainError(404, "not_found", "Payment not found.");
    }

    const before = {
      description: existing.description,
      receiptUrl: existing.receiptUrl,
    };

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.receiptUrl !== undefined
          ? { receiptUrl: body.receiptUrl }
          : {}),
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "payment.metadata.update",
      tenantId: actor.tenantId,
      targetType: "Transaction",
      targetId: id,
      before: before as object,
      after: {
        description: updated.description,
        receiptUrl: updated.receiptUrl,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transaction: updated });
  } catch (e) {
    return handleError(e);
  }
}

// ────────────────────────────────────────────
// DELETE – hard-delete with financial reversal
// ────────────────────────────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key,
      "FLEET",
    );
    const meta = requestMeta(request);

    const transaction = await prisma.transaction.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        delivery: true,
        customer: true,
        transport: true,
      },
    });

    if (!transaction || isStationLedgerTransaction(transaction)) {
      throw new DomainError(404, "not_found", "Payment not found.");
    }

    const amount = Number(transaction.amount);

    await prisma.$transaction(async (tx) => {
      // ── INFLOW reversals ──────────────────────────────────
      if (transaction.type === "INFLOW") {
        // 1. If the payment method was DEPOSIT, the customer's depositBalance
        //    was *decremented* on creation → restore it.
        if (transaction.paymentMethod === "DEPOSIT" && transaction.customerId) {
          await tx.customer.update({
            where: { id: transaction.customerId },
            data: { depositBalance: { increment: amount } },
          });
        }

        // 2. If this was an ADVANCE_DEPOSIT with no deliveryId, the customer's
        //    depositBalance was *incremented* on creation → reverse it.
        if (
          transaction.paymentType === "ADVANCE_DEPOSIT" &&
          !transaction.deliveryId &&
          transaction.paymentMethod !== "DEPOSIT" &&
          transaction.customerId
        ) {
          // Guard: check the customer still has enough balance
          const customer = await tx.customer.findUnique({
            where: { id: transaction.customerId },
          });
          if (customer && Number(customer.depositBalance) < amount) {
            throw new DomainError(
              400,
              "deposit_spent",
              "Cannot delete — deposit funds have already been applied to deliveries. " +
                `Current balance: ₦${Number(customer.depositBalance).toLocaleString()}, ` +
                `payment amount: ₦${amount.toLocaleString()}.`,
            );
          }
          await tx.customer.update({
            where: { id: transaction.customerId },
            data: { depositBalance: { decrement: amount } },
          });
        }

        // 3. If linked to a delivery, reverse paymentReceived and recalculate status.
        if (transaction.deliveryId && transaction.delivery) {
          // Get the *current* delivery state (not the stale include)
          const currentDelivery = await tx.delivery.findUnique({
            where: { id: transaction.deliveryId },
          });
          if (currentDelivery) {
            const newPaymentReceived = Math.max(
              0,
              Number(currentDelivery.paymentReceived) - amount,
            );
            const transportFee =
              currentDelivery.transportCostBorneBy === "CLIENT"
                ? Number(currentDelivery.transportCost || 0)
                : 0;
            const totalSaleAmount =
              Number(currentDelivery.totalExpectedAmount) + transportFee;

            let status: "UNPAID" | "PART_PAID" | "CLEARED";
            if (newPaymentReceived >= totalSaleAmount) {
              status = "CLEARED";
            } else if (newPaymentReceived > 0) {
              status = "PART_PAID";
            } else {
              status = "UNPAID";
            }

            await tx.delivery.update({
              where: { id: transaction.deliveryId },
              data: {
                paymentReceived: newPaymentReceived,
                status,
              },
            });
          }
        }
      }

      // ── OUTFLOW reversals ─────────────────────────────────
      if (transaction.type === "OUTFLOW") {
        // Transport payment: decrement netTransportFeePaid
        if (
          transaction.category === "TRANSPORT_PAYMENT" &&
          transaction.transportId
        ) {
          const currentTransport = await tx.transport.findUnique({
            where: { id: transaction.transportId },
          });
          if (currentTransport) {
            await tx.transport.update({
              where: { id: transaction.transportId },
              data: {
                netTransportFeePaid: Math.max(
                  0,
                  Number(currentTransport.netTransportFeePaid) - amount,
                ),
              },
            });
          }
        }
        // EXPENSE: no linked aggregates to reverse.
      }

      // ── Delete the transaction ────────────────────────────
      await tx.transaction.delete({ where: { id } });
    });

    // Audit with full before snapshot
    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "payment.delete",
      tenantId: actor.tenantId,
      targetType: "Transaction",
      targetId: id,
      before: {
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount.toString(),
        paymentType: transaction.paymentType,
        paymentMethod: transaction.paymentMethod,
        deliveryId: transaction.deliveryId,
        transportId: transaction.transportId,
        customerId: transaction.customerId,
        reference: transaction.reference,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}

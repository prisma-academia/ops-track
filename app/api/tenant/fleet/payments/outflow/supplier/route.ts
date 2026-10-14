import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { assertOptionalBankAccount } from "@/lib/bank-accounts/assert-usable";
import {
  orderPaymentStatusFromPaid,
  orderTotalPayable,
} from "@/lib/fleet/order-payables";
import { normalizeSupplierName } from "@/lib/fleet/suppliers";

const OutflowSupplierSchema = z.object({
  supplierId: z.string(),
  orderId: z.string().optional().nullable(),
  amount: z.number().positive(),
  paymentType: z.enum([
    "ADVANCE_DEPOSIT",
    "PART_PAYMENT",
    "FULL_SETTLEMENT",
    "DEBT_CLEARANCE",
  ]),
  paymentMethod: z.enum(["CASH", "POS", "BANK_TRANSFER", "CHEQUE", "DEPOSIT"]),
  reference: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  bankAccountId: z.string().optional(),
});

function orderMatchesSupplier(
  order: {
    supplierId: string | null;
    supplier: string | null;
  },
  supplier: { id: string; name: string },
) {
  if (order.supplierId && order.supplierId !== supplier.id) return false;
  if (
    !order.supplierId &&
    order.supplier &&
    normalizeSupplierName(order.supplier) !== supplier.name
  ) {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key,
      "FLEET",
    );
    const body = OutflowSupplierSchema.parse(await request.json());
    const meta = requestMeta(request);

    if (
      body.paymentMethod !== "CASH" &&
      body.paymentMethod !== "DEPOSIT" &&
      !body.bankAccountId
    ) {
      throw new DomainError(
        400,
        "invalid_input",
        "Bank account is required for this payment method.",
      );
    }
    await assertOptionalBankAccount({
      accountId: body.bankAccountId,
      tenantId: actor.tenantId,
      context: "FLEET",
    });

    const transaction = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: body.supplierId, tenantId: actor.tenantId },
      });
      if (!supplier) {
        throw new DomainError(404, "not_found", "Supplier not found.");
      }

      const orderId = body.orderId ?? null;
      const order = orderId
        ? await tx.order.findFirst({
            where: { id: orderId, tenantId: actor.tenantId },
          })
        : null;

      if (order && !orderMatchesSupplier(order, supplier)) {
        throw new DomainError(
          400,
          "invalid_input",
          "Order does not belong to this supplier.",
        );
      }

      if (body.paymentMethod === "DEPOSIT") {
        if (Number(supplier.depositBalance) < body.amount) {
          throw new DomainError(
            400,
            "insufficient_deposit",
            `Insufficient deposit balance. Available: ₦${Number(supplier.depositBalance).toLocaleString()}`,
          );
        }
        await tx.supplier.update({
          where: { id: supplier.id },
          data: { depositBalance: { decrement: body.amount } },
        });
      }

      const trx = await tx.transaction.create({
        data: {
          tenantId: actor.tenantId,
          type: "OUTFLOW",
          category: "SUPPLIER_PAYMENT",
          paymentType: body.paymentType,
          amount: body.amount,
          paymentMethod: body.paymentMethod,
          reference: body.reference,
          receiptUrl: body.receiptUrl,
          description: body.description,
          supplierId: supplier.id,
          orderId: order?.id ?? null,
          bankAccountId: body.bankAccountId,
          paymentPurpose: order
            ? `Supplier payment for order ${order.reference || order.id}`
            : "Supplier advance deposit",
        },
      });

      if (
        body.paymentType === "ADVANCE_DEPOSIT" &&
        !orderId &&
        body.paymentMethod !== "DEPOSIT"
      ) {
        await tx.supplier.update({
          where: { id: supplier.id },
          data: { depositBalance: { increment: body.amount } },
        });
      }

      if (order) {
        const newPaymentPaid = Number(order.paymentPaid) + body.amount;
        const totalPayable = orderTotalPayable(order);
        const paymentStatus = orderPaymentStatusFromPaid(
          totalPayable,
          newPaymentPaid,
        );

        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentPaid: newPaymentPaid,
            paymentStatus,
            supplierId: order.supplierId ?? supplier.id,
          },
        });
      }

      return trx;
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "payment.supplier.outflow.create",
      tenantId: actor.tenantId,
      targetType: "Transaction",
      targetId: transaction.id,
      after: {
        amount: transaction.amount.toString(),
        paymentType: transaction.paymentType,
        supplierId: body.supplierId,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transaction });
  } catch (e) {
    console.error("Supplier outflow error:", e);
    return handleError(e);
  }
}

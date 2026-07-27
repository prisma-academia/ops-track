import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const InflowSchema = z.object({
  customerId: z.string(),
  saleId: z.string().optional().nullable(),
  amount: z.number().positive(),
  paymentType: z.enum(["ADVANCE_DEPOSIT", "PART_PAYMENT", "FULL_SETTLEMENT", "DEBT_CLEARANCE"]),
  paymentMethod: z.enum(["CASH", "POS", "BANK_TRANSFER", "CHEQUE", "DEPOSIT"]),
  reference: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  bankAccountId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = InflowSchema.parse(await request.json());
    const meta = requestMeta(request);

    if (body.paymentMethod !== "CASH" && body.paymentMethod !== "DEPOSIT" && !body.bankAccountId) {
      throw new DomainError(400, "invalid_input", "Bank account is required for this payment method.");
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // If paying with a deposit, deduct from deposit balance first
      if (body.paymentMethod === "DEPOSIT") {
        const customer = await tx.customer.findFirst({
          where: { id: body.customerId, tenantId: actor.tenantId }
        });
        if (!customer) throw new Error("Customer not found.");
        if (Number(customer.depositBalance) < body.amount) {
          throw new Error(`Insufficient deposit balance. Available: ₦${customer.depositBalance.toString()}`);
        }
        await tx.customer.update({
          where: { id: body.customerId },
          data: { depositBalance: { decrement: body.amount } }
        });
      }

      const trx = await tx.transaction.create({
        data: {
          tenantId: actor.tenantId,
          type: "INFLOW",
          category: "CLIENT_PAYMENT",
          paymentType: body.paymentType,
          amount: body.amount,
          paymentMethod: body.paymentMethod,
          reference: body.reference,
          receiptUrl: body.receiptUrl,
          saleId: body.saleId,
          customerId: body.customerId,
          bankAccountId: body.bankAccountId,
        },
      });

      // If advance deposit without a sale, increment the customer's deposit balance
      if (body.paymentType === "ADVANCE_DEPOSIT" && !body.saleId && body.paymentMethod !== "DEPOSIT") {
        await tx.customer.update({
          where: { id: body.customerId },
          data: { depositBalance: { increment: body.amount } }
        });
      }

      if (body.saleId) {
        const sale = await tx.sale.findFirst({ where: { id: body.saleId, tenantId: actor.tenantId } });
        if (sale) {
          const newPaymentReceived = Number(sale.paymentReceived) + body.amount;
          let status = sale.status;
          if (newPaymentReceived >= Number(sale.totalExpectedAmount)) {
            status = "CLEARED";
          } else if (newPaymentReceived > 0) {
            status = "PART_PAID";
          }

          await tx.sale.update({
            where: { id: body.saleId },
            data: {
              paymentReceived: newPaymentReceived,
              status,
            },
          });
        }
      }

      return trx;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "payment.inflow.create",
      tenantId: actor.tenantId,
      targetType: "Transaction",
      targetId: transaction.id,
      after: { amount: transaction.amount.toString(), paymentType: transaction.paymentType } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transaction });
  } catch (e) {
    return handleError(e);
  }
}

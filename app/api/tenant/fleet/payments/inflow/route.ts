import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { assertOptionalBankAccount } from "@/lib/bank-accounts/assert-usable";

const InflowSchema = z.object({
  customerId: z.string(),
  deliveryId: z.string().optional().nullable(),
  saleId: z.string().optional().nullable(),
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
  bankAccountId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key,
      "FLEET",
    );
    const body = InflowSchema.parse(await request.json());
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
      const deliveryId = body.deliveryId ?? body.saleId ?? null;

      const customer = await tx.customer.findFirst({
        where: { id: body.customerId, tenantId: actor.tenantId },
      });

      const station = !customer
        ? await tx.station.findFirst({
            where: { id: body.customerId, tenantId: actor.tenantId },
          })
        : null;

      const delivery = deliveryId
        ? await tx.delivery.findFirst({
            where: { id: deliveryId, tenantId: actor.tenantId },
            include: { station: true, organization: true },
          })
        : null;

      // If paying with a deposit, deduct from deposit balance first
      if (body.paymentMethod === "DEPOSIT") {
        if (!customer)
          throw new Error(
            "Customer not found or cannot use deposit for stations.",
          );
        if (Number(customer.depositBalance) < body.amount) {
          throw new Error(
            `Insufficient deposit balance. Available: ₦${customer.depositBalance.toString()}`,
          );
        }
        await tx.customer.update({
          where: { id: body.customerId },
          data: { depositBalance: { decrement: body.amount } },
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
          deliveryId,
          customerId: customer ? body.customerId : undefined,
          stationId: station?.id ?? delivery?.stationId ?? undefined,
          organizationId:
            delivery?.organizationId ?? station?.organizationId ?? undefined,
          bankAccountId: body.bankAccountId,
        },
      });

      if (
        customer &&
        body.paymentType === "ADVANCE_DEPOSIT" &&
        !deliveryId &&
        body.paymentMethod !== "DEPOSIT"
      ) {
        await tx.customer.update({
          where: { id: body.customerId },
          data: { depositBalance: { increment: body.amount } },
        });
      }

      if (delivery) {
        const newPaymentReceived =
          Number(delivery.paymentReceived) + body.amount;
        const transportFee =
          delivery.transportCostBorneBy === "CLIENT"
            ? Number(delivery.transportCost || 0)
            : 0;
        const totalSaleAmount =
          Number(delivery.totalExpectedAmount) + transportFee;
        let status = delivery.status;
        if (newPaymentReceived >= totalSaleAmount) {
          status = "CLEARED";
        } else if (newPaymentReceived > 0) {
          status = "PART_PAID";
        }

        await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            paymentReceived: newPaymentReceived,
            status,
          },
        });
      }

      return trx;
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "payment.inflow.create",
      tenantId: actor.tenantId,
      targetType: "Transaction",
      targetId: transaction.id,
      after: {
        amount: transaction.amount.toString(),
        paymentType: transaction.paymentType,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transaction });
  } catch (e) {
    console.error("Inflow Error:", e);
    return handleError(e);
  }
}

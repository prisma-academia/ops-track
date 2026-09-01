import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { FinanceService } from "@/lib/finance/finance-service";
import { assertOptionalBankAccount } from "@/lib/bank-accounts/assert-usable";

const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "POS", "BANK_TRANSFER", "CHEQUE", "DEPOSIT"]),
  description: z.string().optional(),
  reference: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  bankAccountId: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_SALES_WRITE.key, "FLEET");
    const body = CreatePaymentSchema.parse(await request.json());
    const meta = requestMeta(request);

    if (body.paymentMethod !== "CASH" && body.paymentMethod !== "DEPOSIT" && !body.bankAccountId) {
      throw new DomainError(400, "invalid_input", "Bank account is required for this payment method.");
    }
    await assertOptionalBankAccount({
      accountId: body.bankAccountId,
      tenantId: actor.tenantId,
      context: "FLEET",
    });

    const Delivery = await prisma.$transaction(async (tx) => {
      const existingSale = await tx.delivery.findFirst({
        where: { id, tenantId: actor.tenantId },
      });

      if (!existingSale) {
        throw new DomainError(404, "not_found", "Delivery not found.");
      }

      // Create the transaction
      await FinanceService.recordWholesalePayment(tx as any, {
        tenantId: actor.tenantId,
        deliveryId: existingSale.id,
        organizationId: existingSale.organizationId,
        customerId: existingSale.customerId,
        stationId: existingSale.stationId,
        amount: body.amount,
        bankAccountId: body.bankAccountId,
        description: body.description || `Payment for Fleet Delivery`,
      });

      // Update the Delivery
      const newPaymentReceived = Number(existingSale.paymentReceived) + body.amount;
      const totalExpected = Number(existingSale.totalExpectedAmount);

      let newStatus = existingSale.status;
      if (newPaymentReceived >= totalExpected && totalExpected > 0) {
        newStatus = "CLEARED";
      } else if (newPaymentReceived > 0) {
        newStatus = "PART_PAID";
      }

      const updatedSale = await tx.delivery.update({
        where: { id },
        data: {
          paymentReceived: newPaymentReceived,
          status: newStatus,
        },
      });

      return updatedSale;
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "Delivery.payment",
      tenantId: actor.tenantId,
      targetType: "Delivery",
      targetId: Delivery.id,
      after: { paymentAdded: body.amount, totalReceived: Delivery.paymentReceived.toString(), newStatus: Delivery.status } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ Delivery });
  } catch (e) {
    return handleError(e);
  }
}

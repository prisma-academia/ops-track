import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  description: z.string().optional(),
  reference: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = CreatePaymentSchema.parse(await request.json());
    const meta = requestMeta(request);

    const sale = await prisma.$transaction(async (tx) => {
      const existingSale = await tx.sale.findFirst({
        where: { id, tenantId: actor.tenantId },
      });

      if (!existingSale) {
        throw new DomainError(404, "not_found", "Sale not found.");
      }

      // Create the transaction
      await tx.transaction.create({
        data: {
          tenantId: actor.tenantId,
          type: "INFLOW",
          category: "CLIENT_PAYMENT",
          paymentType: "PART_PAYMENT", // We can default to PART_PAYMENT and let status dictate clearing
          amount: body.amount,
          paymentMethod: body.paymentMethod,
          description: body.description,
          reference: body.reference,
          saleId: existingSale.id,
          paymentPurpose: `Payment for Fleet Sale`,
        },
      });

      // Update the sale
      const newPaymentReceived = Number(existingSale.paymentReceived) + body.amount;
      const totalExpected = Number(existingSale.totalExpectedAmount);

      let newStatus = existingSale.status;
      if (newPaymentReceived >= totalExpected && totalExpected > 0) {
        newStatus = "CLEARED";
      } else if (newPaymentReceived > 0) {
        newStatus = "PART_PAID";
      }

      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          paymentReceived: newPaymentReceived,
          status: newStatus,
        },
      });

      return updatedSale;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sale.payment",
      tenantId: actor.tenantId,
      targetType: "Sale",
      targetId: sale.id,
      after: { paymentAdded: body.amount, totalReceived: sale.paymentReceived.toString(), newStatus: sale.status } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ sale });
  } catch (e) {
    return handleError(e);
  }
}

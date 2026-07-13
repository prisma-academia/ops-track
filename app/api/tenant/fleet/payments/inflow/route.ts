import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const InflowSchema = z.object({
  customerId: z.string(),
  saleId: z.string().optional().nullable(),
  amount: z.number().positive(),
  paymentType: z.enum(["ADVANCE_DEPOSIT", "PART_PAYMENT", "FULL_SETTLEMENT", "DEBT_CLEARANCE"]),
  paymentMethod: z.string().min(1),
  reference: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = InflowSchema.parse(await request.json());
    const meta = requestMeta(request);

    const transaction = await prisma.$transaction(async (tx) => {
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
        },
      });

      if (body.saleId) {
        const sale = await tx.sale.findUnique({ where: { id: body.saleId, tenantId: actor.tenantId } });
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

import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const TransportFeeSchema = z.object({
  transportId: z.string(),
  transporterId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.string().min(1),
  reference: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = TransportFeeSchema.parse(await request.json());
    const meta = requestMeta(request);

    const transaction = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaction.create({
        data: {
          tenantId: actor.tenantId,
          type: "OUTFLOW",
          category: "TRANSPORT_PAYMENT",
          amount: body.amount,
          paymentMethod: body.paymentMethod,
          reference: body.reference,
          receiptUrl: body.receiptUrl,
          description: body.description,
          transportId: body.transportId,
          transporterId: body.transporterId,
        },
      });

      const transport = await tx.transport.findUnique({
        where: { id: body.transportId, tenantId: actor.tenantId },
      });

      if (transport) {
        await tx.transport.update({
          where: { id: body.transportId },
          data: {
            netTransportFeePaid: Number(transport.netTransportFeePaid) + body.amount,
          },
        });
      }

      return trx;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "payment.transport.create",
      tenantId: actor.tenantId,
      targetType: "Transaction",
      targetId: transaction.id,
      after: { amount: transaction.amount.toString() } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transaction });
  } catch (e) {
    return handleError(e);
  }
}

import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const ExpenseSchema = z.object({
  expenseType: z.enum(["PERSONAL", "FLEET"]),
  amount: z.number().positive(),
  description: z.string().min(1),
  paymentMethod: z.string().min(1),
  reference: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  transporterId: z.string().optional().nullable(),
  truckId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = ExpenseSchema.parse(await request.json());
    const meta = requestMeta(request);

    const transaction = await prisma.transaction.create({
      data: {
        tenantId: actor.tenantId,
        type: "OUTFLOW",
        category: "EXPENSE",
        amount: body.amount,
        description: body.description,
        paymentMethod: body.paymentMethod,
        reference: body.reference,
        receiptUrl: body.receiptUrl,
        transporterId: body.expenseType === "FLEET" ? body.transporterId : null,
        truckId: body.expenseType === "FLEET" ? body.truckId : null,
        orderId: body.expenseType === "FLEET" ? body.orderId : null,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "payment.expense.create",
      tenantId: actor.tenantId,
      targetType: "Transaction",
      targetId: transaction.id,
      after: { amount: transaction.amount.toString(), description: transaction.description } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transaction });
  } catch (e) {
    return handleError(e);
  }
}

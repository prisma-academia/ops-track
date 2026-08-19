import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const ExpenseSchema = z.object({
  expenseType: z.enum(["PERSONAL", "FLEET"]),
  amount: z.number().positive(),
  description: z.string().min(1),
  paymentMethod: z.enum(["CASH", "POS", "BANK_TRANSFER", "CHEQUE", "DEPOSIT"]),
  reference: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  transporterId: z.string().optional().nullable(),
  truckId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  transportId: z.string().optional().nullable(),
  bankAccountId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key, "FLEET");
    const body = ExpenseSchema.parse(await request.json());
    const meta = requestMeta(request);

    if (body.paymentMethod !== "CASH" && body.paymentMethod !== "DEPOSIT" && !body.bankAccountId) {
      throw new DomainError(400, "invalid_input", "Bank account is required for this payment method.");
    }

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
        transportId: body.expenseType === "FLEET" ? body.transportId : null,
        bankAccountId: body.bankAccountId,
      },
    });

    await audit({
      module: "FLEET",
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

import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { FinanceService } from "@/lib/finance/finance-service";
import { assertOptionalBankAccount } from "@/lib/bank-accounts/assert-usable";

const UpdateFleetExpenseSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  bankAccountId: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    await requireCsrf(request);
    const { expenseId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_LEDGER_WRITE.key, "FLEET");
    const body = UpdateFleetExpenseSchema.parse(await request.json());
    const meta = requestMeta(request);

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId, tenantId: actor.tenantId, context: "FLEET" },
    });

    if (!expense) {
      throw new DomainError(404, "not_found", "Fleet Expense not found.");
    }

    await assertOptionalBankAccount({
      accountId: body.bankAccountId,
      tenantId: actor.tenantId,
      context: "FLEET",
    });

    if (expense.status === "APPROVED") {
      throw new DomainError(400, "invalid_state", "Expense is already approved.");
    }

    const updatedExpense = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: body.status,
          bankAccountId: body.bankAccountId,
          ...(body.status === "APPROVED" ? {
            approvedById: actor.userId,
          } : {}),
        },
      });

      if (body.status === "APPROVED") {
        await FinanceService.recordExpensePayment(tx as any, {
          tenantId: actor.tenantId,
          expenseId: updated.id,
          context: updated.context,
          stationId: updated.stationId,
          truckId: updated.truckId,
          amount: updated.amount,
          bankAccountId: body.bankAccountId,
          description: `Fleet Expense Payment: ${updated.description}`,
        });
      }

      return updated;
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "fleet_expense.update",
      tenantId: actor.tenantId,
      targetType: "Expense",
      targetId: expense.id,
      after: { status: updatedExpense.status } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ expense: updatedExpense });
  } catch (e) {
    return handleError(e);
  }
}

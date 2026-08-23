import { DomainError } from "@/lib/api/errors";
import { FinanceService } from "@/lib/finance/finance-service";

export async function applyExpenseStatus(
  db: any,
  params: {
    expenseId: string;
    tenantId: string;
    actorUserId: string;
    status: "APPROVED" | "REJECTED" | "PENDING";
    bankAccountId?: string | null;
  },
) {
  const expense = await db.expense.findUnique({ where: { id: params.expenseId } });
  if (!expense || expense.tenantId !== params.tenantId) {
    throw new DomainError(404, "not_found", "Expense record not found.");
  }

  if (expense.status === "APPROVED" && params.status === "APPROVED") {
    return expense;
  }

  const updated = await db.expense.update({
    where: { id: params.expenseId },
    data: {
      status: params.status,
      bankAccountId: params.bankAccountId !== undefined ? params.bankAccountId : expense.bankAccountId,
      approvedById: params.status === "PENDING" ? null : params.actorUserId,
    },
  });

  if (params.status === "APPROVED") {
    const existingLedger = await db.transaction.findFirst({
      where: { expenseId: updated.id },
    });
    if (!existingLedger) {
      await FinanceService.recordExpensePayment(db, {
        tenantId: params.tenantId,
        expenseId: updated.id,
        context: updated.context,
        stationId: updated.stationId,
        truckId: updated.truckId,
        amount: updated.amount,
        bankAccountId: updated.bankAccountId,
        description: `Expense Payment: ${updated.description}`,
      });
    }
  }

  return updated;
}

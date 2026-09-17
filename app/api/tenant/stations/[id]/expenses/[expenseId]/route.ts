import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { applyExpenseStatus } from "@/lib/finance/expense-approval";

const UpdateExpenseSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  bankAccountId: z.string().nullable().optional(),
  remark: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, expenseId } = await params;
    const actor = await requireTenantActor(undefined, "STATION");
    const body = UpdateExpenseSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId, tenantId: actor.tenantId, stationId },
    });

    if (!expense) {
      throw new DomainError(404, "not_found", "Expense not found.");
    }

    await applyExpenseStatus(prisma, {
      expenseId,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      status: body.status,
      bankAccountId: body.bankAccountId,
    });

    const updatedExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "expense.update",
      tenantId: actor.tenantId,
      targetType: "Expense",
      targetId: expense.id,
      after: { status: updatedExpense?.status } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ expense: updatedExpense });
  } catch (e) {
    return handleError(e);
  }
}

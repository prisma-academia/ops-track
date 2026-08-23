import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { reviewExpense } from "@/lib/tickets/ticket-service";

const ApproveExpenseSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
  remark: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_EXPENSES_WRITE.key, "STATION");
    const body = ApproveExpenseSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Expense record not found.");
    }

    const result = await reviewExpense({
      expenseId: id,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      status: body.status,
      remark: body.remark,
    });

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        approvedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: `expense.${body.status.toLowerCase()}`,
      tenantId: actor.tenantId,
      targetType: "Expense",
      targetId: id,
      after: { status: body.status, approverId: actor.userId } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ expense, ticket: result.ticket ?? null });
  } catch (e) {
    return handleError(e);
  }
}

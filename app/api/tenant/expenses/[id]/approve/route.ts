import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const ApproveExpenseSchema = z.object({
  approved: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_OPERATIONS_WRITE.key);
    const body = ApproveExpenseSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Expense record not found.");
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        approvedById: body.approved ? actor.userId : null,
      },
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
      action: body.approved ? "expense.approve" : "expense.unapprove",
      tenantId: actor.tenantId,
      targetType: "Expense",
      targetId: expense.id,
      after: { approved: body.approved, approverId: actor.userId } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ expense });
  } catch (e) {
    return handleError(e);
  }
}

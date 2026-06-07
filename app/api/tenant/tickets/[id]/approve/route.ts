import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const ApproveTicketSchema = z.object({
  approved: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_TICKETS_APPROVE.key);
    const body = ApproveTicketSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        status: body.approved ? "RESOLVED" : "OPEN",
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
      action: body.approved ? "ticket.approve" : "ticket.reject",
      tenantId: actor.tenantId,
      targetType: "Ticket",
      targetId: id,
      after: { approved: body.approved, approverId: actor.userId } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}

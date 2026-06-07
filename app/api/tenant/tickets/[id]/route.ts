import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateTicketSchema = z.object({
  status: z.enum(["OPEN", "PENDING_APPROVAL", "RESOLVED", "CLOSED"]).optional(),
  remark: z.string().max(500).optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_TICKETS_READ.key);

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        raisedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
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

    if (!ticket || ticket.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }

    return ok(ticket);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_TICKETS_WRITE.key);
    const body = UpdateTicketSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        status: body.status ?? undefined,
        remark: body.remark !== undefined ? body.remark : undefined,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "ticket.update",
      tenantId: actor.tenantId,
      targetType: "Ticket",
      targetId: ticket.id,
      before: { status: existing.status } as object,
      after: { status: ticket.status, remark: ticket.remark } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}

import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { attachSpendToTicket } from "@/lib/tickets/ticket-service";
import { AttachSpendSchema } from "@/lib/tickets/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_TICKETS_WRITE.key, "STATION");
    const body = AttachSpendSchema.parse(await request.json());
    const meta = requestMeta(request);

    const ticket = await attachSpendToTicket({
      parentTicketId: id,
      tenantId: actor.tenantId,
      raisedById: actor.userId,
      origin: "ADMIN",
      spendIntent: body.spendIntent,
      requestedAmount: body.requestedAmount,
      requestedCategory: body.requestedCategory,
      description: body.description,
      evidenceUrls: body.evidenceUrls,
      clientId: body.clientId,
      alreadyPaid: body.alreadyPaid,
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "ticket.attach_spend",
      tenantId: actor.tenantId,
      targetType: "Ticket",
      targetId: ticket.id,
      after: { parentTicketId: id, category: ticket.category } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}

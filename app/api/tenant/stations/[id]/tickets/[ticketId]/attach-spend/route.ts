import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { attachSpendToTicket } from "@/lib/tickets/ticket-service";
import { AttachSpendSchema } from "@/lib/tickets/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; ticketId: string }> },
) {
  try {
    await requireCsrf(request);
    const { id: stationId, ticketId } = await params;
    const actor = await requireTenantActor(undefined, "STATION");
    const body = AttachSpendSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const ticket = await attachSpendToTicket({
      parentTicketId: ticketId,
      tenantId: actor.tenantId,
      raisedById: actor.userId,
      origin: "MOBILE",
      spendIntent: body.spendIntent,
      requestedAmount: body.requestedAmount,
      requestedCategory: body.requestedCategory,
      description: body.description,
      evidenceUrls: body.evidenceUrls,
      clientId: body.clientId,
      alreadyPaid: body.alreadyPaid,
    });

    if (ticket.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "ticket.attach_spend",
      tenantId: actor.tenantId,
      targetType: "Ticket",
      targetId: ticket.id,
      after: { parentTicketId: ticketId, category: ticket.category } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}

import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { TICKET_INCLUDE, withOriginStory } from "@/lib/tickets/ticket-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; ticketId: string }> },
) {
  try {
    const { id: stationId, ticketId } = await params;
    const actor = await requireTenantActor(undefined, "STATION");

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: TICKET_INCLUDE,
    });

    if (!ticket || ticket.tenantId !== actor.tenantId || ticket.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }

    return ok({ ticket: withOriginStory(ticket) });
  } catch (e) {
    return handleError(e);
  }
}

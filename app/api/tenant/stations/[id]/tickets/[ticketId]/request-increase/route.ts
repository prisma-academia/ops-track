import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { requestTicketIncrease } from "@/lib/tickets/ticket-service";
import { RequestIncreaseSchema } from "@/lib/tickets/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; ticketId: string }> },
) {
  try {
    await requireCsrf(request);
    const { id: stationId, ticketId } = await params;
    const actor = await requireTenantActor(undefined, "STATION");
    const body = RequestIncreaseSchema.parse(await request.json());

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const ticket = await requestTicketIncrease({
      ticketId,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      newRequestedAmount: body.newRequestedAmount,
      reason: body.reason,
    });

    if (ticket.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }

    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}

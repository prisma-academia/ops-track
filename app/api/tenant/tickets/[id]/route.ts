import { prisma } from "@/lib/db/client";
import { AuthError, requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { TICKET_INCLUDE, withOriginStory } from "@/lib/tickets/ticket-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(undefined, "STATION");
    if (
      !hasPermission(actor, PERMISSIONS.TENANT_TICKETS_READ.key) &&
      !hasPermission(actor, PERMISSIONS.TENANT_WAYBILLS_READ.key)
    ) {
      throw new AuthError(403, "Forbidden.");
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });

    if (!ticket || ticket.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }

    return ok({ ticket: withOriginStory(ticket) });
  } catch (e) {
    return handleError(e);
  }
}

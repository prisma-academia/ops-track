import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { CATEGORY_TITLES, createStationTicket, TICKET_INCLUDE, withOriginStory } from "@/lib/tickets/ticket-service";
import { CreateTicketBodySchema } from "@/lib/tickets/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(undefined, "STATION");

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const tickets = await prisma.ticket.findMany({
      where: { stationId, tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      include: TICKET_INCLUDE,
    });

    return ok(tickets.map(withOriginStory));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const { id: stationId } = await params;
    const actor = await requireTenantActor(undefined, "STATION");
    const body = CreateTicketBodySchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const ticket = await createStationTicket({
      tenantId: actor.tenantId,
      stationId,
      raisedById: actor.userId,
      origin: "MOBILE",
      category: body.category,
      title: body.title || CATEGORY_TITLES[body.category],
      description: body.description,
      requestedAmount: body.requestedAmount,
      requestedCategory: body.requestedCategory,
      spendIntent: body.spendIntent,
      evidenceUrls: body.evidenceUrls,
      clientId: body.clientId,
      parentTicketId: body.parentTicketId,
      latitude: body.latitude,
      longitude: body.longitude,
      pumpId: body.pumpId,
      nozzleId: body.nozzleId,
      alreadyPaid: body.alreadyPaid,
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "ticket.create",
      tenantId: actor.tenantId,
      targetType: "Ticket",
      targetId: ticket.id,
      after: { category: ticket.category, origin: ticket.origin } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}

import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { AuthError, requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { DomainError, handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { createStationTicket, TICKET_INCLUDE, withOriginStory } from "@/lib/tickets/ticket-service";
import { assertOrgAccess, resolveActiveOrgId } from "@/lib/auth/org-scope";

const CATEGORY_TITLES: Record<string, string> = {
  EQUIPMENT_FAULT: "Equipment fault",
  CASH_DISCREPANCY: "Cash discrepancy",
  EXPENSE_REQUEST: "Spend request",
  OTHER: "Station ticket",
};

const CreateAdminTicketSchema = z.object({
  stationId: z.string().min(1),
  category: z.enum(["EQUIPMENT_FAULT", "CASH_DISCREPANCY", "EXPENSE_REQUEST", "OTHER"]),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1),
  requestedAmount: z.coerce.number().positive().optional(),
  requestedCategory: z.enum(["FUEL_FOR_GEN", "MAINTENANCE", "UTILITIES", "STATIONERY", "OTHER"]).optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(undefined, "STATION");
    if (
      !hasPermission(actor, PERMISSIONS.TENANT_TICKETS_READ.key) &&
      !hasPermission(actor, PERMISSIONS.TENANT_WAYBILLS_READ.key)
    ) {
      throw new AuthError(403, "Forbidden.");
    }
    const url = new URL(request.url);
    const { page, take, skip } = parseOffsetPagination(url.searchParams);
    const origin = url.searchParams.get("origin") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const stationId = url.searchParams.get("stationId") || undefined;

    const activeOrgId = await resolveActiveOrgId(actor);

    const where = {
      tenantId: actor.tenantId,
      ...(origin ? { origin: origin as never } : {}),
      ...(category ? { category: category as never } : {}),
      ...(status ? { status: status as never } : {}),
      ...(stationId ? { stationId } : {}),
      ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
    };

    const [totalCount, rows] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: TICKET_INCLUDE,
      }),
    ]);

    return ok(rows.map(withOriginStory), buildOffsetPageMeta(totalCount, page, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_TICKETS_WRITE.key, "STATION");
    const body = CreateAdminTicketSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: body.stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }
    assertOrgAccess(actor, station.organizationId);

    const ticket = await createStationTicket({
      tenantId: actor.tenantId,
      stationId: body.stationId,
      raisedById: actor.userId,
      origin: "ADMIN",
      category: body.category,
      title: body.title || CATEGORY_TITLES[body.category],
      description: body.description,
      requestedAmount: body.requestedAmount,
      requestedCategory: body.requestedCategory,
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

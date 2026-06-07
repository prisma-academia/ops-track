import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const RaiseTicketSchema = z.object({
  stationId: z.string().min(1),
  category: z.enum(["INVENTORY_VARIANCE", "EQUIPMENT_FAULT", "CASH_DISCREPANCY", "OTHER"]),
  title: z.string().min(2).max(100),
  description: z.string().min(5).max(1000),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_TICKETS_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    
    const stationId = url.searchParams.get("stationId") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const category = url.searchParams.get("category") || undefined;

    const rows = await prisma.ticket.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(stationId ? { stationId } : {}),
        ...(status ? { status: status as any } : {}),
        ...(category ? { category: category as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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

    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_TICKETS_WRITE.key);
    const body = RaiseTicketSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: body.stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: actor.tenantId,
        stationId: body.stationId,
        category: body.category,
        title: body.title,
        description: body.description,
        raisedById: actor.userId,
        status: "OPEN",
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "ticket.raise",
      tenantId: actor.tenantId,
      targetType: "Ticket",
      targetId: ticket.id,
      after: { title: ticket.title, category: ticket.category, stationId: ticket.stationId } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}

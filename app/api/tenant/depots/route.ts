import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import {
  parsePagination,
  buildPageMeta,
  parseOffsetPagination,
  buildOffsetPageMeta,
} from "@/lib/api/pagination";
import { formatDepotRow, normalizeDepotName } from "@/lib/fleet/depots";

const CreateDepotSchema = z.object({
  name: z.string().min(2).max(120),
  country: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  lga: z.string().max(100).optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, depots] = await Promise.all([
        prisma.depot.count({ where: { tenantId: actor.tenantId } }),
        prisma.depot.findMany({
          where: { tenantId: actor.tenantId },
          orderBy: { name: "asc" },
          take,
          skip,
        }),
      ]);
      return ok(depots.map(formatDepotRow), buildOffsetPageMeta(totalCount, page, take));
    }

    const { cursor, take } = parsePagination(url.searchParams);
    const depots = await prisma.depot.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { name: "asc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    return ok(depots.map(formatDepotRow), buildPageMeta(depots, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key, "FLEET");
    const body = CreateDepotSchema.parse(await request.json());
    const meta = requestMeta(request);

    const name = normalizeDepotName(body.name);
    const existing = await prisma.depot.findFirst({
      where: { tenantId: actor.tenantId, name },
    });
    if (existing) {
      throw new DomainError(409, "duplicate", "A depot with this name already exists.");
    }

    const depot = await prisma.depot.create({
      data: {
        tenantId: actor.tenantId,
        name,
        country: body.country || null,
        state: body.state || null,
        lga: body.lga || null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "depot.create",
      tenantId: actor.tenantId,
      targetType: "Depot",
      targetId: depot.id,
      after: { name: depot.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ depot: formatDepotRow(depot) });
  } catch (e) {
    return handleError(e);
  }
}

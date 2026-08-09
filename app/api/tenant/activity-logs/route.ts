import { prisma } from "@/lib/db/client";
import { requireTenantActor, AuthError } from "@/lib/auth/guards";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { resolveActivityLogRows } from "@/lib/activity/resolver";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor();
    if (
      !hasPermission(actor, PERMISSIONS.TENANT_ACTIVITY_READ.key) &&
      !hasPermission(actor, PERMISSIONS.TENANT_FLEET_ACTIVITY_READ.key)
    ) {
      throw new AuthError(403, "Forbidden.");
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const date = url.searchParams.get("date");
    const userId = url.searchParams.get("userId");
    const name = url.searchParams.get("name");
    const moduleFilter = url.searchParams.get("module") as "STATION" | "FLEET" | null;
    const useOffset = url.searchParams.has("page");
    
    let actorIdsToFilter: string[] | undefined;
    if (userId) {
      actorIdsToFilter = [userId];
    } else if (name) {
      const terms = name.trim().split(/\s+/);
      const matchingUsers = await prisma.tenantUser.findMany({
        where: {
          tenantId: actor.tenantId,
          AND: terms.map((term) => ({
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
            ],
          })),
        },
        select: { id: true },
      });
      actorIdsToFilter = matchingUsers.map((u) => u.id);
    }

    const whereClause: any = {
      tenantId: actor.tenantId,
      ...(moduleFilter ? { module: moduleFilter } : {})
    };
    if (action) {
      whereClause.action = { contains: action, mode: "insensitive" };
    }
    if (date) {
      whereClause.createdAt = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`),
      };
    }
    if (actorIdsToFilter) {
      whereClause.actorId = { in: actorIdsToFilter };
    }

    let rows: any[] = [];
    let meta: any = {};

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rawRows] = await Promise.all([
        prisma.activityLog.count({
          where: whereClause,
        }),
        prisma.activityLog.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take,
          skip,
          include: { tenant: { select: { name: true } } },
        }),
      ]);
      rows = rawRows;
      meta = buildOffsetPageMeta(totalCount, page, take);
    } else {
      const { cursor, take } = parsePagination(url.searchParams);
      rows = await prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        include: { tenant: { select: { name: true } } },
      });
      meta = buildPageMeta(rows, take);
    }

    const mappedRows = await resolveActivityLogRows(rows);

    return ok(mappedRows, meta);
  } catch (e) {
    return handleError(e);
  }
}


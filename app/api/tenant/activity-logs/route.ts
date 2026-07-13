import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_ACTIVITY_READ.key);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const date = url.searchParams.get("date");
    const name = url.searchParams.get("name");
    const useOffset = url.searchParams.has("page");
    
    let actorIdsToFilter: string[] | undefined;
    if (name) {
      const matchingUsers = await prisma.tenantUser.findMany({
        where: {
          tenantId: actor.tenantId,
          OR: [
            { firstName: { contains: name, mode: "insensitive" } },
            { lastName: { contains: name, mode: "insensitive" } },
            { email: { contains: name, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      actorIdsToFilter = matchingUsers.map((u) => u.id);
    }

    const whereClause: any = {
      tenantId: actor.tenantId,
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

    // Collect unique actor IDs and target IDs
    const tenantUserIds = Array.from(new Set(rows.filter((r) => r.actorType === "TENANT_USER" && r.actorId).map((r) => r.actorId as string)));
    const stationIds = Array.from(new Set(rows.filter((r) => r.targetType === "Station" && r.targetId).map((r) => r.targetId as string)));

    // Fetch users and stations
    const users = await prisma.tenantUser.findMany({
      where: { id: { in: tenantUserIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const stations = await prisma.station.findMany({
      where: { id: { in: stationIds } },
      select: { id: true, name: true, code: true },
    });
    const stationMap = new Map(stations.map((s) => [s.id, s]));

    const mappedRows = rows.map((r) => {
      // Resolve Actor Display Name
      let actorDisplay = null;
      if (r.actorType === "TENANT_USER" && r.actorId) {
        const u = userMap.get(r.actorId);
        if (u) {
          actorDisplay = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
        }
      } else if (r.actorType === "SYSTEM") {
        actorDisplay = "System Workflow";
      }

      // Resolve Target Display Name
      let targetDisplay = null;
      if (r.targetType === "Station" && r.targetId) {
        const s = stationMap.get(r.targetId);
        if (s) {
          targetDisplay = `Station: ${s.name} (${s.code})`;
        }
      } else if (r.targetType === "TenantUser" && r.targetId) {
        const u = userMap.get(r.targetId);
        if (u) {
          targetDisplay = `User: ${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
        }
      }

      return {
        id: r.id,
        tenantId: r.tenantId,
        actorType: r.actorType,
        actorId: r.actorId,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        ip: r.ip,
        createdAt: r.createdAt.toISOString(),
        tenantDisplay: r.tenant?.name || r.tenantId,
        actorDisplay,
        targetDisplay,
      };
    });

    return ok(mappedRows, meta);
  } catch (e) {
    return handleError(e);
  }
}

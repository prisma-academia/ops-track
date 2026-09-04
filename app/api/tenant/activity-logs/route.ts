import { prisma } from "@/lib/db/client";
import { requireTenantActor, AuthError } from "@/lib/auth/guards";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { resolveActivityLogRows } from "@/lib/activity/resolver";
import { failedActivityWhere } from "@/lib/activity/status";
import { validateStationAccess, buildStationActivityWhere } from "@/lib/station/station-activity";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor();
    const canReadFleet = hasPermission(actor, PERMISSIONS.TENANT_FLEET_ACTIVITY_READ.key);
    const canReadStation = hasPermission(actor, PERMISSIONS.TENANT_STATIONS_READ.key);

    const url = new URL(request.url);
    const stationId = url.searchParams.get("stationId");
    const action = url.searchParams.get("action");
    const date = url.searchParams.get("date");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const userId = url.searchParams.get("userId");
    const name = url.searchParams.get("name");
    const moduleFilter = url.searchParams.get("module") as "STATION" | "FLEET" | null;
    const statusFilter = url.searchParams.get("status") as "SUCCESS" | "FAILED" | null;
    const useOffset = url.searchParams.has("page");

    if (stationId || moduleFilter === "STATION") {
      if (!canReadStation && !canReadFleet) {
        throw new AuthError(403, "Forbidden.");
      }
    } else if (!canReadFleet && !canReadStation) {
      throw new AuthError(403, "Forbidden.");
    }

    if (stationId) {
      await validateStationAccess(actor, stationId);
      const whereClause = await buildStationActivityWhere({
        actor,
        stationIds: [stationId],
        action,
        date,
        from,
        to,
        userId,
        status: statusFilter,
      });

      const baseStationWhere = await buildStationActivityWhere({
        actor,
        stationIds: [stationId],
      });

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      let rows: any[] = [];
      let meta: any = {};

      if (useOffset) {
        const { page, take, skip } = parseOffsetPagination(url.searchParams);
        const [totalCount, rawRows, statsTotal, failedCount, todayCount] = await Promise.all([
          prisma.activityLog.count({ where: whereClause }),
          prisma.activityLog.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            take,
            skip,
            include: { tenant: { select: { name: true } } },
          }),
          prisma.activityLog.count({ where: baseStationWhere }),
          prisma.activityLog.count({
            where: {
              ...baseStationWhere,
              ...failedActivityWhere(),
            },
          }),
          prisma.activityLog.count({
            where: {
              ...baseStationWhere,
              createdAt: { gte: startOfToday },
            },
          }),
        ]);
        rows = rawRows;
        meta = {
          ...buildOffsetPageMeta(totalCount, page, take),
          stats: {
            total: statsTotal,
            success: Math.max(0, statsTotal - failedCount),
            failed: failedCount,
            today: todayCount,
          },
        };
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
    }
    
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

    const andConditions: Record<string, unknown>[] = [
      { tenantId: actor.tenantId },
    ];

    if (moduleFilter) {
      andConditions.push({ module: moduleFilter });
    }

    if (action && action.trim()) {
      andConditions.push({ action: { contains: action.trim(), mode: "insensitive" } });
    }

    if (from || to) {
      andConditions.push({
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      });
    } else if (date) {
      const dayStr = date.split("T")[0];
      andConditions.push({
        createdAt: {
          gte: new Date(`${dayStr}T00:00:00.000Z`),
          lte: new Date(`${dayStr}T23:59:59.999Z`),
        },
      });
    }

    if (actorIdsToFilter && actorIdsToFilter.length > 0) {
      andConditions.push({
        OR: [
          { actorId: { in: actorIdsToFilter } },
          {
            targetType: "TenantUser",
            targetId: { in: actorIdsToFilter },
          },
        ],
      });
    }

    let whereClause: Record<string, unknown>;
    if (statusFilter === "FAILED") {
      whereClause = {
        AND: [...andConditions, failedActivityWhere()],
      };
    } else if (statusFilter === "SUCCESS") {
      whereClause = {
        AND: [...andConditions],
        NOT: failedActivityWhere(),
      };
    } else {
      whereClause = { AND: andConditions };
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const moduleOverviewWhere: Record<string, unknown> = {
      tenantId: actor.tenantId,
      ...(moduleFilter ? { module: moduleFilter } : {}),
    };

    let rows: any[] = [];
    let meta: any = {};

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rawRows, statsTotal, failedCount, todayCount] = await Promise.all([
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
        prisma.activityLog.count({ where: moduleOverviewWhere }),
        prisma.activityLog.count({
          where: {
            ...moduleOverviewWhere,
            ...failedActivityWhere(),
          },
        }),
        prisma.activityLog.count({
          where: {
            ...moduleOverviewWhere,
            createdAt: { gte: startOfToday },
          },
        }),
      ]);
      rows = rawRows;
      meta = {
        ...buildOffsetPageMeta(totalCount, page, take),
        stats: {
          total: statsTotal,
          success: Math.max(0, statsTotal - failedCount),
          failed: failedCount,
          today: todayCount,
        },
      };
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


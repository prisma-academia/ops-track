import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import {
  parsePagination,
  buildPageMeta,
  parseOffsetPagination,
  buildOffsetPageMeta,
} from "@/lib/api/pagination";
import { resolveActivityLogRows } from "@/lib/activity/resolver";
import { failedActivityWhere } from "@/lib/activity/status";
import { buildStationActivityWhere } from "@/lib/station/station-activity";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

/**
 * GET /api/tenant/stations/activity-logs
 *
 * Returns activity logs scoped to the caller's allowed stations.
 * This is the "All Stations" counterpart to the single-station
 * endpoint at /api/tenant/stations/[id]/activity-logs.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_STATIONS_READ.key,
      "STATION"
    );

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const date = url.searchParams.get("date");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const userId = url.searchParams.get("userId");
    const statusFilter = url.searchParams.get("status") as
      | "SUCCESS"
      | "FAILED"
      | null;
    const useOffset = url.searchParams.has("page");

    // Resolve the user's allowed station IDs (same logic as the page)
    const userWithStations = await prisma.tenantUser.findUnique({
      where: { id: actor.userId },
      select: { stations: { select: { id: true } } },
    });

    const activeOrgId = await resolveActiveOrgId(actor);
    let allowedStationIds = userWithStations?.stations?.map((s) => s.id) || [];

    if (allowedStationIds.length === 0) {
      // User has no specific station assignments — fall back to org-scoped stations
      const orgStations = await prisma.station.findMany({
        where: {
          tenantId: actor.tenantId,
          ...(activeOrgId ? { organizationId: activeOrgId } : {}),
        },
        select: { id: true },
      });
      allowedStationIds = orgStations.map((s) => s.id);
    }

    if (allowedStationIds.length === 0) {
      // No stations at all — return empty result
      return ok([], {
        page: 1,
        pageSize: 25,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        stats: { total: 0, success: 0, failed: 0, today: 0 },
      });
    }

    const whereClause = await buildStationActivityWhere({
      actor,
      stationIds: allowedStationIds,
      action,
      date,
      from,
      to,
      userId,
      status: statusFilter,
    });

    const baseStationWhere = await buildStationActivityWhere({
      actor,
      stationIds: allowedStationIds,
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let rows: any[] = [];
    let meta: any = {};

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rawRows, statsTotal, failedCount, todayCount] =
        await Promise.all([
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
  } catch (e) {
    return handleError(e);
  }
}

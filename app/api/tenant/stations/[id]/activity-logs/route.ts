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
import {
  validateStationAccess,
  buildStationActivityWhere,
} from "@/lib/station/station-activity";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_STATIONS_READ.key,
      "STATION"
    );
    const { id: stationId } = await params;

    // Strict access validation: asserts tenant, org, and station assignment
    await validateStationAccess(actor, stationId);

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const date = url.searchParams.get("date");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const userId = url.searchParams.get("userId");
    const statusFilter = url.searchParams.get("status") as "SUCCESS" | "FAILED" | null;
    const useOffset = url.searchParams.has("page");

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
      const [totalCount, rawRows, statsTotal, failedCount, todayCount] =
        await Promise.all([
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

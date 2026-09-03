import { prisma } from "@/lib/db/client";
import { requirePlatformActor } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { resolveActivityLogRows } from "@/lib/activity/resolver";
import { failedActivityWhere } from "@/lib/activity/status";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_READ.key);
    const { id: tenantId } = await params;

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const date = url.searchParams.get("date");
    const userId = url.searchParams.get("userId");
    const moduleFilter = url.searchParams.get("module") as "STATION" | "FLEET" | null;
    const statusFilter = url.searchParams.get("status") as "SUCCESS" | "FAILED" | null;

    const baseWhere: Record<string, unknown> = {
      tenantId,
      ...(moduleFilter ? { module: moduleFilter } : {}),
    };
    if (action) {
      baseWhere.action = { contains: action, mode: "insensitive" };
    }
    if (date) {
      baseWhere.createdAt = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`),
      };
    }
    if (userId) {
      baseWhere.actorId = userId;
    }

    const whereClause: Record<string, unknown> = { ...baseWhere };
    if (statusFilter === "FAILED") {
      whereClause.AND = [failedActivityWhere()];
    } else if (statusFilter === "SUCCESS") {
      whereClause.NOT = failedActivityWhere();
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { page, take, skip } = parseOffsetPagination(url.searchParams);

    const [totalCount, rawRows] = await Promise.all([
      prisma.activityLog.count({ where: whereClause }),
      prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: { tenant: { select: { name: true } } },
      }),
    ]);

    const [statsTotal, failedCount, todayCount] = await Promise.all([
      prisma.activityLog.count({ where: baseWhere }),
      prisma.activityLog.count({ where: { ...baseWhere, ...failedActivityWhere() } }),
      prisma.activityLog.count({ where: { ...baseWhere, createdAt: { gte: startOfToday } } }),
    ]);

    const meta = {
      ...buildOffsetPageMeta(totalCount, page, take),
      stats: {
        total: statsTotal,
        success: statsTotal - failedCount,
        failed: failedCount,
        today: todayCount,
      },
    };

    const mappedRows = await resolveActivityLogRows(rawRows);

    return ok(mappedRows, meta);
  } catch (e) {
    return handleError(e);
  }
}

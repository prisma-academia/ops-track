import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { StationActivityTable } from "./activity-table";
import { resolveActivityLogRows } from "@/lib/activity/resolver";
import { failedActivityWhere } from "@/lib/activity/status";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import {
  validateStationAccess,
  buildStationActivityWhere,
} from "@/lib/station/station-activity";

export const metadata = { title: "Station Activity" };

export default async function StationActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    date?: string;
    from?: string;
    to?: string;
    userId?: string;
    stationId?: string;
    status?: string;
    page?: string;
    take?: string;
  }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key, "STATION");
  const resolvedParams = await searchParams;
  const actionParam = resolvedParams.action;
  const dateParam = resolvedParams.date;
  const fromParam = resolvedParams.from;
  const toParam = resolvedParams.to;
  const userIdParam = resolvedParams.userId;
  const statusParam = resolvedParams.status as "SUCCESS" | "FAILED" | undefined;

  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(resolvedParams.take || "25", 10) || 25));
  const skip = (page - 1) * take;

  const userWithStations = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: {
      stations: { select: { id: true, name: true, code: true } },
    },
  });

  const activeOrgId = await resolveActiveOrgId(actor);
  let allowedStations = userWithStations?.stations || [];
  const hasAssignedStations = allowedStations.length > 0;

  if (!hasAssignedStations) {
    allowedStations = await prisma.station.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(activeOrgId ? { organizationId: activeOrgId } : {}),
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  const jar = await cookies();
  const cookieStationId = jar.get("active-station-id")?.value;
  let activeStationId = resolvedParams.stationId || cookieStationId || "";

  // Verify that activeStationId is valid and allowed
  if (activeStationId && activeStationId !== "all") {
    const isStationAllowed = allowedStations.some((s) => s.id === activeStationId);
    if (!isStationAllowed) {
      activeStationId = hasAssignedStations ? allowedStations[0]?.id || "" : "";
    }
  }

  let targetStationIds: string[] = [];
  if (activeStationId && activeStationId !== "all") {
    targetStationIds = [activeStationId];
  } else {
    targetStationIds = allowedStations.map((s) => s.id);
  }

  if (activeStationId && activeStationId !== "all") {
    await validateStationAccess(actor, activeStationId);
  }

  const whereClause = await buildStationActivityWhere({
    actor,
    stationIds: targetStationIds,
    action: actionParam,
    date: dateParam,
    from: fromParam,
    to: toParam,
    userId: userIdParam,
    status: statusParam,
  });

  const baseStationWhere = await buildStationActivityWhere({
    actor,
    stationIds: targetStationIds,
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalCount, rows, statsTotal, failedCount, todayCount, allTenantUsers] =
    await Promise.all([
      prisma.activityLog.count({ where: whereClause }),
      prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          tenant: { select: { name: true } },
        },
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
      prisma.tenantUser.findMany({
        where: {
          tenantId: actor.tenantId,
          ...(hasAssignedStations
            ? { stations: { some: { id: { in: targetStationIds } } } }
            : {}),
        },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: { firstName: "asc" },
      }),
    ]);

  const availableUsers = allTenantUsers.map((u) => ({
    id: u.id,
    name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
  }));

  const data = await resolveActivityLogRows(rows);
  const totalPages = Math.ceil(totalCount / take);
  const initialMeta = {
    page,
    pageSize: take,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    stats: {
      total: statsTotal,
      success: Math.max(0, statsTotal - failedCount),
      failed: failedCount,
      today: todayCount,
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Station Activity</h1>
        <p className="text-sm text-muted-foreground">
          Real-time audit trail of operations, price controls, dipping sessions, shifts, and station events.
        </p>
      </div>
      <StationActivityTable
        initialData={data}
        initialMeta={initialMeta}
        availableUsers={availableUsers}
        availableStations={allowedStations}
        activeStationId={activeStationId}
        initialFilters={{
          action: actionParam || "",
          date: dateParam || "",
          userId: userIdParam || "",
          stationId: activeStationId || "",
          status: (statusParam as any) || "",
        }}
      />
    </div>
  );
}

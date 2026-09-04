import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { FleetActivityTable } from "./activity-table";
import { resolveActivityLogRows } from "@/lib/activity/resolver";
import { failedActivityWhere } from "@/lib/activity/status";

export default async function TenantActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    date?: string;
    from?: string;
    to?: string;
    userId?: string;
    status?: string;
    page?: string;
    take?: string;
  }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ACTIVITY_READ.key);
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

  const andConditions: Record<string, unknown>[] = [
    { tenantId: actor.tenantId, module: "FLEET" },
  ];

  if (actionParam && actionParam.trim()) {
    andConditions.push({ action: { contains: actionParam.trim(), mode: "insensitive" } });
  }

  if (fromParam || toParam) {
    andConditions.push({
      createdAt: {
        ...(fromParam ? { gte: new Date(fromParam) } : {}),
        ...(toParam ? { lte: new Date(toParam) } : {}),
      },
    });
  } else if (dateParam) {
    const dayStr = dateParam.split("T")[0];
    andConditions.push({
      createdAt: {
        gte: new Date(`${dayStr}T00:00:00.000Z`),
        lte: new Date(`${dayStr}T23:59:59.999Z`),
      },
    });
  }

  if (userIdParam) {
    andConditions.push({
      OR: [
        { actorId: userIdParam },
        { targetType: "TenantUser", targetId: userIdParam },
      ],
    });
  }

  let whereClause: Record<string, unknown>;
  if (statusParam === "FAILED") {
    whereClause = {
      AND: [...andConditions, failedActivityWhere()],
    };
  } else if (statusParam === "SUCCESS") {
    whereClause = {
      AND: [...andConditions],
      NOT: failedActivityWhere(),
    };
  } else {
    whereClause = { AND: andConditions };
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const moduleOverviewWhere = { tenantId: actor.tenantId, module: "FLEET" as const };

  const [totalCount, rows, statsTotal, failedCount, todayCount, allTenantUsers] = await Promise.all([
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
    prisma.tenantUser.findMany({
      where: { tenantId: actor.tenantId },
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
    <div className="space-y-4">
      <PageHeader title="Fleet Activity" />
      <FleetActivityTable
        initialData={data}
        initialMeta={initialMeta}
        availableUsers={availableUsers}
        initialFilters={{
          action: actionParam || "",
          date: dateParam || "",
          userId: userIdParam || "",
          status: (statusParam as any) || "",
        }}
      />
    </div>
  );
}

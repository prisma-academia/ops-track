import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { resolveActivityLogRows } from "@/lib/activity/resolver";
import { failedActivityWhere } from "@/lib/activity/status";
import { ActivityTable } from "./table";

export default async function PlatformActivityPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_ACTIVITY_READ.key);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalCount,
    rawRows,
    failedCount,
    todayCount,
    tenants,
    platformUsers,
    tenantUsers,
  ] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { tenant: { select: { name: true } } },
    }),
    prisma.activityLog.count({ where: failedActivityWhere() }),
    prisma.activityLog.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.tenant.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.platformUser.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.tenantUser.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        tenant: { select: { name: true } },
      },
      take: 200,
      orderBy: { firstName: "asc" },
    }),
  ]);

  const initialData = await resolveActivityLogRows(rawRows);

  const initialMeta = {
    page: 1,
    pageSize: 25,
    totalCount,
    totalPages: Math.ceil(totalCount / 25),
    hasNextPage: totalCount > 25,
    hasPreviousPage: false,
    stats: {
      total: totalCount,
      success: Math.max(0, totalCount - failedCount),
      failed: failedCount,
      today: todayCount,
    },
  };

  const availableUsers = [
    ...platformUsers.map((u) => ({
      id: u.id,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      email: u.email,
      role: "Platform Admin",
    })),
    ...tenantUsers.map((u) => ({
      id: u.id,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      email: u.email,
      role: u.tenant?.name ? `Tenant: ${u.tenant.name}` : "Tenant User",
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="System Activity & Audit Logs" />
      <ActivityTable
        initialData={initialData}
        initialMeta={initialMeta}
        availableTenants={tenants}
        availableUsers={availableUsers}
      />
    </div>
  );
}

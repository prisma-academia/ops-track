import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { FleetActivityTable } from "./activity-table";
import { resolveActivityLogRows } from "@/lib/activity/resolver";

export default async function TenantActivityPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ACTIVITY_READ.key);
  
  const take = 25;
  const skip = 0;

  const [totalCount, rows, failedCount, todayCount] = await Promise.all([
    prisma.activityLog.count({ where: { tenantId: actor.tenantId, module: "FLEET" } }),
    prisma.activityLog.findMany({
      where: { tenantId: actor.tenantId, module: "FLEET" },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        tenant: { select: { name: true } },
      }
    }),
    prisma.activityLog.count({
      where: {
        tenantId: actor.tenantId,
        module: "FLEET",
        OR: [
          { action: { contains: "reject", mode: "insensitive" } },
          { action: { contains: "fail", mode: "insensitive" } },
          { action: { contains: "suspend", mode: "insensitive" } },
          { action: { contains: "denied", mode: "insensitive" } },
          { action: { contains: "error", mode: "insensitive" } },
          { action: { contains: "unauthorized", mode: "insensitive" } },
        ],
      },
    }),
    prisma.activityLog.count({
      where: {
        tenantId: actor.tenantId,
        module: "FLEET",
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  const allTenantUsers = await prisma.tenantUser.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { firstName: "asc" },
  });
  const availableUsers = allTenantUsers.map(u => ({
    id: u.id,
    name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email
  }));

  const data = await resolveActivityLogRows(rows);

  const totalPages = Math.ceil(totalCount / take);
  const initialMeta = {
    page: 1,
    pageSize: take,
    totalCount,
    totalPages,
    hasNextPage: 1 < totalPages,
    hasPreviousPage: false,
    stats: {
      total: totalCount,
      success: totalCount - failedCount,
      failed: failedCount,
      today: todayCount,
    },
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Fleet Activity" />
      <FleetActivityTable initialData={data} initialMeta={initialMeta} availableUsers={availableUsers} />
    </div>
  );
}

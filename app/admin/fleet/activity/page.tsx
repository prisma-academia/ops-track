import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { ActivityTable } from "@/app/(platform)/(dashboard)/activity/table";
import { resolveActivityLogRows } from "@/lib/activity/resolver";

export default async function TenantActivityPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ACTIVITY_READ.key);
  
  const take = 25;
  const skip = 0;

  const [totalCount, rows] = await Promise.all([
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
  };

  return (
    <div>
      <PageHeader title="Fleet Activity" />
      <ActivityTable initialData={data} initialMeta={initialMeta} availableUsers={availableUsers} moduleContext="FLEET" />
    </div>
  );
}

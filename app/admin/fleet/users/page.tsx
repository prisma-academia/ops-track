import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TenantUsersTable } from "./table";

export default async function TenantUsersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_USERS_READ.key);
  
  const take = 25;
  const skip = 0;

  const [totalCount, users] = await Promise.all([
    prisma.tenantUser.count({ where: { tenantId: actor.tenantId, activeModules: { has: "FLEET" } } }),
    prisma.tenantUser.findMany({
      where: { tenantId: actor.tenantId, activeModules: { has: "FLEET" } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isOwner: true,
        status: true,
        lastLoginAt: true,
      },
    }),
  ]);

  const rows = users.map((u) => ({
    ...u,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));

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
      <DataTableToolbar title="Fleet Users" createHref="/admin/fleet/users/new" createLabel="Invite user" />
      <TenantUsersTable initialData={rows} initialMeta={initialMeta} moduleContext="FLEET" />
    </div>
  );
}

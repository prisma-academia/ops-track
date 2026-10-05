import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TenantUsersTable } from "./table";

import { resolveUserRole } from "@/lib/auth/role-resolver";

export default async function TenantUsersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_USERS_READ.key, "FLEET");
  
  const take = 25;
  const skip = 0;

  const [totalCount, users, roleTemplates] = await Promise.all([
    prisma.tenantUser.count({ where: { tenantId: actor.tenantId, activeModules: { has: "FLEET" } } }),
    prisma.tenantUser.findMany({
      where: { tenantId: actor.tenantId, activeModules: { has: "FLEET" } },
      orderBy: { createdAt: "asc" },
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
        fleetPermissions: true,
        stationPermissions: true,
      },
    }),
    prisma.roleTemplate.findMany({
      where: { scope: "TENANT", tenantId: actor.tenantId, module: "FLEET" },
      select: { name: true, permissions: true, module: true },
    }),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    isOwner: u.isOwner,
    status: u.status,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    role: resolveUserRole(u, roleTemplates, "FLEET"),
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
      <DataTableToolbar title="Users" createHref="/admin/users/new" createLabel="Invite user" />
      <TenantUsersTable initialData={rows} initialMeta={initialMeta} moduleContext="FLEET" />
    </div>
  );
}

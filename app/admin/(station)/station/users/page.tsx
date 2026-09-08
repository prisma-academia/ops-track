import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TenantUsersTable } from "@/app/admin/(fleet)/users/table";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

export default async function StationUsersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATION_USERS_READ.key, "STATION");
  const orgId = actor.organizationId ?? (await resolveActiveOrgId(actor));
  const take = 25;
  const skip = 0;
  const where = {
    tenantId: actor.tenantId,
    activeModules: { has: "STATION" as const },
    ...(orgId
      ? {
          OR: [
            { organizationId: orgId },
            { stations: { some: { organizationId: orgId } } },
            { isOwner: true },
            { ownedOrganizations: { some: { id: orgId } } },
          ],
        }
      : {}),
  };

  const [totalCount, users] = await Promise.all([
    prisma.tenantUser.count({ where }),
    prisma.tenantUser.findMany({
      where,
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
      <DataTableToolbar title="Users" createHref="/admin/station/users/new" createLabel="Invite user" />
      <TenantUsersTable
        initialData={rows}
        initialMeta={initialMeta}
        moduleContext="STATION"
        detailBase="/admin/station/users"
      />
    </div>
  );
}

import { prisma } from "@/lib/db/client";
import { cookies } from "next/headers";
import { genericOrgFilter } from "@/lib/auth/org-scope";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TenantUsersTable } from "./table";

export default async function TenantUsersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_USERS_READ.key);
  
  const take = 25;
  const skip = 0;

  const jar = await cookies();
  const activeStationId = jar.get("active-station-id")?.value || "all";

  const whereClause: any = { 
    tenantId: actor.tenantId, 
    activeModules: { has: "STATION" },
    ...genericOrgFilter(actor)
  };

  if (activeStationId !== "all") {
    whereClause.stations = { some: { id: activeStationId } };
  }

  const [totalCount, users] = await Promise.all([
    prisma.tenantUser.count({ where: whereClause }),
    prisma.tenantUser.findMany({
      where: whereClause,
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
      <DataTableToolbar title="Station Users" createHref="/admin/users/new" createLabel="Invite user" />
      <TenantUsersTable initialData={rows} initialMeta={initialMeta} moduleContext="STATION" />
    </div>
  );
}

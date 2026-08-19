import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { OrganizationsTable } from "./table";
import { fleetModuleFilter } from "@/lib/auth/org-scope";

export default async function OrganizationsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_ORGS_READ.key);
  
  const take = 25;
  const skip = 0;

  const whereClause = {
    tenantId: actor.tenantId,
    ...fleetModuleFilter(actor),
  };

  const [totalCount, orgs] = await Promise.all([
    prisma.organization.count({ where: whereClause }),
    prisma.organization.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        _count: {
          select: { stations: true, users: true }
        }
      }
    }),
  ]);

  const rows = orgs.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    outstandingBalance: o.outstandingBalance.toNumber(),
    depositBalance: o.depositBalance.toNumber(),
    stationsCount: o._count.stations,
    usersCount: o._count.users,
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
      <DataTableToolbar 
        title="Organizations" 
        action={
          !actor.organizationId ? (
            <a href="/admin/organizations/new" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              Add Organization
            </a>
          ) : undefined
        }
      />
      <OrganizationsTable initialData={rows} initialMeta={initialMeta} />
    </div>
  );
}

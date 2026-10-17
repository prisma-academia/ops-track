import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { DepotsTable, type DepotRow } from "./table";
import { formatDepotRow } from "@/lib/fleet/depots";

export default async function DepotsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const take = 25;
  const skip = 0;

  const [totalCount, depots] = await Promise.all([
    prisma.depot.count({ where: { tenantId: actor.tenantId } }),
    prisma.depot.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { name: "asc" },
      take,
      skip,
    }),
  ]);

  const rows: DepotRow[] = depots.map((d) => formatDepotRow(d) as DepotRow);
  const totalPages = Math.ceil(totalCount / take);

  return (
    <div>
      <DataTableToolbar
        title="Depots"
        action={
          <Link
            href="/admin/depots/create"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Add Depot
          </Link>
        }
      />
      <DepotsTable
        initialData={rows}
        initialMeta={{
          page: 1,
          pageSize: take,
          totalCount,
          totalPages,
          hasNextPage: 1 < totalPages,
          hasPreviousPage: false,
        }}
      />
    </div>
  );
}

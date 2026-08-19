import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { StationsTable } from "./table";
import { stationIncludeQuery, formatStationRows } from "@/lib/station-format";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

export default async function StationsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key);

  const take = 25;
  const skip = 0;

  const activeOrgId = await resolveActiveOrgId(actor);

  const whereClause: any = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const [totalCount, rawRows] = await Promise.all([
    prisma.station.count({
      where: whereClause,
    }),
    prisma.station.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: stationIncludeQuery,
    }),
  ]);

  const rows = await formatStationRows(rawRows);

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
        title="Stations"
        createHref="/admin/stations/new"
        createLabel="Add Station"
        description="Manage your retail outlet service stations, tanks, and pumps."
      />
      <StationsTable initialData={rows} initialMeta={initialMeta} />
    </div>
  );
}


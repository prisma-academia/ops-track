import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { StationsTable } from "./table";

export default async function StationsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          staff: true,
          tanks: true,
          pumps: true,
          tickets: true,
        },
      },
    },
  });

  const rows = stations.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    region: s.region,
    location: s.location,
    staffCount: s._count.staff,
    tanksCount: s._count.tanks,
    pumpsCount: s._count.pumps,
    ticketsCount: s._count.tickets,
  }));

  return (
    <div>
      <DataTableToolbar
        title="Stations"
        createHref="/admin/stations/new"
        createLabel="Add Station"
        description="Manage your retail outlet service stations, tanks, and pumps."
      />
      <StationsTable data={rows} />
    </div>
  );
}

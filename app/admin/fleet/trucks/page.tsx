import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TrucksTable } from "./table";

export default async function TrucksPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const trucks = await prisma.truck.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      transporter: {
        select: { id: true, name: true },
      },
      _count: {
        select: {
          transports: true,
        },
      },
    },
  });

  const rows = trucks.map((t) => ({
    id: t.id,
    name: t.name,
    transporterName: t.transporter.name,
    capacityLiters: Number(t.capacityLiters),
    status: t.status,
    transportCount: t._count.transports,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div>
      <DataTableToolbar
        title="Trucks"
        createHref="/admin/fleet/trucks/new"
        createLabel="Add Truck"
        description="Manage the fleet of trucks registered in the system."
      />
      <TrucksTable data={rows} />
    </div>
  );
}

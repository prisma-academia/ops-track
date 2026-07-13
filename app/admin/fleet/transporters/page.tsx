import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TransportersTable } from "./table";

export default async function TransportersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const transporters = await prisma.transporter.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          trucks: true,
          drivers: true,
        },
      },
    },
  });

  const rows = transporters.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email || "-",
    phone: t.phone || "-",
    status: t.status,
    truckCount: t._count.trucks,
    driverCount: t._count.drivers,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div>
      <DataTableToolbar
        title="Transporters"
        createHref="/admin/fleet/transporters/new"
        createLabel="Add Transporter"
        description="Manage the transport companies and logistics partners in your fleet network."
      />
      <TransportersTable data={rows} />
    </div>
  );
}

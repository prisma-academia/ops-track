import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { DriversTable } from "./table";

export default async function DriversPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const drivers = await prisma.driver.findMany({
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

  const rows = drivers.map((d) => ({
    id: d.id,
    name: `${d.firstName} ${d.lastName}`,
    transporterName: d.transporter.name,
    phone: d.phone || "-",
    licenseNumber: d.licenseNumber || "-",
    status: d.status,
    transportCount: d._count.transports,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div>
      <DataTableToolbar
        title="Drivers"
        createHref="/admin/fleet/drivers/new"
        createLabel="Add Driver"
        description="Manage the truck drivers registered in the fleet."
      />
      <DriversTable data={rows} />
    </div>
  );
}

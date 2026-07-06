import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TransportsTable } from "./table";

export default async function TransportsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const transports = await prisma.transport.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      transporter: { select: { id: true, name: true } },
      truck: { select: { id: true, name: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
      order: { select: { id: true, reference: true } },
      _count: {
        select: {
          sales: true,
        },
      },
    },
  });

  const rows = transports.map((t) => ({
    id: t.id,
    destination: t.destination,
    transporterName: t.transporter.name,
    truckName: t.truck.name,
    driverName: t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "Unassigned",
    orderReference: t.order?.reference || "-",
    status: t.status,
    transportType: t.transportType,
    salesCount: t._count.sales,
    litersCarried: Number(t.litersCarried),
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div>
      <DataTableToolbar
        title="Transports"
        createHref="/admin/fleet/transports/new"
        createLabel="Add Transport"
        description="Manage active and completed truck dispatch trips."
      />
      <TransportsTable data={rows} />
    </div>
  );
}

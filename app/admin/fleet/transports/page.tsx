import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TransportsTable } from "./table";
import { DateRangeFilter } from "@/components/date-range-filter";

export default async function TransportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { from, to } = await searchParams;

  let dateFilter: any = {};
  if (from || to) {
    dateFilter = {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } : {}),
      }
    };
  }

  const transports = await prisma.transport.findMany({
    where: { 
      tenantId: actor.tenantId,
      ...dateFilter
    },
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
    productType: t.productType || "-",
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
      <TransportsTable data={rows} filterNode={<DateRangeFilter />} />
    </div>
  );
}
